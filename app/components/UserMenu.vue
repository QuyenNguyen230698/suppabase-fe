<template>
  <div class="user-menu" ref="wrapRef">
    <button
      class="um-trigger"
      :class="{ open, compact }"
      @click="toggle"
      :title="title || 'Account'"
      :aria-expanded="open"
      aria-haspopup="menu"
    >
      <slot name="trigger" :open="open">
        <span class="um-avatar">
          <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="" />
          <template v-else>{{ initials }}</template>
        </span>
        <span v-if="!compact" class="um-info">
          <span class="um-name">{{ auth.user?.username }}</span>
          <span class="um-role">{{ roleLabel }}</span>
        </span>
        <svg v-if="!compact" class="um-chev" :class="{ open }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </slot>
    </button>

    <Teleport to="body">
      <Transition name="um-pop">
        <div
          v-if="open"
          ref="menuRef"
          class="um-menu"
          role="menu"
          :style="menuStyle"
        >
          <div class="um-head">
            <div class="um-avatar lg">
              <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="" />
              <template v-else>{{ initials }}</template>
            </div>
            <div class="um-head-info">
              <div class="um-name">{{ auth.user?.username }}</div>
              <div class="um-role">{{ roleLabel }}</div>
            </div>
          </div>

          <div class="um-sep" />

          <div class="um-items">
            <button
              v-for="item in items"
              :key="item.path"
              class="um-item"
              :class="{ active: item.path === currentPath }"
              role="menuitem"
              @click="handleItem(item)"
            >
              <svg
                class="um-ic"
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="1.7"
                stroke-linecap="round" stroke-linejoin="round"
                v-html="item.icon"
              />
              <span class="um-lbl">{{ item.label }}</span>
            </button>

            <div v-if="items.length" class="um-sep" />

            <div class="um-sep" />

            <!-- Language switcher -->
            <div class="um-lang-row">
              <span class="um-lang-lbl">{{ t('common.language') }}</span>
              <div class="um-lang-options">
                <button
                  v-for="lng in i18n.supported"
                  :key="lng"
                  class="um-lang-btn"
                  :class="{ active: i18n.locale.value === lng }"
                  @click.stop="changeLocale(lng)"
                >{{ lng.toUpperCase() }}</button>
              </div>
            </div>

            <div class="um-sep" />

            <button class="um-item danger" role="menuitem" @click="handleLogout">
              <span class="um-ic">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </span>
              <span class="um-lbl">{{ t('auth.signOut') }}</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
const props = defineProps({
  placement: { type: String, default: 'up-left' }, // up-left | up-right | down-left | down-right
  compact:   { type: Boolean, default: false },
  title:     { type: String, default: '' },
})

const auth = useAuthStore()
const { confirmLogout } = useLogout()
const router = useRouter()
const route = useRoute()
const i18n = useI18n()
const { t } = i18n
const { apiFetch } = useApi()

async function changeLocale(lng) {
  i18n.setLocale(lng)
  // Persist to user profile if signed in (best-effort)
  if (auth.user?.id) {
    try {
      await apiFetch(`/api/admin/users/${auth.user.id}`, {
        method: 'PATCH',
        body: { language: lng },
        _skipLoader: true,
      })
      auth.user.language = lng
    } catch {}
  }
}

const open = ref(false)
const wrapRef = ref(null)
const menuRef = ref(null)
const triggerRect = ref(null)
const MENU_WIDTH = 240
const currentPath = computed(() => route.path)

const menuStyle = computed(() => {
  const r = triggerRect.value
  if (!r) return { visibility: 'hidden' }
  const up   = props.placement.startsWith('up')
  const right = props.placement.endsWith('right')
  const gap = 6

  const left = right
    ? Math.max(8, r.right - MENU_WIDTH)
    : Math.min(r.left, window.innerWidth - MENU_WIDTH - 8)

  return up
    ? { left: `${left}px`, bottom: `${window.innerHeight - r.top + gap}px`, width: `${MENU_WIDTH}px` }
    : { left: `${left}px`, top:    `${r.bottom + gap}px`,                   width: `${MENU_WIDTH}px` }
})

const initials = computed(() =>
  (auth.user?.username || '').slice(0, 2).toUpperCase()
)

const roleLabel = computed(() => {
  const role = auth.user?.role
  if (!role) return 'Member'
  const r = (auth.roles ?? []).find(x => x.name === role)
  return r?.display_name || role
})

const items = computed(() => {
  const list = []

  // My account (always — personal profile page)
  list.push({
    id: 'me',
    label: 'My account',
    path: '/me',
    icon: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
  })

  // Admin dashboard (admin-level only)
  if (auth.isAdmin) {
    list.push({
      id: 'admin-dashboard',
      label: 'Admin dashboard',
      path: '/admin/dashboard',
      icon: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    })
  }

  if (import.meta.dev) {
    list.push({
      id: 'design',
      label: 'Design System',
      path: '/design',
      icon: '<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>',
    })
    list.push({
      id: 'design-builder',
      label: 'Design Builder',
      path: '/design-builder',
      icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    })
  }

  return list
})

function updateRect() {
  const trigger = wrapRef.value?.querySelector('.um-trigger')
  if (trigger) triggerRect.value = trigger.getBoundingClientRect()
}

function toggle() {
  if (!open.value) updateRect()
  open.value = !open.value
}
function close() { open.value = false }

function handleItem(item) {
  close()
  if (item.path) router.push(item.path)
}

async function handleLogout() {
  close()
  await confirmLogout()
}

function onOutside(e) {
  if (wrapRef.value && wrapRef.value.contains(e.target)) return
  if (menuRef.value && menuRef.value.contains(e.target)) return
  close()
}
function onEsc(e) {
  if (e.key === 'Escape') close()
}
function onWindowChange() {
  if (open.value) updateRect()
}

onMounted(() => {
  document.addEventListener('mousedown', onOutside)
  document.addEventListener('keydown', onEsc)
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutside)
  document.removeEventListener('keydown', onEsc)
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
})
</script>

<style scoped>
.user-menu { position: relative; display: inline-block; }

/* Trigger */
.um-trigger {
  display: flex; align-items: center; gap: 9px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 6px 9px 6px 6px;
  cursor: pointer;
  color: var(--fg);
  transition: background .12s, border-color .12s;
  max-width: 100%;
  min-width: 0;
}
.um-trigger:hover, .um-trigger.open {
  background: var(--line);
  border-color: var(--line-2);
}
.um-trigger.compact { padding: 3px; gap: 0; }

.um-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--bg-elev-3), var(--bg-elev-2));
  border: 1px solid var(--line-2);
  display: grid; place-items: center;
  font-size: 10px; font-weight: 700;
  color: var(--fg);
  flex-shrink: 0;
}
.um-avatar.lg { width: 40px; height: 40px; font-size: 13px; }
.um-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 50%; }

.um-info {
  display: flex; flex-direction: column; min-width: 0; flex: 1;
  line-height: 1.2; text-align: left;
}
.um-name {
  font-size: 12px; font-weight: 600; color: var(--fg);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.um-role {
  font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--fg-mute);
}
.um-chev {
  color: var(--fg-mute); flex-shrink: 0;
  transition: transform .18s ease;
}
.um-chev.open { transform: rotate(180deg); }

/* Menu (Teleported to body, position: fixed) */
.um-menu {
  position: fixed;
  background: var(--bg-elev);
  border: 1px solid var(--line-2);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 16px 50px rgba(0,0,0,0.45), 0 2px 10px rgba(0,0,0,0.25);
  z-index: 1100;
}

.um-head {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 8px 10px;
}
.um-head-info { min-width: 0; }
.um-head-info .um-name { font-size: 13px; }
.um-head-info .um-role { font-size: 9px; }

.um-sep {
  height: 1px;
  background: var(--line);
  margin: 2px 0;
}

.um-items { display: flex; flex-direction: column; padding-top: 4px; }

.um-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  border: 0; background: transparent;
  border-radius: 8px;
  font-size: 12px; color: var(--fg-dim);
  cursor: pointer;
  text-align: left;
  transition: background .1s, color .1s;
}
.um-item:hover { background: var(--line); color: var(--fg); }
.um-item.active {
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  color: var(--accent);
}
.um-item.danger { color: var(--danger); }
.um-item.danger:hover {
  background: color-mix(in oklab, var(--danger) 12%, transparent);
  color: var(--danger);
}
.um-ic { display: grid; place-items: center; flex-shrink: 0; }

/* Language switcher */
.um-lang-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px;
  gap: 8px;
}
.um-lang-lbl {
  font-size: 11px;
  color: var(--fg-mute);
  letter-spacing: 0.04em;
}
.um-lang-options {
  display: inline-flex;
  border: 1px solid var(--line-2);
  border-radius: 6px;
  overflow: hidden;
}
.um-lang-btn {
  background: transparent;
  border: 0;
  color: var(--fg-mute);
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 9px;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: color .12s, background .12s;
}
.um-lang-btn:hover { color: var(--fg); background: var(--line); }
.um-lang-btn.active {
  background: color-mix(in oklab, var(--accent) 14%, transparent);
  color: var(--accent);
}

.um-pop-enter-active { transition: opacity .15s ease, transform .15s cubic-bezier(.4,0,.2,1); }
.um-pop-leave-active { transition: opacity .1s ease, transform .1s ease; }
.um-pop-enter-from   { opacity: 0; transform: translateY(6px) scale(0.98); }
.um-pop-leave-to     { opacity: 0; transform: translateY(4px) scale(0.99); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .um-trigger:not(.compact) { padding: 4px 7px 4px 4px; gap: 7px; }
  .um-info { display: none; }
  .um-chev { display: none; }
}
</style>
