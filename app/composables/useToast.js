import { ref } from 'vue'

const MAX_VISIBLE = 3
const toasts = ref([])
let nextId = 0

export function useToast() {
  function show(message, variant = 'success', duration = 2400) {
    // If we already have 3, dismiss the oldest
    if (toasts.value.length >= MAX_VISIBLE) {
      dismiss(toasts.value[0].id)
    }

    const id = ++nextId
    const timer = setTimeout(() => dismiss(id), duration)
    toasts.value.push({ id, message, variant, timer })
  }

  function dismiss(id) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx === -1) return
    clearTimeout(toasts.value[idx].timer)
    toasts.value.splice(idx, 1)
  }

  return { toasts, show, dismiss }
}
