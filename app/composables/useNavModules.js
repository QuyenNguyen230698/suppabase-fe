// Module nav builder driven by BE `modules` table.
// FE only owns section grouping + admin-only flag (BE has admin_only column too,
// but we keep this as a thin FE override layer for now).

const MODULE_META = {
  // Route overrides → unified chat UI
  chat:        { section: 'workspace', routeOverride: '/c' },
  pro_plan:    { section: 'workspace', routeOverride: '/c?model=peb' },
  documents:   { section: 'workspace' },
  api_tokens:  { section: 'system' },
  permissions: { section: 'system', adminOnly: true },
  agent_templates: { section: 'system', adminOnly: true },
  qa_audit:        { section: 'system', adminOnly: true },
}

const SECTION_IDS = ['workspace', 'system']

const FALLBACK_ICON = '<circle cx="12" cy="12" r="9"/>'

export function useNavModules() {
  const auth = useAuthStore()
  const { can } = usePermission()
  const { t } = useI18n()

  const items = computed(() => {
    return (auth.modules ?? []).filter(m => m.route).map(m => {
      const meta = MODULE_META[m.id] ?? {}
      return {
        id:        m.id,
        label:     m.name,
        path:      meta.routeOverride || m.route,
        // Prefer BE icon (modules.icon SVG markup); fall back to a dot.
        icon:      m.icon || FALLBACK_ICON,
        section:   meta.section || (m.admin_only ? 'system' : 'workspace'),
        adminOnly: !!(meta.adminOnly || m.admin_only),
      }
    }).filter(it => {
      // BE already filtered `auth.modules` to only modules the user can view.
      // Keep the admin_only guard as a belt-and-braces FE check.
      if (it.adminOnly && !auth.isAdmin) return false
      return true
    })
  })

  const sections = computed(() =>
    SECTION_IDS.map(id => ({
      id,
      label: t(`nav.${id}`),
      items: items.value.filter(it => it.section === id),
    })).filter(s => s.items.length)
  )

  const labelByPath = computed(() => {
    const map = {}
    for (const it of items.value) map[it.path] = it.label
    return map
  })

  return { items, sections, labelByPath }
}
