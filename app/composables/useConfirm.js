import { ref, shallowRef } from 'vue'

const visible  = ref(false)
const options  = ref({})
let _resolve   = null

export function useConfirm() {
  function ask(opts = {}) {
    options.value = {
      title:        opts.title        ?? 'Are you sure?',
      message:      opts.message      ?? '',
      confirmLabel: opts.confirmLabel ?? 'Confirm',
      cancelLabel:  opts.cancelLabel  ?? 'Cancel',
      variant:      opts.variant      ?? 'default', // default | danger
    }
    visible.value = true
    return new Promise(resolve => { _resolve = resolve })
  }

  function confirm() {
    visible.value = false
    _resolve?.(true)
    _resolve = null
  }

  function cancel() {
    visible.value = false
    _resolve?.(false)
    _resolve = null
  }

  return { visible, options, ask, confirm, cancel }
}
