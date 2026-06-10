export function useUpload() {
  const config = useRuntimeConfig();
  const auth = useAuthStore();
  const chatStore = useChatStore();

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${config.public.apiBase}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.getToken()}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed: ${res.status}`);
    }

    const data = await res.json();
    chatStore.attachDocument({
      ...data,
      name: file.name,
      type: file.type,
      kind: data.kind,                 // 'image' | 'pdf' | 'document' | 'code' | 'text'
      r2_public_url: data.r2_public_url,
    });

    // Poll until ready or error
    await pollStatus(data.document_id);
    return data.document_id;
  }

  async function pollStatus(documentId) {
    // Terminal states the worker writes to documents.status. 'quarantined' is a
    // dead-end too (router couldn't classify) — must stop polling on it.
    const TERMINAL = new Set(['ready', 'error', 'quarantined'])
    // Hard ceiling so a stuck/unreachable backend can never leave the chip
    // "pending" forever: ~2 minutes (60 polls × 2s). A few transient HTTP/network
    // errors are tolerated before giving up.
    const MAX_POLLS = 60
    const MAX_ERRORS = 5

    return new Promise((resolve) => {
      let polls = 0
      let errors = 0
      const finish = (status, error_msg) => {
        clearInterval(interval)
        const existing = chatStore.attachedDocuments.find((d) => d.document_id === documentId)
        if (existing) existing.status = status
        try {
          const { show } = useToast()
          const name = existing?.name || ''
          if (status === 'ready') show?.(`Document "${name}" is ready.`, 'success', 3500)
          else show?.(`Document "${name}" failed: ${error_msg || 'unknown error'}`, 'error', 3500)
        } catch {}
        resolve({ status, error_msg })
      }

      const interval = setInterval(async () => {
        polls++
        if (polls > MAX_POLLS) { finish('error', 'Timed out waiting for processing'); return }
        try {
          const res = await fetch(`${config.public.apiBase}/api/documents/${documentId}`, {
            headers: { Authorization: `Bearer ${auth.getToken()}` },
          })
          if (!res.ok) {
            // HTTP error (404/401/5xx). Retry a few times, then give up — never
            // loop forever on a body that has no `status` field.
            if (++errors >= MAX_ERRORS) finish('error', `Server error ${res.status}`)
            return
          }
          errors = 0
          const doc = await res.json()

          const existing = chatStore.attachedDocuments.find((d) => d.document_id === documentId)
          if (existing && doc.status) existing.status = doc.status

          if (TERMINAL.has(doc.status)) {
            finish(doc.status === 'quarantined' ? 'error' : doc.status, doc.error_msg)
          }
        } catch {
          if (++errors >= MAX_ERRORS) finish('error', 'Network error')
        }
      }, 2000)
    })
  }

  return { uploadFile };
}
