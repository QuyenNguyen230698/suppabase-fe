export function useChat() {
  const config = useRuntimeConfig();
  const auth = useAuthStore();
  const chatStore = useChatStore();

  let abortController = null;

  async function sendMessage(content, model, conversationId = null) {
    if (chatStore.isStreaming) return;

    // Snapshot attached docs before clearing
    const attachedDocs = [...chatStore.attachedDocuments];
    const readyDocIds = attachedDocs
      .filter((d) => d.status === 'ready')
      .map((d) => d.document_id);

    chatStore.addMessage({ role: 'user', content, id: Date.now(), attachedDocs });
    chatStore.clearAttachments();
    chatStore.isStreaming = true;

    // Include imageBase64 in history so follow-up questions retain vision context
    const history = chatStore.messages
      .filter((m) => m.role !== 'system' && m.content !== '')
      .map((m) => {
        const msg = { role: m.role, content: m.content };
        if (m.imageBase64) msg.images = [m.imageBase64];
        return msg;
      });

    chatStore.addMessage({ role: 'assistant', content: '', thinking: '', id: Date.now() + 1 });

    abortController = new AbortController();

    try {
      // Step 1: POST to enqueue job, get job_id back immediately
      const enqRes = await fetch(`${config.public.apiBase}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.getToken()}`,
        },
        body: JSON.stringify({
          model,
          messages: history,
          conversation_id: conversationId,
          ...(readyDocIds.length > 0 && { document_ids: readyDocIds }),
        }),
        signal: abortController.signal,
      });

      if (!enqRes.ok) {
        if (enqRes.status === 401) { auth.logout(); return; }
        const errBody = await enqRes.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${enqRes.status}`);
      }

      const { job_id, queued } = await enqRes.json();

      // Non-streaming response (stream=false) — job_id will be absent
      if (!queued || !job_id) {
        return conversationId;
      }

      // Step 2: Open SSE stream for the queued job
      const streamRes = await fetch(`${config.public.apiBase}/api/chat/stream/${job_id}`, {
        headers: { Authorization: `Bearer ${auth.getToken()}` },
        signal: abortController.signal,
      });

      if (!streamRes.ok) {
        throw new Error(`Stream open failed: HTTP ${streamRes.status}`);
      }

      return await consumeSSE(streamRes, conversationId);
    } catch (err) {
      if (err.name !== 'AbortError') {
        chatStore.appendToLastAssistant(`\n\n[Error: ${err.message}]`);
      }
    } finally {
      chatStore.isStreaming = false;
      abortController = null;
    }
  }

  async function sendVisionMessage(imageFile, prompt, model, conversationId = null) {
    if (chatStore.isStreaming) return;

    const imageUrl = URL.createObjectURL(imageFile);

    // Encode image to base64 for history persistence
    const imageBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(',')[1]); // strip data:...;base64,
      reader.readAsDataURL(imageFile);
    });

    chatStore.addMessage({ role: 'user', content: prompt, imageUrl, imageName: imageFile.name, imageBase64, id: Date.now() });
    chatStore.isStreaming = true;

    const BAD_PATTERNS = [
      'không thể xem hình ảnh',
      'không thể đọc hình ảnh',
      'không thể xem tệp',
      'cannot view image',
      'cannot read image',
      'I cannot see',
      'unable to view image',
    ];

    // Build history with images embedded; strip old bad assistant responses
    const history = chatStore.messages
      .filter((m) => m.role !== 'system' && m.content !== '')
      .filter((m) => {
        if (m.role !== 'assistant') return true;
        const lower = m.content.toLowerCase();
        return !BAD_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
      })
      .map((m) => {
        const msg = { role: m.role, content: m.content };
        if (m.imageBase64) msg.images = [m.imageBase64];
        return msg;
      });

    chatStore.addMessage({ role: 'assistant', content: '', thinking: '', id: Date.now() + 1 });

    abortController = new AbortController();

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      // Send full context as payload so BE can build proper history
      formData.append('payload', JSON.stringify({
        model,
        messages: history,
        conversation_id: conversationId || undefined,
        stream: true,
      }));

      const res = await fetch(`${config.public.apiBase}/api/chat/vision`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.getToken()}` },
        body: formData,
        signal: abortController.signal,
      });

      if (!res.ok) {
        if (res.status === 401) { auth.logout(); return; }
        throw new Error(`HTTP ${res.status}`);
      }

      return await consumeSSE(res, conversationId);
    } catch (err) {
      if (err.name !== 'AbortError') {
        chatStore.appendToLastAssistant(`\n\n[Error: ${err.message}]`);
      }
    } finally {
      chatStore.isStreaming = false;
      abortController = null;
    }
  }

  async function consumeSSE(res, conversationId) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let newConvId = conversationId;
    let done = false;

    while (!done) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6);
        try {
          const event = JSON.parse(raw);
          if (event.type === 'queue_position') {
            const pos = event.position;
            chatStore.setThinkingOnLast(pos > 1
              ? `Đang chờ trong hàng đợi... (vị trí #${pos})`
              : 'Đang xử lý...');
          } else if (event.type === 'conversation_id') {
            newConvId = event.conversation_id;
            chatStore.activeConversationId = newConvId;
          } else if (event.type === 'thinking') {
            chatStore.setThinkingOnLast(event.content);
          } else if (event.type === 'chunk') {
            chatStore.appendToLastAssistant(event.content);
          } else if (event.type === 'content_replaced' || event.type === 'harmful_output_replaced') {
            const replacement = event.content ?? event.replacement ?? '';
            if (replacement) chatStore.setContentOnLast(replacement);
          } else if (event.type === 'done') {
            done = true;
            break;
          } else if (event.type === 'error') {
            chatStore.appendToLastAssistant(`\n\n[Error: ${event.error}]`);
            done = true;
            break;
          }
        } catch {
          // skip malformed
        }
      }
    }

    return newConvId;
  }

  function cancelStream() {
    abortController?.abort();
  }

  return { sendMessage, sendVisionMessage, cancelStream };
}
