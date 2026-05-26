import { defineStore } from 'pinia';

export const useChatStore = defineStore('chat', () => {
  const conversations = ref([]);
  const activeConversationId = ref(null);
  const messages = ref([]);
  const isStreaming = ref(false);
  const selectedModel = ref('');
  const attachedDocuments = ref([]);

  function setConversations(list) {
    conversations.value = list;
  }

  function setActiveConversation(id, msgs) {
    activeConversationId.value = id;
    // Map DB id → id_persisted so message-level actions (rating) can target it.
    messages.value = (msgs || []).map(m => ({
      ...m,
      id_persisted: m.id,
    }));
  }

  function addMessage(msg) {
    messages.value.push(msg);
  }

  // SSE delivers many small text chunks per second. Mutating `last.content`
  // on every chunk triggers Vue reactivity → ChatMessage re-renders → marked
  // re-parses the WHOLE message + hljs re-highlights every code block. With
  // 10–30 chunks/sec that adds up to noticeable jank.
  //
  // We coalesce chunks into a buffer and flush once per animation frame
  // (~60Hz). Visual loss is negligible because the human eye can't read
  // faster than the flush rate anyway, but the saved parse work is large.
  let _pendingAppend = '';
  let _appendFrame = null;
  function flushAppend() {
    _appendFrame = null;
    if (!_pendingAppend) return;
    const last = messages.value[messages.value.length - 1];
    const chunk = _pendingAppend;
    _pendingAppend = '';
    if (last?.role === 'assistant') {
      last.content = (last.content || '') + chunk;
    } else {
      messages.value.push({ role: 'assistant', content: chunk, id: Date.now() });
    }
  }
  function appendToLastAssistant(content) {
    _pendingAppend += content;
    if (_appendFrame == null && typeof requestAnimationFrame !== 'undefined') {
      _appendFrame = requestAnimationFrame(flushAppend);
    } else if (_appendFrame == null) {
      // SSR / no rAF — just flush synchronously.
      flushAppend();
    }
  }
  // Ensure the final chunk is committed even if it arrives while we're
  // tearing down (caller should invoke this when stream ends to guarantee
  // no trailing buffer is lost).
  function flushPendingAppend() {
    if (_appendFrame != null) {
      cancelAnimationFrame(_appendFrame);
    }
    flushAppend();
  }

  function setThinkingOnLast(thinking) {
    const last = messages.value[messages.value.length - 1];
    if (last?.role === 'assistant') {
      last.thinking = thinking;
    }
  }

  // Server post-processed the assistant content (eg. leading chain-of-thought
  // was stripped, or L6 replaced harmful output). Overwrite what we streamed.
  function setContentOnLast(content) {
    if (_appendFrame != null) {
      cancelAnimationFrame(_appendFrame);
      _appendFrame = null;
      _pendingAppend = '';
    }
    const last = messages.value[messages.value.length - 1];
    if (last?.role === 'assistant') {
      last.content = content;
    }
  }

  // Set image preview on last user message
  function setImageOnLast(imageUrl, imageName) {
    const last = messages.value[messages.value.length - 1];
    if (last?.role === 'user') {
      last.imageUrl = imageUrl;
      last.imageName = imageName;
    }
  }

  // Attach token usage to the last assistant message (from SSE 'usage' event)
  function setUsageOnLast(usage) {
    const last = messages.value[messages.value.length - 1];
    if (last?.role === 'assistant') {
      last.tokens_in  = usage?.prompt_tokens
      last.tokens_out = usage?.completion_tokens
      if (usage?.log_id)          last.log_id = usage.log_id
      if (usage?.provider)        last.provider = usage.provider
      if (usage?.fallback_reason) last.fallback_reason = usage.fallback_reason
      if (usage?.message_id)      last.id_persisted = usage.message_id
    }
  }

  // Mark the last assistant message as failed so the UI can show an error
  // banner + "Retry from here" affordance instead of a half-written reply.
  function markLastAssistantError(kind, detail) {
    const last = messages.value[messages.value.length - 1];
    if (last?.role !== 'assistant') return;
    last.error_state = kind;       // 'cancelled' | 'network' | 'upstream'
    last.error_detail = detail || '';
  }

  // Set provider/fallback info before tokens arrive (from SSE 'provider_fallback' event)
  function setProviderOnLast({ provider, fallback_reason }) {
    const last = messages.value[messages.value.length - 1];
    if (last?.role === 'assistant') {
      if (provider) last.provider = provider
      if (fallback_reason) last.fallback_reason = fallback_reason
    }
  }

  // Attach precise neurons figure once usageReconciler completes (per request).
  function setNeuronsOnLast(logId, neurons) {
    const last = messages.value[messages.value.length - 1];
    if (last?.role === 'assistant' && last.log_id === logId) {
      last.neurons = neurons
    }
  }

  function attachDocument(doc) {
    attachedDocuments.value.push(doc);
  }

  function removeDocument(docId) {
    attachedDocuments.value = attachedDocuments.value.filter((d) => d.document_id !== docId);
  }

  function clearAttachments() {
    attachedDocuments.value = [];
  }

  return {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    selectedModel,
    attachedDocuments,
    setConversations,
    setActiveConversation,
    addMessage,
    appendToLastAssistant,
    flushPendingAppend,
    attachDocument,
    removeDocument,
    clearAttachments,
    setThinkingOnLast,
    setContentOnLast,
    setImageOnLast,
    setUsageOnLast,
    setProviderOnLast,
    setNeuronsOnLast,
    markLastAssistantError,
  };
});
