// Unified chat composable: handles both local Ollama ('chat') and PEB cloud ('pro').
// FE picks the endpoint based on `source`. BE chatCore unifies persistence + streaming.

export function useUnifiedChat() {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  const chatStore = useChatStore()
  const { apiFetch } = useApi()
  const { show: showToast } = useToast()

  let abortController = null

  function fallbackMessage(reason) {
    if (reason === 'neurons_threshold') return 'Daily Cloudflare quota reached. Switched to Pro Plan for this turn.'
    if (reason === 'cloudflare_error')  return 'Cloudflare temporarily unavailable. Switched to Pro Plan.'
    if (reason === 'manual_override')   return 'Using Pro Plan (manual override).'
    return 'Switched to Pro Plan for this turn.'
  }

  function endpointFor(source) {
    return source === 'pro' ? '/api/chat/peb' : '/api/chat'
  }

  // Poll the AI Gateway usage log endpoint until the reconciled neurons figure
  // is available (usually within 2-10s of the request finishing).
  // Cloudflare AI Gateway logs index 5–90s after a stream ends (BE retries up
  // to ~5min). We mirror that budget so the message-level neurons figure shows
  // up without forcing the user to reload.
  // Total: 5 + 8 + 15 + 30 + 60 + 60 + 60 = ~4 minutes.
  async function pollUsageLog(logId) {
    const delays = [5000, 8000, 15000, 30000, 60000, 60000, 60000]
    for (const ms of delays) {
      await new Promise(r => setTimeout(r, ms))
      try {
        const data = await apiFetch(`/api/admin/ai-usage/log/${logId}`, { _skipLoader: true })
        if (data?.reconciled && data.neurons != null) {
          chatStore.setNeuronsOnLast(logId, data.neurons)
          return
        }
      } catch { /* keep polling */ }
    }
  }

  /**
   * sendMessage — text-only chat turn.
   *
   * opts: {
   *   content: string,
   *   model: string,             // for 'chat' source; ignored upstream for 'pro'
   *   source: 'chat' | 'pro',
   *   conversationId?: string,
   *   documentIds?: string[],
   *   parentMessageId?: string,  // for edit/branch (reserved for S4.4)
   * }
   */
  async function sendMessage(opts) {
    if (chatStore.isStreaming) return
    const { content, model, source = 'chat', conversationId, documentIds, parentMessageId, agentTemplateId } = opts

    const attachedDocs = [...chatStore.attachedDocuments]
    const readyDocIds = documentIds || attachedDocs.filter(d => d.status === 'ready').map(d => d.document_id)

    chatStore.addMessage({ role: 'user', content, id: Date.now(), attachedDocs })
    chatStore.clearAttachments()
    chatStore.isStreaming = true

    // Build history, including image base64 for vision context retention
    const history = chatStore.messages
      .filter(m => m.role !== 'system' && m.content !== '')
      .map(m => {
        const msg = { role: m.role, content: m.content }
        if (m.imageBase64) msg.images = [m.imageBase64]
        return msg
      })

    chatStore.addMessage({ role: 'assistant', content: '', thinking: '', id: Date.now() + 1 })
    abortController = new AbortController()

    try {
      const body = {
        messages: history,
        conversation_id: conversationId || undefined,
        ...(source === 'chat' && { model }),
        ...(readyDocIds.length && { document_ids: readyDocIds }),
        ...(parentMessageId && { parent_message_id: parentMessageId }),
        ...(agentTemplateId && { agent_template_id: agentTemplateId }),
      }

      const res = await fetch(`${config.public.apiBase}${endpointFor(source)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.getToken()}`,
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      })

      if (!res.ok) {
        if (res.status === 401) { auth.logout(); return }
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}))
          if (body?.code === 'ERR_PERMISSION_DENIED') {
            chatStore.markLastAssistantError('permission', '')
            return
          }
        }
        if (res.status === 422) {
          const body = await res.json().catch(() => ({}))
          if (body?.code === 'ERR_GUARDRAIL_BLOCKED') {
            chatStore.markLastAssistantError('blocked', body.error || 'Yêu cầu không được phép.')
            return
          }
        }
        if (res.status === 429) {
          // CF quota exhausted (rolling 24h). Surface as a dedicated 'quota'
          // state so the bubble can show a countdown + PEB upsell instead of
          // a generic "Connection lost" message.
          const body = await res.json().catch(() => ({}))
          chatStore.markLastAssistantError('quota', JSON.stringify(body || {}))
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }

      return await consumeSSE(res, conversationId)
    } catch (err) {
      if (err.name === 'AbortError') {
        chatStore.markLastAssistantError('cancelled', '')
      } else {
        chatStore.markLastAssistantError('network', err.message)
      }
    } finally {
      chatStore.isStreaming = false
      abortController = null
    }
  }

  /** sendVisionMessage — multipart (image + prompt). */
  async function sendVisionMessage(opts) {
    if (chatStore.isStreaming) return
    const { imageFile, prompt, model, source = 'chat', conversationId, agentTemplateId } = opts

    const imageUrl = URL.createObjectURL(imageFile)
    const imageBase64 = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result.split(',')[1])
      reader.readAsDataURL(imageFile)
    })

    chatStore.addMessage({
      role: 'user',
      content: prompt,
      imageUrl, imageName: imageFile.name, imageBase64,
      id: Date.now(),
    })
    chatStore.isStreaming = true

    const history = chatStore.messages
      .filter(m => m.role !== 'system' && m.content !== '')
      .map(m => {
        const msg = { role: m.role, content: m.content }
        if (m.imageBase64) msg.images = [m.imageBase64]
        return msg
      })

    chatStore.addMessage({ role: 'assistant', content: '', thinking: '', id: Date.now() + 1 })
    abortController = new AbortController()

    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('payload', JSON.stringify({
        messages: history,
        conversation_id: conversationId || undefined,
        ...(source === 'chat' && { model }),
        ...(agentTemplateId && { agent_template_id: agentTemplateId }),
        stream: true,
      }))

      // vision route for local; PEB accepts image at /api/chat/peb directly
      const url = source === 'pro'
        ? `${config.public.apiBase}/api/chat/peb`
        : `${config.public.apiBase}/api/chat/vision`

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.getToken()}` },
        body: formData,
        signal: abortController.signal,
      })

      if (!res.ok) {
        if (res.status === 401) { auth.logout(); return }
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}))
          if (body?.code === 'ERR_PERMISSION_DENIED') {
            chatStore.markLastAssistantError('permission', '')
            return
          }
        }
        if (res.status === 422) {
          const body = await res.json().catch(() => ({}))
          if (body?.code === 'ERR_GUARDRAIL_BLOCKED') {
            chatStore.markLastAssistantError('blocked', body.error || 'Yêu cầu không được phép.')
            return
          }
        }
        if (res.status === 429) {
          // CF quota exhausted (rolling 24h). Surface as a dedicated 'quota'
          // state so the bubble can show a countdown + PEB upsell instead of
          // a generic "Connection lost" message.
          const body = await res.json().catch(() => ({}))
          chatStore.markLastAssistantError('quota', JSON.stringify(body || {}))
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }

      return await consumeSSE(res, conversationId)
    } catch (err) {
      if (err.name === 'AbortError') {
        chatStore.markLastAssistantError('cancelled', '')
      } else {
        chatStore.markLastAssistantError('network', err.message)
      }
    } finally {
      chatStore.isStreaming = false
      abortController = null
    }
  }

  async function consumeSSE(res, conversationId) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let newConvId = conversationId
    let thinkingAccum = ''
    let done = false

    while (!done) {
      const { done: streamDone, value } = await reader.read()
      if (streamDone) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6)
        try {
          const event = JSON.parse(raw)
          if (event.type === 'conversation_id') {
            newConvId = event.conversation_id
            chatStore.activeConversationId = newConvId
          } else if (event.type === 'thinking_delta') {
            thinkingAccum += event.content
            chatStore.setThinkingOnLast(thinkingAccum)
          } else if (event.type === 'thinking') {
            chatStore.setThinkingOnLast(event.content)
          } else if (event.type === 'chunk') {
            chatStore.appendToLastAssistant(event.content)
          } else if (event.type === 'content_replaced' || event.type === 'harmful_output_replaced') {
            // Server post-processed the assistant content (strip thinking,
            // replace harmful output, etc.). Overwrite what we streamed.
            const replacement = event.content ?? event.replacement ?? ''
            if (replacement) chatStore.setContentOnLast(replacement)
          } else if (event.type === 'provider_fallback') {
            // Cloudflare → PEB fallback announced before any tokens flow.
            showToast?.(fallbackMessage(event.reason), 'info', 4000)
            chatStore.setProviderOnLast({ provider: event.provider, fallback_reason: event.reason })
          } else if (event.type === 'usage') {
            chatStore.setUsageOnLast({
              prompt_tokens: event.prompt_tokens,
              completion_tokens: event.completion_tokens,
              log_id: event.log_id,
              provider: event.provider,
              fallback_reason: event.fallback_reason,
              message_id: event.message_id,
            })
            // Fallback could also be signalled here (when decided at stream-open).
            if (event.fallback_reason && event.provider === 'peb') {
              showToast?.(fallbackMessage(event.fallback_reason), 'info', 4000)
            }
            if (event.log_id && event.provider === 'cloudflare') {
              pollUsageLog(event.log_id)
            }
          } else if (event.type === 'done') {
            done = true
            break
          } else if (event.type === 'error') {
            chatStore.markLastAssistantError('upstream', event.error || 'Upstream error')
            done = true
            break
          }
        } catch { /* skip malformed */ }
      }
    }
    // Stream loop exited — flush any chunk still sitting in the rAF buffer so
    // the user never sees a half-written reply because the last chunk arrived
    // microseconds before `done` and didn't get a frame.
    chatStore.flushPendingAppend?.()
    return newConvId
  }

  function cancelStream() {
    abortController?.abort()
  }

  return { sendMessage, sendVisionMessage, cancelStream }
}
