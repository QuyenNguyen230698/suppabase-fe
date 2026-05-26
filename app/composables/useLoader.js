const loading = ref(false)
const loadingMessage = ref('Loading…')
let _count = 0 // counter to handle concurrent requests

export function useLoader() {
  function show(message = 'Loading…') {
    _count++
    loadingMessage.value = message
    loading.value = true
  }

  function hide() {
    _count = Math.max(0, _count - 1)
    if (_count === 0) loading.value = false
  }

  return { loading: readonly(loading), loadingMessage: readonly(loadingMessage), show, hide }
}
