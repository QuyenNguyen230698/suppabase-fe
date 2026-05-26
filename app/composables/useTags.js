// Tags store (module-scoped — single fetch shared across all sidebars/dialogs).
const tags = ref([])
const loading = ref(false)
let loaded = false

export function useTags() {
  const { apiFetch } = useApi()

  async function load(force = false) {
    if (loaded && !force) return tags.value
    loading.value = true
    try {
      const data = await apiFetch('/api/tags', { _skipLoader: true })
      tags.value = data.items || []
      loaded = true
    } finally {
      loading.value = false
    }
    return tags.value
  }

  async function createTag(name, color = 'gray') {
    const t = await apiFetch('/api/tags', { method: 'POST', body: { name, color }, _skipLoader: true })
    tags.value.unshift(t)
    return t
  }

  async function updateTag(id, patch) {
    const t = await apiFetch(`/api/tags/${id}`, { method: 'PATCH', body: patch, _skipLoader: true })
    const idx = tags.value.findIndex(x => x.id === id)
    if (idx !== -1) tags.value[idx] = { ...tags.value[idx], ...t }
    return t
  }

  async function deleteTag(id) {
    await apiFetch(`/api/tags/${id}`, { method: 'DELETE', _skipLoader: true })
    tags.value = tags.value.filter(t => t.id !== id)
  }

  async function attachToConversation(conversationId, tagId) {
    return apiFetch(`/api/conversations/${conversationId}/tags`, {
      method: 'POST', body: { tag_id: tagId }, _skipLoader: true,
    })
  }

  async function detachFromConversation(conversationId, tagId) {
    return apiFetch(`/api/conversations/${conversationId}/tags/${tagId}`, {
      method: 'DELETE', _skipLoader: true,
    })
  }

  return {
    tags, loading,
    load, createTag, updateTag, deleteTag,
    attachToConversation, detachFromConversation,
  }
}
