<template>
  <aside class="sidebar" :class="{ rail: collapsed }">
    <!-- Brand -->
    <div class="brand">
      <div class="brand-mark"></div>
      <span class="brand-name">Suppabase</span>
      <button class="sidebar-toggle" @click="collapsed = !collapsed" :title="collapsed ? t('common.showMore') : t('common.hide')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path v-if="!collapsed" d="M15 18l-6-6 6-6"/>
          <path v-else d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>

    <!-- New chat -->
    <button class="new-chat" @click="$emit('new-conversation')">
      <span class="ic">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      </span>
      <span class="lbl">{{ t('chat.newChat') }}</span>
      <kbd v-if="!collapsed">⌘K</kbd>
    </button>

    <!-- Conversations -->
    <div class="convo-list">
      <template v-if="!collapsed">
        <template v-for="[label, list] in convoGroups">
          <div v-if="list.length" :key="label">
            <div class="group-label">{{ label }}</div>
            <div
              v-for="conv in list"
              :key="conv.id"
              class="convo"
              :data-active="activeId === conv.id"
              @click="$emit('select-conversation', conv.id)"
            >
              <span class="convo-dot"></span>
              <span class="convo-title">{{ conv.title || t('chat.newConversation') }}</span>
              <button class="convo-del" @click.stop="$emit('delete-conversation', conv.id)" :title="t('common.delete')">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        </template>
        <p v-if="!conversations.length" class="convo-empty">{{ t('chat.noConversations') }}</p>
      </template>
      <template v-else>
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="convo"
          :data-active="activeId === conv.id"
          :data-tip="conv.title || t('chat.newConversation')"
          @click="$emit('select-conversation', conv.id)"
        >
          <span class="convo-dot"></span>
        </div>
      </template>
    </div>

    <!-- Pro Plan toggle (only visible when user has view permission on pro_plan) -->
    <button
      v-if="canPro"
      class="pro-btn"
      :class="{ rail: collapsed, active: isProActive }"
      @click="togglePro"
      title="Pro Plan"
    >
      <span class="pro-ic">
        <svg width="14" height="14" viewBox="0 0 24 24" :fill="isProActive ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </span>
      <span v-if="!collapsed" class="pro-lbl">Pro Plan</span>
      <span v-if="!collapsed" class="pro-badge">PEB</span>
    </button>

    <!-- Footer -->
    <div class="sidebar-foot">
      <UserMenu :compact="collapsed" placement="up-left" :title="auth.user?.username" />
    </div>
  </aside>
</template>

<script setup>
const auth = useAuthStore()
const route = useRoute()
const { can } = usePermission()
const { t } = useI18n()
const props = defineProps({ conversations: Array, activeId: String })
defineEmits(['new-conversation', 'select-conversation', 'delete-conversation'])

const isProActive = computed(() => route.path === '/pro-plan')
const canPro = computed(() => can('pro_plan', 'view'))

function togglePro() {
  navigateTo(isProActive.value ? '/chat' : '/pro-plan')
}

const collapsed = ref(false)

const grouped = computed(() => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const sevenDaysStart = todayStart - 6 * 86400000

  const groups = { today: [], yesterday: [], prev7: [], older: [] }
  for (const c of (props.conversations || [])) {
    const ts = c.last_message_at || c.updated_at
    const tt = ts ? new Date(ts).getTime() : 0
    if (tt >= todayStart) groups.today.push(c)
    else if (tt >= yesterdayStart) groups.yesterday.push(c)
    else if (tt >= sevenDaysStart) groups.prev7.push(c)
    else groups.older.push(c)
  }
  return groups
})

const convoGroups = computed(() => [
  [t('chat.groups.today'),         grouped.value.today],
  [t('chat.groups.yesterday'),     grouped.value.yesterday],
  [t('chat.groups.previous7Days'), grouped.value.prev7],
  [t('chat.groups.older'),         grouped.value.older],
])
</script>

<style scoped>
.sidebar {
  width: 260px;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  height: 100vh;
  flex-shrink: 0;
  transition: width 0.28s cubic-bezier(.32,.72,.18,1);
  background: var(--bg);
  position: relative;
  z-index: 1;
}
.sidebar.rail { width: 52px; }

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 22px;
  min-height: 60px;
}
.brand-mark {
  width: 20px; height: 20px;
  border-radius: 5px;
  background: conic-gradient(from 210deg, var(--accent), color-mix(in oklab, var(--accent) 40%, #fff) 40%, var(--accent) 80%, var(--accent));
  box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.4), 0 0 12px color-mix(in oklab, var(--accent) 28%, transparent);
  position: relative;
  flex-shrink: 0;
}
.brand-mark::after {
  content: ""; position: absolute; inset: 5.5px;
  background: var(--bg); border-radius: 1.5px;
}
.brand-name {
  font-family: var(--font-serif);
  font-size: 19px;
  letter-spacing: 0.005em;
  line-height: 1;
  white-space: nowrap;
  flex: 1;
}
.rail .brand { padding: 18px 14px 22px; justify-content: center; }
.rail .brand-name { display: none; }

.sidebar-toggle {
  appearance: none; background: transparent; border: 0;
  color: var(--fg-mute);
  width: 26px; height: 26px;
  display: grid; place-items: center;
  border-radius: 6px;
  cursor: pointer;
  transition: background .12s, color .12s;
  flex-shrink: 0;
}
.sidebar-toggle:hover { background: rgba(255,255,255,0.05); color: var(--fg); }
.rail .sidebar-toggle {
  position: absolute;
  top: 14px; right: -14px;
  background: var(--bg-elev);
  border: 1px solid var(--line-2);
  z-index: 5;
}

.new-chat {
  display: flex; align-items: center; gap: 12px;
  margin: 0 10px 4px;
  padding: 9px 12px;
  background: transparent; border: 0;
  border-radius: 8px;
  color: var(--fg-dim);
  font-size: 13px;
  font-family: var(--font-sans);
  width: calc(100% - 20px);
  cursor: pointer;
  transition: background .12s, color .12s;
}
.new-chat:hover { background: rgba(255,255,255,0.04); color: var(--fg); }
.new-chat .ic { width: 16px; height: 16px; display: grid; place-items: center; color: var(--fg-mute); flex-shrink: 0; }
.new-chat:hover .ic { color: var(--accent); }
.new-chat .lbl { flex: 1; white-space: nowrap; }
.new-chat kbd { font-family: var(--font-mono); font-size: 10px; color: var(--fg-faint); }
.rail .new-chat { justify-content: center; padding: 9px 0; margin: 0 8px 4px; width: calc(100% - 16px); }

.convo-list {
  flex: 1; min-height: 0;
  overflow-y: auto; overflow-x: hidden;
  padding: 8px 10px;
  display: flex; flex-direction: column; gap: 1px;
  /* Hide scrollbar but keep scroll behaviour */
  scrollbar-width: none;          /* Firefox */
  -ms-overflow-style: none;       /* IE/old Edge */
}
.convo-list::-webkit-scrollbar { display: none; }   /* Chromium/Safari */
.group-label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg-faint);
  padding: 10px 12px 6px;
}
.convo {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 12px;
  border-radius: 7px;
  cursor: pointer;
  color: var(--fg-dim);
  transition: background .12s, color .12s;
  min-width: 0;
  position: relative;
}
.convo:hover { background: rgba(255,255,255,0.03); color: var(--fg); }
.convo[data-active="true"] { background: rgba(255,255,255,0.05); color: var(--fg); }
.convo-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: transparent;
  flex-shrink: 0;
  transition: background .15s;
}
.convo[data-active="true"] .convo-dot {
  background: var(--accent);
  box-shadow: 0 0 6px color-mix(in oklab, var(--accent) 60%, transparent);
}
.convo-title { flex: 1; min-width: 0; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.convo-del {
  opacity: 0; background: transparent; border: 0;
  color: var(--fg-mute); cursor: pointer;
  width: 18px; height: 18px;
  display: grid; place-items: center;
  border-radius: 4px;
  transition: opacity .12s, color .12s, background .12s;
  flex-shrink: 0;
}
.convo:hover .convo-del { opacity: 1; }
.convo-del:hover { color: #ff9a9a; background: rgba(255,107,107,0.1); }
.convo-empty { color: var(--fg-mute); font-size: 12px; text-align: center; padding: 32px 8px; }

/* Rail rail tooltips */
.rail .convo { justify-content: center; padding: 8px 0; }
.rail .convo-dot { width: 6px; height: 6px; background: var(--fg-faint); }
.rail .convo:hover .convo-dot { background: var(--fg-mute); }
.rail .convo[data-active="true"] .convo-dot { background: var(--accent); }
.rail .convo[data-tip]:hover::after {
  content: attr(data-tip);
  position: absolute;
  left: calc(100% + 12px);
  top: 50%; transform: translateY(-50%);
  background: var(--bg-elev-2);
  color: var(--fg);
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--line-2);
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.sidebar-foot {
  padding: 10px;
  display: flex; align-items: stretch;
  border-top: 1px solid var(--line);
}
.sidebar-foot > * { width: 100%; }
.rail .sidebar-foot { justify-content: center; }

.pro-btn {
  display: flex; align-items: center; gap: 10px;
  margin: 0 10px 6px;
  padding: 8px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--fg-dim);
  font-size: 13px;
  font-family: var(--font-sans);
  border: 1px solid transparent;
  transition: background .12s, color .12s, border-color .12s;
}
.pro-btn.active {
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  color: var(--accent);
  border-color: color-mix(in oklab, var(--accent) 25%, transparent);
}
.pro-btn:not(.active):hover {
  background: transparent;
  color: var(--fg-dim);
  border-color: transparent;
}
.pro-ic {
  width: 16px; height: 16px;
  display: grid; place-items: center;
  flex-shrink: 0;
  color: var(--accent);
}
.pro-lbl { flex: 1; white-space: nowrap; font-weight: 500; }
.pro-badge {
  font-family: var(--font-mono);
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.08em;
  padding: 1px 6px; border-radius: 4px;
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in oklab, var(--accent) 30%, transparent);
}
.pro-btn.rail {
  justify-content: center; padding: 8px 0;
  margin: 0 8px 6px; width: calc(100% - 16px);
}

@media (max-width: 1024px) {
  .sidebar { width: 220px; }
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    z-index: 30;
    width: 260px !important;
    transform: translateX(-100%);
    transition: transform .25s cubic-bezier(.4,0,.2,1);
  }
  .sidebar.mobile-open { transform: translateX(0); }
}
</style>
