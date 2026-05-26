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

    <!-- Projects link -->
    <NuxtLink to="/projects" class="quick-link" :title="!collapsed ? null : 'Projects'">
      <span class="ic">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      </span>
      <span v-if="!collapsed" class="lbl">Projects</span>
    </NuxtLink>

    <!-- Search box -->
    <div v-if="!collapsed" class="search-box">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="t('common.search')"
        @input="onSearch"
        @keydown.escape="clearSearch"
      />
      <button v-if="searchQuery" class="search-clear" @click="clearSearch">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Conversations -->
    <div class="convo-list">
      <!-- Search results mode -->
      <template v-if="searchQuery && (convResults !== null || msgResults !== null)">
        <!-- Search tabs -->
        <div class="search-tabs">
          <button :class="{ active: searchTab === 'conversations' }" @click="searchTab = 'conversations'">
            Chats <span class="stab-count">{{ convResults?.length ?? '…' }}</span>
          </button>
          <button :class="{ active: searchTab === 'messages' }" @click="searchTab = 'messages'">
            Messages <span class="stab-count">{{ msgResults?.length ?? '…' }}</span>
          </button>
        </div>

        <!-- Conversation results -->
        <template v-if="searchTab === 'conversations'">
          <div
            v-for="conv in (convResults || [])"
            :key="conv.id"
            class="convo"
            :data-active="activeId === conv.id"
            :title="conv.summary || conv.title || ''"
            @click="$emit('select-conversation', conv.id)"
          >
            <span class="convo-dot" :class="conv.source"></span>
            <span class="convo-title">{{ conv.title || t('chat.newConversation') }}</span>
          </div>
          <p v-if="convResults && !convResults.length" class="convo-empty">No conversations found</p>
        </template>

        <!-- Message results -->
        <template v-if="searchTab === 'messages'">
          <div
            v-for="m in (msgResults || [])"
            :key="m.message_id"
            class="msg-result"
            @click="$emit('select-conversation', m.conversation_id)"
          >
            <span class="convo-dot" :class="m.source"></span>
            <div class="msg-result-body">
              <span class="msg-result-title">{{ m.conversation_title || t('chat.newConversation') }}</span>
              <span class="msg-result-snippet">{{ m.snippet }}</span>
            </div>
          </div>
          <p v-if="msgResults && !msgResults.length" class="convo-empty">No messages found</p>
        </template>

        <p v-if="convResults === null && msgResults === null" class="convo-empty">{{ t('common.loading') }}</p>
      </template>

      <!-- Normal grouped mode -->
      <template v-else-if="!collapsed">
        <!-- Pinned -->
        <template v-if="pinned.length">
          <div class="group-label">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7l2-7z" stroke="none"/></svg>
            Pinned
          </div>
          <ConvoRow
            v-for="conv in pinned" :key="conv.id"
            :conv="conv" :active="activeId === conv.id"
            @click="$emit('select-conversation', conv.id)"
            @action="(act) => $emit('conversation-action', { id: conv.id, action: act, conv })"
          />
        </template>

        <!-- Time-bucketed -->
        <!-- eslint-disable-next-line vue/no-v-for-template-key -->
        <template v-for="[label, list] in groups" :key="label">
          <template v-if="list.length">
            <div class="group-label">{{ label }}</div>
            <ConvoRow
              v-for="conv in list" :key="conv.id"
              :conv="conv" :active="activeId === conv.id"
              @click="$emit('select-conversation', conv.id)"
              @action="(act) => $emit('conversation-action', { id: conv.id, action: act, conv })"
            />
          </template>
        </template>

        <!-- Archived (collapsible) -->
        <template v-if="archived.length">
          <button class="group-label group-toggle" @click="showArchived = !showArchived">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                 :style="{ transform: showArchived ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .15s' }">
              <path d="m9 18 6-6-6-6"/>
            </svg>
            Archived · {{ archived.length }}
          </button>
          <template v-if="showArchived">
            <ConvoRow
              v-for="conv in archived" :key="conv.id"
              :conv="conv" :active="activeId === conv.id"
              @click="$emit('select-conversation', conv.id)"
              @action="(act) => $emit('conversation-action', { id: conv.id, action: act, conv })"
            />
          </template>
        </template>

        <p v-if="!visibleConversations.length" class="convo-empty">{{ t('chat.noConversations') }}</p>
      </template>

      <!-- Rail mode -->
      <template v-else>
        <div
          v-for="conv in visibleConversations.slice(0, 30)"
          :key="conv.id"
          class="convo"
          :data-active="activeId === conv.id"
          :data-tip="conv.title || t('chat.newConversation')"
          @click="$emit('select-conversation', conv.id)"
        >
          <span class="convo-dot" :class="conv.source"></span>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="sidebar-foot">
      <UserMenu :compact="collapsed" placement="up-left" :title="auth.user?.username" />
    </div>
  </aside>
</template>

<script setup>
const props = defineProps({
  conversations: { type: Array, default: () => [] },
  activeId:      { type: String, default: null },
})
defineEmits([
  'new-conversation',
  'select-conversation',
  'delete-conversation',     // kept for backward-compat
  'conversation-action',     // { id, action, conv } — action: pin/star/archive/delete/rename/share
])

const auth = useAuthStore()
const { t } = useI18n()
const { apiFetch } = useApi()

const collapsed = ref(false)
const showArchived = ref(false)

// ── Search ──────────────────────────────────────────────────
const searchQuery = ref('')
const convResults = ref(null)
const msgResults  = ref(null)
const searchTab   = ref('conversations')
let searchTimer   = null

function onSearch() {
  const q = searchQuery.value.trim()
  if (!q) {
    convResults.value = null
    msgResults.value  = null
    return
  }
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    const enc = encodeURIComponent(q)
    try {
      const [convData, msgData] = await Promise.all([
        apiFetch(`/api/search/conversations?q=${enc}&limit=30`, { _skipLoader: true }),
        apiFetch(`/api/search/messages?q=${enc}&limit=30`, { _skipLoader: true }),
      ])
      convResults.value = convData.items
      msgResults.value  = msgData.items
    } catch {
      convResults.value = []
      msgResults.value  = []
    }
  }, 250)
}

function clearSearch() {
  searchQuery.value = ''
  convResults.value = null
  msgResults.value  = null
  clearTimeout(searchTimer)
}

// ── Group buckets ───────────────────────────────────────────
const visibleConversations = computed(() =>
  (props.conversations || []).filter(c => !c.archived)
)

const pinned = computed(() => visibleConversations.value.filter(c => c.pinned))
const archived = computed(() => (props.conversations || []).filter(c => c.archived))

const groups = computed(() => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const sevenDaysStart = todayStart - 6 * 86400000

  const buckets = { today: [], yesterday: [], prev7: [], older: [] }
  for (const c of visibleConversations.value) {
    if (c.pinned) continue
    const ts = c.last_message_at || c.updated_at
    const tt = ts ? new Date(ts).getTime() : 0
    if (tt >= todayStart) buckets.today.push(c)
    else if (tt >= yesterdayStart) buckets.yesterday.push(c)
    else if (tt >= sevenDaysStart) buckets.prev7.push(c)
    else buckets.older.push(c)
  }

  return [
    [t('chat.groups.today'),         buckets.today],
    [t('chat.groups.yesterday'),     buckets.yesterday],
    [t('chat.groups.previous7Days'), buckets.prev7],
    [t('chat.groups.older'),         buckets.older],
  ]
})
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
  display: flex; align-items: center; gap: 10px;
  padding: 18px 16px 14px;
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
.rail .brand { padding: 18px 0 14px; justify-content: center; }
.rail .brand-mark { display: none; }
.rail .brand-name { display: none; }

.sidebar-toggle {
  appearance: none; background: transparent; border: 0;
  color: var(--fg-mute);
  width: 32px; height: 32px;
  border-radius: 7px;
  display: grid; place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color .12s, background .12s;
}
.sidebar-toggle:hover { color: var(--fg); background: rgba(255,255,255,0.06); }
.rail .sidebar-toggle { display: grid; margin: 0 auto; }

/* New chat */
.new-chat {
  appearance: none;
  display: flex; align-items: center; gap: 8px;
  margin: 0 10px 10px;
  padding: 9px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--fg);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background .12s, border-color .12s;
}
.new-chat:hover { background: rgba(255,255,255,0.07); border-color: var(--line-2); }
.new-chat .ic { display: grid; place-items: center; flex-shrink: 0; }
.new-chat .lbl { flex: 1; text-align: left; }
.new-chat kbd {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-mute);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  padding: 1px 5px;
  border-radius: 4px;
}
.rail .new-chat { margin: 0 10px 10px; padding: 9px; justify-content: center; }
.rail .new-chat .lbl, .rail .new-chat kbd { display: none; }

/* Quick link (Projects) */
.quick-link {
  display: flex; align-items: center; gap: 8px;
  margin: 0 10px 8px;
  padding: 7px 12px;
  border-radius: 7px;
  color: var(--fg-dim);
  text-decoration: none;
  font-size: 12.5px;
  transition: background .12s, color .12s;
}
.quick-link:hover { background: rgba(255,255,255,0.04); color: var(--fg); }
.quick-link .ic { display: grid; place-items: center; color: var(--fg-mute); flex-shrink: 0; }
.rail .quick-link { padding: 7px; justify-content: center; }
.rail .quick-link .lbl { display: none; }

/* Search */
.search-box {
  display: flex; align-items: center; gap: 8px;
  margin: 0 10px 8px;
  padding: 0 10px;
  height: 30px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--line);
  border-radius: 7px;
}
.search-box input {
  flex: 1; min-width: 0;
  background: transparent;
  border: 0; outline: 0;
  color: var(--fg);
  font-size: 12px;
}
.search-box input::placeholder { color: var(--fg-mute); }
.search-box > svg:first-child { color: var(--fg-mute); flex-shrink: 0; }
.search-clear {
  background: transparent; border: 0;
  color: var(--fg-mute);
  cursor: pointer;
  width: 16px; height: 16px;
  display: grid; place-items: center;
  border-radius: 4px;
}
.search-clear:hover { color: var(--fg); background: rgba(255,255,255,0.05); }

/* Search tabs */
.search-tabs {
  display: flex;
  gap: 2px;
  padding: 6px 6px 2px;
}
.search-tabs button {
  flex: 1;
  appearance: none;
  background: transparent;
  border: 0;
  color: var(--fg-mute);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 5px;
  transition: color .12s, background .12s;
  font-family: inherit;
}
.search-tabs button:hover { color: var(--fg); background: rgba(255,255,255,0.04); }
.search-tabs button.active {
  color: var(--fg);
  background: rgba(255,255,255,0.07);
}
.stab-count {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--fg-faint);
  background: rgba(255,255,255,0.05);
  padding: 0 4px;
  border-radius: 4px;
}

/* Message search results */
.msg-result {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 7px 10px;
  border-radius: 7px;
  cursor: pointer;
  transition: background .12s;
}
.msg-result:hover { background: rgba(255,255,255,0.04); }
.msg-result .convo-dot { margin-top: 5px; }
.msg-result-body {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 2px;
}
.msg-result-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--fg);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.msg-result-snippet {
  font-size: 11px;
  color: var(--fg-mute);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Convo list */
.convo-list {
  flex: 1; min-height: 0;
  overflow-y: auto;
  padding: 0 6px 8px;
  /* Hide scrollbar but keep scroll behaviour */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.convo-list::-webkit-scrollbar { display: none; }

.group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-faint);
  padding: 10px 10px 4px;
  display: flex; align-items: center; gap: 5px;
}
.group-toggle {
  width: 100%;
  appearance: none;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  color: var(--fg-faint);
}
.group-toggle:hover { color: var(--fg-mute); }

.convo-empty {
  color: var(--fg-faint);
  font-size: 12px;
  padding: 18px 10px;
  text-align: center;
}

/* Footer */
.sidebar-foot {
  padding: 10px;
  display: flex; align-items: stretch;
  border-top: 1px solid var(--line);
}
.sidebar-foot > * { width: 100%; }
.rail .sidebar-foot { justify-content: center; }

/* dot color per source */
:deep(.convo-dot) {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--fg-faint);
  flex-shrink: 0;
}
:deep(.convo-dot.pro) { background: #d8ff5b; }
:deep(.convo-dot.chat) { background: #6ab7ff; }

/* ── Tablet (≤ 1024px): narrower sidebar ─────────────── */
@media (max-width: 1024px) {
  .sidebar { width: 220px; }
}
</style>
