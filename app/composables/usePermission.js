/**
 * usePermission — reactive permission checks against the current user's
 * effective permission set (fetched from GET /api/admin/permissions/me).
 *
 * Usage:
 *   const { can, canAny, ready } = usePermission()
 *   can('api_tokens', 'create')   → true | false
 *   canAny('api_tokens', ['create','edit']) → true if any action is 'full' or 'partial'
 *   canFull('api_tokens', 'delete')         → true only if 'full'
 */
export function usePermission() {
  const auth = useAuthStore()

  // Fetch once per session if not already loaded
  if (auth.isLoggedIn && !auth.permissions) {
    auth.fetchPermissions()
  }

  const ready = computed(() => auth.permissions !== null || !auth.isLoggedIn)

  function can(module, action) {
    if (auth.isSuperAdmin) return true
    const state = auth.permissions?.[module]?.[action]
    return state === 'full' || state === 'partial'
  }

  function canFull(module, action) {
    if (auth.isSuperAdmin) return true
    return auth.permissions?.[module]?.[action] === 'full'
  }

  function canAny(module, actions) {
    return actions.some(a => can(module, a))
  }

  function permState(module, action) {
    if (auth.isSuperAdmin) return 'full'
    return auth.permissions?.[module]?.[action] ?? 'none'
  }

  return { can, canFull, canAny, permState, ready }
}
