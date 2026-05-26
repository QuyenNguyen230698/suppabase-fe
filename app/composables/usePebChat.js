export function usePebChat() {
  const config = useRuntimeConfig();
  const auth = useAuthStore();
  const chatStore = useChatStore();

  let abortController = null;

  async function sendPebMessage(content, conversationId = null) {
    if (chatStore.isStreaming) return;

    chatStore.addMessage({ role: 'user', content, id: Date.now() });
    chatStore.isStreaming = true;

    const history = chatStore.messages
      .filter((m) => m.role !== 'system' && m.content !== '')
      .map((m) => ({ role: m.role, content: m.content }));

    chatStore.addMessage({ role: 'assistant', content: '', thinking: '', id: Date.now() + 1 });
    abortController = new AbortController();

    try {
      const res = await fetch(`${config.public.apiBase}/api/chat/peb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.getToken()}`,
        },
        body: JSON.stringify({ messages: history, conversation_id: conversationId || undefined }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        if (res.status === 401) { auth.logout(); return; }
        throw new Error(`HTTP ${res.status}`);
      }

      return await consumeSSE(res, conversationId);
    } catch (err) {
      if (err.name !== 'AbortError') chatStore.appendToLastAssistant(`\n\n[Error: ${err.message}]`);
    } finally {
      chatStore.isStreaming = false;
      abortController = null;
    }
  }

  async function sendPebVisionMessage(imageFile, prompt, conversationId = null) {
    if (chatStore.isStreaming) return;

    const imageUrl = URL.createObjectURL(imageFile);
    const imageBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(',')[1]);
      reader.readAsDataURL(imageFile);
    });

    chatStore.addMessage({
      role: 'user',
      content: prompt,
      imageUrl,
      imageName: imageFile.name,
      imageBase64,
      id: Date.now(),
    });
    chatStore.isStreaming = true;

    const history = chatStore.messages
      .filter((m) => m.role !== 'system' && m.content !== '')
      .map((m) => ({ role: m.role, content: m.content }));

    chatStore.addMessage({ role: 'assistant', content: '', thinking: '', id: Date.now() + 1 });
    abortController = new AbortController();

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('payload', JSON.stringify({
        messages: history,
        conversation_id: conversationId || undefined,
        stream: true,
      }));

      const res = await fetch(`${config.public.apiBase}/api/chat/peb`, {
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
      if (err.name !== 'AbortError') chatStore.appendToLastAssistant(`\n\n[Error: ${err.message}]`);
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
    let thinkingAccum = '';
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
          if (event.type === 'conversation_id') {
            newConvId = event.conversation_id;
            chatStore.activeConversationId = newConvId;
          } else if (event.type === 'thinking_delta') {
            // Accumulate thinking deltas and update last assistant message
            thinkingAccum += event.content;
            chatStore.setThinkingOnLast(thinkingAccum);
          } else if (event.type === 'thinking') {
            // Full thinking block (non-stream fallback)
            chatStore.setThinkingOnLast(event.content);
          } else if (event.type === 'chunk') {
            chatStore.appendToLastAssistant(event.content);
          } else if (event.type === 'done') {
            done = true;
            break;
          } else if (event.type === 'error') {
            chatStore.appendToLastAssistant(`\n\n[Error: ${event.error}]`);
            done = true;
            break;
          }
        } catch { /* skip malformed */ }
      }
    }

    return newConvId;
  }

  function cancelStream() {
    abortController?.abort();
  }

  return { sendPebMessage, sendPebVisionMessage, cancelStream };
}
