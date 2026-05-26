export function useApi() {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  const { show, hide } = useLoader()

  async function apiFetch(path, opts = {}) {
    const token = auth.getToken()
    if (!token) {
      auth.logout()
      throw new Error('Not authenticated')
    }

    const url = `${config.public.apiBase}${path}`

    // Skip loader for streaming chat and model list (too frequent / handled separately)
    const skipLoader = opts._skipLoader === true

    if (!skipLoader) show()
    try {
      return await $fetch(url, {
        ...opts,
        headers: {
          Authorization: `Bearer ${token}`,
          ...opts.headers,
        },
      })
    } catch (err) {
      const status = err?.response?.status
      const code   = err?.data?.code

      if (status === 401) {
        if (code === 'ERR_STALE_PERMISSIONS' || code === 'STALE_PERMISSIONS') {
          useToast().show(useI18n().t('errors.ERR_STALE_PERMISSIONS'), 'warning', 4000)
        }
        auth.logout()
      } else if (status === 403) {
        const toastCodes = ['ERR_PERMISSION_DENIED', 'ERR_SCOPE_DENIED', 'ERR_ROLE_ESCALATION']
        if (toastCodes.includes(code)) {
          useToast().show(useI18n().t(`errors.${code}`), 'error', 4000)
        }
      }
      throw err
    } finally {
      if (!skipLoader) hide()
    }
  }

  return { apiFetch, apiBase: config.public.apiBase }
}
