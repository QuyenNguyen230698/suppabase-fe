<template>
  <ClientOnly>
  <div class="app-shell">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: !sidebarOpen, 'mobile-open': mobileMenuOpen }">

      <!-- Brand -->
      <div class="brand">
        <template v-if="sidebarOpen">
          <div class="brand-mark"><div class="brand-inner"></div></div>
          <span class="brand-name">Suppabase</span>
          <span class="brand-tag">Admin</span>
          <button class="sidebar-toggle-btn" @click="toggleSidebar" title="Collapse sidebar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </template>
        <template v-else>
          <button class="sidebar-toggle-btn" @click="toggleSidebar" title="Expand sidebar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </template>
      </div>

      <!-- Navigation -->
      <nav class="nav">
        <div
          v-for="section in navSections"
          :key="section.id"
          class="nav-section"
        >
          <div class="nav-label">
            <span v-if="sidebarOpen">{{ section.label }}</span>
            <span v-else class="nav-label-dot"></span>
          </div>
          <NuxtLink
            v-for="item in section.items"
            :key="item.id"
            class="nav-item"
            :to="item.path"
            :title="!sidebarOpen ? item.label : undefined"
          >
            <svg
              width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.6"
              stroke-linecap="round" stroke-linejoin="round"
              class="nav-icon"
              v-html="item.icon"
            />
            <span v-if="sidebarOpen" class="nav-text">{{ item.label }}</span>
          </NuxtLink>
        </div>

        <!-- Dev-only: Design System -->
        <div v-if="isDev" class="nav-section">
          <div class="nav-label">
            <span v-if="sidebarOpen">{{ t('nav.dev') }}</span>
            <span v-else class="nav-label-dot"></span>
          </div>
          <NuxtLink class="nav-item" to="/design" :title="!sidebarOpen ? t('nav.designSystem') : undefined">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="nav-icon">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            <span v-if="sidebarOpen" class="nav-text">{{ t('nav.designSystem') }}</span>
          </NuxtLink>
          <NuxtLink class="nav-item" to="/design-builder" :title="!sidebarOpen ? t('nav.designBuilder') : undefined">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="nav-icon">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
            <span v-if="sidebarOpen" class="nav-text">{{ t('nav.designBuilder') }}</span>
          </NuxtLink>
        </div>

        <!-- Portal target: pages can Teleport content here (e.g. Org Nodes in permissions.vue) -->
        <div id="sidebar-portal"></div>
      </nav>

      <!-- Sidebar footer -->
      <div class="sidebar-foot">
        <UserMenu :compact="!sidebarOpen" placement="up-left" :title="auth.user?.username" />
      </div>
    </aside>

    <!-- Mobile overlay backdrop -->
    <div class="mobile-backdrop" :class="{ visible: mobileMenuOpen }" @click="mobileMenuOpen = false"></div>

    <!-- Main area -->
    <div class="main">

      <!-- Top header -->
      <header class="top-header">
        <!-- Mobile hamburger -->
        <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen" aria-label="Toggle menu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <!-- Breadcrumb -->
        <nav class="breadcrumb-nav" aria-label="Breadcrumb">
          <ol class="breadcrumb-list">
            <li
              v-for="(crumb, i) in breadcrumbs"
              :key="crumb.path + i"
              class="breadcrumb-item"
            >
              <span v-if="i > 0" class="bc-sep" aria-hidden="true">/</span>
              <NuxtLink
                v-if="i < breadcrumbs.length - 1"
                :to="crumb.path"
                class="bc-link"
              >{{ crumb.label }}</NuxtLink>
              <span v-else class="bc-current">{{ crumb.label }}</span>
            </li>
          </ol>
        </nav>

        <div class="header-spacer"></div>

        <!-- User chip -->
        <div class="user-chip">
          <div class="chip-avatar" :title="auth.user?.username">
            <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="" />
            <template v-else>{{ initials }}</template>
          </div>
          <div class="chip-info">
            <span class="chip-name">{{ auth.user?.username }}</span>
            <span class="chip-role">{{ roleLabel }}</span>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <div class="page-content">
        <slot />
      </div>
    </div>
  </div>
  </ClientOnly>
</template>

<script setup>
const auth = useAuthStore()
const route = useRoute()
const { sections: navSections, labelByPath } = useNavModules()
const { t } = useI18n()

const isDev = import.meta.dev

const mobileMenuOpen = ref(false)

// Close mobile sidebar on route change
watch(() => route.path, () => { mobileMenuOpen.value = false })

const sidebarCookie = useCookie('sb_sidebar', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
const sidebarOpen = computed({
  get: () => sidebarCookie.value !== 'false',
  set: (v) => { sidebarCookie.value = v ? 'true' : 'false' },
})

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

const initials = computed(() =>
  (auth.user?.username || '').slice(0, 2).toUpperCase()
)

const roleLabel = computed(() => {
  const role = auth.user?.role
  if (!role) return t('user.member')
  const r = (auth.roles ?? []).find(x => x.name === role)
  return r?.display_name || role
})

const STATIC_LABELS = computed(() => ({
  '/design': t('nav.designSystem'),
  '/design-builder': t('nav.designBuilder'),
}))

const breadcrumbs = computed(() => {
  const path = route.path
  if (path === '/' || !path) return [{ label: t('common.home'), path: '/' }]

  const homeCrumb = { label: t('common.home'), path: auth.isAdmin ? '/api-token' : '/c' }
  const label =
    labelByPath.value[path] ||
    STATIC_LABELS.value[path] ||
    path.slice(1).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  if (path === homeCrumb.path) return [{ label, path }]
  return [homeCrumb, { label, path }]
})
</script>

<style scoped>
/* ── Shell ────────────────────────────────────────── */
.app-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
  background: var(--bg);
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--fg);
}

/* ── Sidebar ──────────────────────────────────────── */
.sidebar {
  background: var(--bg-elev);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 14px 10px;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 30;
  overflow: hidden;
  width: 220px;
  transition: width .25s cubic-bezier(.4,0,.2,1), padding .25s cubic-bezier(.4,0,.2,1);
}
.sidebar.collapsed {
  width: 56px;
  padding: 14px 8px;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 4px 8px 18px;
  min-height: 52px;
}
.sidebar.collapsed .brand {
  justify-content: center;
  padding: 4px 0 18px;
}
.sidebar-toggle-btn {
  margin-left: auto;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--line-2);
  background: var(--line);
  color: var(--fg-faint);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: color .12s, background .12s, border-color .12s;
}
.sidebar-toggle-btn:hover {
  color: var(--fg);
  background: var(--line-2);
  border-color: var(--line-3);
}
.sidebar.collapsed .sidebar-toggle-btn {
  margin-left: 0;
}
.brand-mark {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--accent, #d8ff5b);
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 0 12px color-mix(in oklab, var(--accent, #d8ff5b) 30%, transparent);
}
.brand-inner {
  position: absolute;
  inset: 6px;
  background: var(--bg-elev);
  border-radius: 2px;
}
.brand-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.brand-tag {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

/* Nav */
.nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  scrollbar-width: none;
}
.nav::-webkit-scrollbar { display: none; }

.nav-section {
  margin-bottom: 2px;
}

.nav-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-faint);
  padding: 10px 10px 5px;
  white-space: nowrap;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.nav-label-dot {
  display: block;
  width: 16px;
  height: 1px;
  background: var(--line-2);
  border-radius: 1px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--fg-mute);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  transition: background .1s, color .1s;
  position: relative;
}
.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 8px 6px;
  gap: 0;
}
.nav-item:hover {
  background: var(--line);
  color: var(--fg);
}
.nav-item.router-link-active {
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  color: var(--accent);
  font-weight: 600;
}
.nav-item.router-link-active .nav-icon {
  filter: drop-shadow(0 0 4px color-mix(in oklab, var(--accent) 60%, transparent));
}

.nav-icon {
  flex-shrink: 0;
  transition: filter .15s;
}
.nav-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Sidebar footer */
.sidebar-foot {
  margin-top: auto;
  padding: 8px 2px 0;
  border-top: 1px solid var(--line);
  display: flex;
  align-items: stretch;
  min-height: 48px;
}
.sidebar-foot > * { width: 100%; }
.sidebar.collapsed .sidebar-foot { justify-content: center; }

/* ── Main ─────────────────────────────────────────── */
.main {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 0;
  overflow: hidden;
}

/* Top header */
.top-header {
  height: 48px;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  position: sticky;
  top: 0;
  z-index: 20;
  flex-shrink: 0;
}

/* Breadcrumb */
.breadcrumb-nav { flex: 1; min-width: 0; overflow: hidden; }
.breadcrumb-list {
  display: flex;
  align-items: center;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
  flex-wrap: nowrap;
  overflow: hidden;
}
.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex-shrink: 0;
}
.bc-sep {
  color: var(--fg-faint);
  font-size: 12px;
  user-select: none;
}
.bc-link {
  font-size: 12px;
  color: var(--fg-mute);
  text-decoration: none;
  transition: color .12s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.bc-link:hover { color: var(--fg); }
.bc-current {
  font-size: 12px;
  font-weight: 600;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.header-spacer { flex: 1; }

/* User chip */
.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.chip-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-elev-3);
  border: 1px solid var(--line-2);
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 700;
  color: var(--fg);
  flex-shrink: 0;
}
.chip-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.chip-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.chip-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--fg);
  white-space: nowrap;
}
.chip-role {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-faint);
  white-space: nowrap;
}

/* Page content */
.page-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* ── Sidebar collapse: grid update ────────────────── */
/* Using CSS container query workaround via data attr is messy,
   instead we update the grid from the sidebar width transition */
.app-shell:has(.sidebar.collapsed) {
  grid-template-columns: 56px 1fr;
}

/* ── Mobile hamburger button ──────────────────────── */
.mobile-menu-btn {
  display: none;
  background: transparent;
  border: 0;
  color: var(--fg-mute);
  width: 32px; height: 32px;
  border-radius: 7px;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color .12s, background .12s;
}
.mobile-menu-btn:hover { color: var(--fg); background: rgba(255,255,255,0.06); }

/* Mobile overlay backdrop */
.mobile-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 25;
  opacity: 0;
  pointer-events: none;
  transition: opacity .25s;
}

/* ── Tablet (≤ 1024px): collapse sidebar by default ── */
@media (max-width: 1024px) {
  .app-shell {
    grid-template-columns: 56px 1fr;
  }
  .app-shell:has(.sidebar:not(.collapsed)) {
    grid-template-columns: 220px 1fr;
  }
  .chip-info { display: none; }
}

/* ── Mobile (≤ 768px): full overlay sidebar ────────── */
@media (max-width: 768px) {
  .app-shell,
  .app-shell:has(.sidebar.collapsed),
  .app-shell:has(.sidebar:not(.collapsed)) {
    grid-template-columns: 1fr;
  }

  .mobile-menu-btn { display: grid; }

  .mobile-backdrop { display: block; }
  .mobile-backdrop.visible { opacity: 1; pointer-events: auto; }

  .sidebar {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    z-index: 30;
    transform: translateX(-100%);
    transition: transform .25s cubic-bezier(.4,0,.2,1), width .25s cubic-bezier(.4,0,.2,1);
    width: 220px !important;
  }
  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .top-header { padding: 0 12px; }
  .bc-link { max-width: 80px; }
  .bc-current { max-width: 120px; }
}

/* ── Transitions ──────────────────────────────────── */
.fade-text-enter-active,
.fade-text-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}
.fade-text-enter-from,
.fade-text-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}
</style>
