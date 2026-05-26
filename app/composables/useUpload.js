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
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${config.public.apiBase}/api/documents/${documentId}`, {
            headers: { Authorization: `Bearer ${auth.getToken()}` },
          });
          const doc = await res.json();

          // Update status in attachedDocuments
          const existing = chatStore.attachedDocuments.find((d) => d.document_id === documentId);
          if (existing) existing.status = doc.status;

          if (doc.status === 'ready' || doc.status === 'error') {
            clearInterval(interval);
            // Surface a toast so the user knows when they can send safely.
            try {
              const { show } = useToast()
              const msg = doc.status === 'ready'
                ? `Document "${existing?.name || ''}" is ready.`
                : `Document "${existing?.name || ''}" failed: ${doc.error_msg || 'unknown error'}`
              show?.(msg, doc.status === 'ready' ? 'success' : 'error', 3500)
            } catch {}
            resolve(doc);
          }
        } catch {
          clearInterval(interval);
          resolve({ status: 'error' });
        }
      }, 2000);
    });
  }

  return { uploadFile };
}
