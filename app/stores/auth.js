import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  const tokenCookie = useCookie('jwt', { maxAge: 86400, sameSite: 'lax' })
  const user = ref(null)
  const permissions = ref(null) // { module: { action: 'full'|'partial'|'none' } }
  const modules = ref(null)     // [{ id, name, route, ... }] — loaded once per session
  const permissionVersion = ref(0)

  function decodePayload(token) {
    try {
      const part = token.split('.')[1]
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
      const binary = atob(padded)
      const json = decodeURIComponent(
        Array.from(binary, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
      )
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  // Restore session from cookie on page load
  if (tokenCookie.value) {
    const decoded = decodePayload(tokenCookie.value)
    if (decoded && decoded.exp > Math.floor(Date.now() / 1000)) {
      user.value = decoded
    } else {
      tokenCookie.value = null
    }
  }

  const isLoggedIn = computed(() => !!tokenCookie.value && !!user.value)
  // Admin = role with level ≤ 2 (DB-driven, from roles.level fetched via /permissions/roles).
  // Name-based fallback while roles haven't loaded yet (cold start) — corrected after fetch.
  const ADMIN_FALLBACK = new Set(['super_admin', 'regional_admin'])
  const SUPER_ADMIN_FALLBACK = 'super_admin'
  const roles = ref(null)   // [{ name, display_name, level, ... }]
  const roleLevelMap = computed(() => {
    const m = new Map()
    for (const r of roles.value ?? []) m.set(r.name, r.level)
    return m
  })
  const isAdmin = computed(() => {
    const role = user.value?.role
    if (!role) return false
    const lvl = roleLevelMap.value.get(role)
    if (lvl !== undefined) return lvl <= 2
    return ADMIN_FALLBACK.has(role)
  })
  const isSuperAdmin = computed(() => {
    const role = user.value?.role
    if (!role) return false
    const lvl = roleLevelMap.value.get(role)
    if (lvl !== undefined) return lvl <= 1
    return role === SUPER_ADMIN_FALLBACK
  })

  async function login(username, password) {
    const res = await $fetch(`${config.public.apiBase}/api/auth/login`, {
      method: 'POST',
      body: { username, password },
    })
    tokenCookie.value = res.token
    user.value = res.user
    permissions.value = null // clear stale cache on new login
    modules.value = null
    // Apply user's preferred language if set
    if (res.user?.language) {
      const lang = res.user.language.toLowerCase().slice(0, 2)
      if (['en', 'vi'].includes(lang)) useI18n().setLocale(lang)
    }
    return { user: res.user, must_change_password: res.must_change_password }
  }

  async function fetchPermissions() {
    if (!tokenCookie.value) return
    try {
      const res = await $fetch(`${config.public.apiBase}/api/admin/permissions/me`, {
        headers: { Authorization: `Bearer ${tokenCookie.value}` },
      })
      permissions.value = res.permissions ?? null
      // If permission_version changed since last load, the cached modules list
      // may be stale (admin edited the role matrix) — invalidate so the next
      // guard pass re-fetches the now-correct list.
      if (typeof res.permission_version === 'number') {
        if (res.permission_version !== permissionVersion.value) {
          modules.value = null
        }
        permissionVersion.value = res.permission_version
      }
      // If BE returns a role different from JWT (e.g. role changed server-side), sync it back
      if (res.role && user.value && user.value.role !== res.role) {
        user.value = { ...user.value, role: res.role }
      }
    } catch (err) {
      const code = err?.data?.code
      if (code === 'ERR_STALE_PERMISSIONS' || code === 'STALE_PERMISSIONS') {
        useToast().show(useI18n().t('errors.ERR_STALE_PERMISSIONS'), 'warning', 4000)
        await logout()
        return
      }
      permissions.value = null
    }
  }

  // Fetch active modules once per session — used by auth guard for dynamic route→module mapping
  async function fetchModules() {
    if (!tokenCookie.value) return
    try {
      const res = await $fetch(`${config.public.apiBase}/api/admin/permissions/modules`, {
        headers: { Authorization: `Bearer ${tokenCookie.value}` },
      })
      modules.value = res
    } catch {
      modules.value = []
    }
  }

  // Fetch active roles (for level-based isAdmin/isSuperAdmin)
  async function fetchRoles() {
    if (!tokenCookie.value) return
    try {
      const res = await $fetch(`${config.public.apiBase}/api/admin/permissions/roles`, {
        headers: { Authorization: `Bearer ${tokenCookie.value}` },
      })
      roles.value = res
    } catch {
      roles.value = []
    }
  }

  // Refetch permissions on demand (e.g. after admin edits this user's own permissions)
  async function refreshPermissions() {
    permissions.value = null
    await fetchPermissions()
  }

  async function logout() {
    tokenCookie.value = null
    user.value = null
    permissions.value = null
    modules.value = null
    roles.value = null
    permissionVersion.value = 0
    await navigateTo('/login', { replace: true })
  }

  function getToken() {
    return tokenCookie.value
  }

  return {
    user,
    permissions,
    modules,
    roles,
    permissionVersion,
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    login,
    logout,
    getToken,
    fetchPermissions,
    fetchModules,
    fetchRoles,
    refreshPermissions,
  }
})
