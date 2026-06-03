<template>
  <div class="qa-page">

    <!-- Page header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">QA Audit</h1>
        <p class="page-sub">
          Xem lại Q&amp;A của toàn bộ user.
          <span v-if="masked" class="masked-pill">PII đang được mask cho role của bạn</span>
        </p>
      </div>
      <div class="header-right">
        <DsInput v-model="filters.q" placeholder="Tìm trong câu hỏi/trả lời…" clearable style="width:240px" @keyup.enter="applyFilters">
          <template #prefix>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </template>
        </DsInput>

        <select v-model="filters.user_id" class="filter-select" @change="applyFilters">
          <option value="">Tất cả user</option>
          <option v-for="u in filterOpts.users" :key="u.id" :value="u.id">
            {{ u.username }} ({{ u.email }})
          </option>
        </select>

        <select v-model="filters.agent_id" class="filter-select" @change="applyFilters">
          <option value="">Tất cả agent</option>
          <option v-for="a in filterOpts.agents" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>

        <div class="filter-chip" :class="{ active: filters.flagged }" @click="filters.flagged = filters.flagged ? '' : '1'; applyFilters()">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          Flagged only
        </div>

        <div class="filter-chip" @click="exportData('csv')" title="Export filtered results to CSV">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </div>
        <div class="filter-chip" @click="exportData('json')" title="Export filtered results to JSON">JSON</div>

        <div v-if="isSuperAdmin" class="filter-chip" @click="openAccessLog" title="Nhật ký truy cập (ai xem/flag/export)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Nhật ký
        </div>
      </div>
    </div>

    <!-- Bulk action bar — appears when rows are selected -->
    <div v-if="selectedIds.size" class="bulk-bar">
      <span class="bulk-count">{{ selectedIds.size }} đã chọn</span>
      <select class="filter-select" :disabled="bulkBusy" @change="(e) => { if (e.target.value) { bulkFlag(e.target.value); e.target.value=''; } }">
        <option value="">Flag với lý do…</option>
        <option value="unsafe">unsafe</option>
        <option value="low_quality">low_quality</option>
        <option value="pii_leak">pii_leak</option>
        <option value="off_topic">off_topic</option>
        <option value="other">other</option>
      </select>
      <button class="bulk-btn" :disabled="bulkBusy" @click="bulkUnflag">Bỏ flag</button>
      <button class="bulk-btn ghost" :disabled="bulkBusy" @click="selectedIds = new Set()">Bỏ chọn</button>
    </div>

    <!-- Stats strip -->
    <div class="stats-strip">
      <div class="stat-item">
        <span class="stat-val">{{ statsData?.totals?.questions_total ?? '—' }}</span>
        <span class="stat-lbl">Questions ({{ statsData?.days || 7 }}d)</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-item">
        <span class="stat-val">{{ statsData?.totals?.conversations_total ?? '—' }}</span>
        <span class="stat-lbl">Conversations</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-item">
        <span class="stat-val">{{ statsData?.totals?.users_total ?? '—' }}</span>
        <span class="stat-lbl">Users</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-item">
        <span class="stat-val" :class="{ danger: (statsData?.totals?.flagged_total || 0) > 0 }">
          {{ statsData?.totals?.flagged_total ?? '—' }}
        </span>
        <span class="stat-lbl">Flagged</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-item agents">
        <span class="stat-lbl">Top agents:</span>
        <span v-for="a in (statsData?.top_agents || []).slice(0, 3)" :key="a.agent_slug" class="top-agent">
          {{ a.agent_name }} <b>{{ a.uses }}</b>
        </span>
      </div>
    </div>

    <!-- Split pane body -->
    <div class="body-pane">

      <!-- LEFT: list -->
      <div class="list-panel" :class="{ collapsed: !!selected }">
        <div class="table-head" :class="{ compact: !!selected }">
          <template v-if="!selected">
            <span class="th-check"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></span>
            <span class="th-sort" @click="toggleSort('created_at')">Time{{ sortIndicator('created_at') }}</span>
            <span class="th-sort" @click="toggleSort('user')">User{{ sortIndicator('user') }}</span>
            <span class="th-sort" @click="toggleSort('agent')">Agent{{ sortIndicator('agent') }}</span>
            <span>Question / Answer</span>
            <span class="th-sort" @click="toggleSort('flag')">Flag{{ sortIndicator('flag') }}</span>
            <span></span>
          </template>
          <template v-else>
            <span>Q&amp;A pairs</span>
            <span></span>
          </template>
        </div>

        <div v-if="loading" class="empty-state">
          <div class="empty-sub">Đang tải…</div>
        </div>
        <div v-else-if="!items.length" class="empty-state">
          <div class="empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <div class="empty-title">No Q&amp;A found</div>
          <div class="empty-sub">Thử bỏ filter hoặc mở rộng khoảng thời gian.</div>
        </div>

        <template v-else-if="selected">
          <div
            v-for="row in items"
            :key="row.user_message_id"
            class="compact-row"
            :class="{ selected: selected?.user_message_id === row.user_message_id, flagged: row.flagged }"
            @click="selectRow(row)"
          >
            <div class="compact-info">
              <div class="compact-name">{{ row.username || '—' }} · {{ row.agent_name || '—' }}</div>
              <div class="compact-q">{{ truncate(row.question, 60) }}</div>
            </div>
            <span v-if="row.flagged" class="status-badge flagged">
              <span class="badge-dot"></span>{{ row.flag_reason || 'flagged' }}
            </span>
          </div>
        </template>

        <template v-else>
          <div
            v-for="row in items"
            :key="row.user_message_id"
            class="table-row"
            :class="{ flagged: row.flagged, picked: selectedIds.has(row.user_message_id) }"
            @click="selectRow(row)"
          >
            <div class="cell-check" @click.stop>
              <input type="checkbox" :checked="selectedIds.has(row.user_message_id)" @change="(e) => toggleSelect(row.user_message_id, e)" />
            </div>
            <div class="cell-meta mono">{{ formatTime(row.asked_at) }}</div>
            <div class="cell-user">
              <div class="user-avatar">{{ initials(row.username) }}</div>
              <div class="user-info">
                <div class="user-name">{{ row.username || '—' }}</div>
                <div class="user-email">{{ row.email || '—' }}</div>
              </div>
            </div>
            <div class="cell-meta">{{ row.agent_name || '—' }}</div>
            <div class="cell-qa">
              <div class="qa-q"><span class="qa-tag">Q</span> {{ truncate(row.question, 120) }}</div>
              <div class="qa-a"><span class="qa-tag a">A</span> {{ truncate(row.answer || '(no response)', 120) }}</div>
            </div>
            <div>
              <!-- Quick-flag toggle right from the list -->
              <button class="quick-flag" :class="{ on: row.flagged }" @click="quickFlag(row, $event)"
                      :title="row.flagged ? 'Bỏ flag' : 'Flag nhanh'">
                <svg width="12" height="12" viewBox="0 0 24 24" :fill="row.flagged ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                <span v-if="row.flagged" class="qf-reason">{{ row.flag_reason || 'flagged' }}</span>
              </button>
            </div>
            <div class="cell-action">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>
        </template>

        <div v-if="items.length" class="table-footer">
          <span>{{ items.length }} of {{ total }} pair{{ total !== 1 ? 's' : '' }}</span>
          <div class="pager">
            <button :disabled="filters.page <= 1" @click="changePage(filters.page - 1)">‹</button>
            <span class="page-num">{{ filters.page }} / {{ totalPages }}</span>
            <button :disabled="filters.page >= totalPages" @click="changePage(filters.page + 1)">›</button>
          </div>
        </div>
      </div>

      <!-- RIGHT: detail -->
      <div v-if="selected" class="detail-panel">
        <QaAuditDetail
          :key="selected.user_message_id"
          :row="selected"
          @close="selected = null"
          @flagged="onFlagged"
        />
      </div>
    </div>

    <!-- Access-log drawer (super_admin) -->
    <div v-if="showAccessLog" class="al-overlay" @click.self="showAccessLog = false">
      <div class="al-drawer">
        <div class="al-head">
          <h3>Nhật ký truy cập</h3>
          <button class="al-close" @click="showAccessLog = false">✕</button>
        </div>
        <div v-if="accessLogLoading" class="empty-sub" style="padding:24px">Đang tải…</div>
        <div v-else class="al-list">
          <div v-for="l in accessLogItems" :key="l.id" class="al-row">
            <span class="al-action" :class="l.action">{{ l.action }}</span>
            <span class="al-admin">{{ l.admin_username || l.admin_id || '—' }} <em>({{ l.admin_role }})</em></span>
            <span class="al-time mono">{{ formatTime(l.created_at) }}</span>
            <span v-if="l.meta" class="al-meta mono">{{ JSON.stringify(l.meta) }}</span>
          </div>
          <div v-if="!accessLogItems.length" class="empty-sub" style="padding:24px">Chưa có log.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { apiFetch } = useApi()
const { show: showToast } = useToast()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const isSuperAdmin = computed(() => auth.isSuperAdmin)

const items = ref([])
const total = ref(0)
const loading = ref(true)
const selected = ref(null)
const masked = ref(false)
const statsData = ref(null)
const filterOpts = ref({ agents: [], users: [] })

// Bulk selection (Set of user_message_id) + quick-flag busy state.
const selectedIds = ref(new Set())
const bulkBusy = ref(false)

// Access-log drawer.
const showAccessLog = ref(false)
const accessLogItems = ref([])
const accessLogLoading = ref(false)

// Filters are seeded from the URL query so a reload / shared link restores them.
const filters = reactive({
  q: route.query.q || '',
  user_id: route.query.user_id || '',
  agent_id: route.query.agent_id || '',
  flagged: route.query.flagged || '',
  sort: route.query.sort || 'created_at',
  dir: route.query.dir || 'desc',
  page: parseInt(route.query.page, 10) || 1,
  limit: 25,
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / filters.limit)))

// Mirror the active filters into the URL (replace, no history spam).
function syncUrl() {
  const q = {}
  for (const k of ['q', 'user_id', 'agent_id', 'flagged', 'sort', 'dir']) {
    if (filters[k] !== '' && filters[k] != null) q[k] = String(filters[k])
  }
  if (filters.page > 1) q.page = String(filters.page)
  router.replace({ query: q })
}

function buildQs() {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v !== '' && v != null) qs.set(k, String(v))
  }
  return qs
}

async function load() {
  loading.value = true
  syncUrl()
  try {
    const r = await apiFetch(`/api/admin/qa-audit?${buildQs()}`, { _skipLoader: true })
    items.value = r.items || []
    total.value = r.total || 0
    masked.value = !!r.masked
    selectedIds.value = new Set()  // clear selection on reload
  } catch (e) {
    showToast(e?.data?.error || 'Failed to load audit log', 'error')
  } finally {
    loading.value = false
  }
}

async function loadAux() {
  try {
    const [s, fo] = await Promise.all([
      apiFetch('/api/admin/qa-audit/stats?days=7', { _skipLoader: true }),
      apiFetch('/api/admin/qa-audit/filter-options', { _skipLoader: true }),
    ])
    statsData.value = s
    filterOpts.value = fo
  } catch (e) {
    /* silent */
  }
}

function applyFilters() { filters.page = 1; load() }
function changePage(p)  { filters.page = p; load() }
function selectRow(r)   { selected.value = r }

// Click a sortable column header → toggle dir if same col, else default desc.
function toggleSort(col) {
  if (filters.sort === col) filters.dir = filters.dir === 'asc' ? 'desc' : 'asc'
  else { filters.sort = col; filters.dir = 'desc' }
  filters.page = 1
  load()
}
function sortIndicator(col) {
  if (filters.sort !== col) return ''
  return filters.dir === 'asc' ? ' ↑' : ' ↓'
}

// ── Bulk selection ──
function toggleSelect(id, ev) {
  ev?.stopPropagation()
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedIds.value = s
}
const allSelected = computed(() => items.value.length > 0 && items.value.every(r => selectedIds.value.has(r.user_message_id)))
function toggleSelectAll() {
  if (allSelected.value) selectedIds.value = new Set()
  else selectedIds.value = new Set(items.value.map(r => r.user_message_id))
}

async function bulkFlag(reason) {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  bulkBusy.value = true
  try {
    await apiFetch('/api/admin/qa-audit/bulk-flag', { method: 'POST', body: { message_ids: ids, reason }, _skipLoader: true })
    showToast(`Đã flag ${ids.length} mục`, 'success')
    load(); loadAux()
  } catch (e) {
    showToast(e?.data?.error || 'Bulk flag failed', 'error')
  } finally { bulkBusy.value = false }
}

async function bulkUnflag() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  bulkBusy.value = true
  try {
    await apiFetch('/api/admin/qa-audit/bulk-unflag', { method: 'POST', body: { message_ids: ids }, _skipLoader: true })
    showToast(`Đã bỏ flag ${ids.length} mục`, 'success')
    load(); loadAux()
  } catch (e) {
    showToast(e?.data?.error || 'Bulk unflag failed', 'error')
  } finally { bulkBusy.value = false }
}

// ── Quick-flag a single row from the list ──
async function quickFlag(row, ev) {
  ev?.stopPropagation()
  if (row.flagged) {
    await apiFetch(`/api/admin/qa-audit/${row.user_message_id}/flag`, { method: 'DELETE', _skipLoader: true }).catch(() => {})
    onFlagged({ user_message_id: row.user_message_id, flagged: false, flag_reason: null })
  } else {
    await apiFetch(`/api/admin/qa-audit/${row.user_message_id}/flag`, { method: 'POST', body: { reason: 'other' }, _skipLoader: true }).catch(() => {})
    onFlagged({ user_message_id: row.user_message_id, flagged: true, flag_reason: 'other' })
  }
  loadAux()
}

// ── Export ──
async function exportData(format) {
  const qs = buildQs()
  qs.delete('page'); qs.delete('limit')
  qs.set('format', format)
  try {
    // ofetch returns a string for text/csv and a parsed object for JSON.
    const data = await apiFetch(`/api/admin/qa-audit/export?${qs}`, { _skipLoader: true })
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    const blob = new Blob([text], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `qa-audit-export.${format}`; a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    showToast(e?.data?.error || 'Export failed', 'error')
  }
}

// ── Access log ──
async function openAccessLog() {
  showAccessLog.value = true
  accessLogLoading.value = true
  try {
    const r = await apiFetch('/api/admin/qa-audit/access-log?limit=100', { _skipLoader: true })
    accessLogItems.value = r.items || []
  } catch (e) {
    showToast(e?.data?.error || 'Failed to load access log', 'error')
  } finally { accessLogLoading.value = false }
}

function onFlagged(updated) {
  const i = items.value.findIndex(x => x.user_message_id === updated.user_message_id)
  if (i >= 0) items.value[i] = { ...items.value[i], ...updated }
  if (selected.value?.user_message_id === updated.user_message_id) {
    selected.value = { ...selected.value, ...updated }
  }
  loadAux()  // refresh flagged count
}

function truncate(s, n) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}
function formatTime(d) {
  if (!d) return '—'
  const date = new Date(d)
  const now = Date.now()
  const diff = (now - date.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function initials(s) {
  if (!s) return '?'
  return s.slice(0, 2).toUpperCase()
}

onMounted(() => { load(); loadAux() })
</script>

<style scoped>
.qa-page {
  display: flex; flex-direction: column; min-height: 0; flex: 1;
  background: var(--bg);
}

/* ── Page header ── */
.page-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 20px;
  padding: 24px 28px 18px;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--line);
}
.page-title {
  font-size: 22px; font-weight: 800;
  letter-spacing: -0.02em; margin: 0 0 3px;
  background: linear-gradient(135deg, var(--fg) 0%, var(--accent) 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.page-sub { font-size: 12px; color: var(--fg-mute); margin: 0; }
.masked-pill {
  display: inline-block; margin-left: 8px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
  background: color-mix(in oklab, var(--warn, #f59e0b) 12%, transparent);
  color: var(--warn, #f59e0b);
  padding: 2px 8px; border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--warn, #f59e0b) 25%, transparent);
}
.header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.filter-select {
  height: 32px;
  background: var(--line); border: 1px solid var(--line-2);
  color: var(--fg);
  border-radius: 8px; padding: 0 8px;
  font-size: 11px; font-weight: 600;
  cursor: pointer;
}
.filter-select:focus { outline: 1px solid var(--accent); }

.filter-chip {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 10px;
  background: var(--line); border: 1px solid var(--line-2);
  border-radius: 8px;
  font-size: 11px; font-weight: 600;
  color: var(--fg-mute);
  cursor: pointer; white-space: nowrap; user-select: none;
  transition: border-color .12s, background .12s, color .12s;
}
.filter-chip:hover { border-color: color-mix(in oklab, var(--accent) 30%, transparent); color: var(--fg); }
.filter-chip.active {
  border-color: color-mix(in oklab, var(--accent) 35%, transparent);
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  color: var(--accent); font-weight: 700;
}

/* ── Stats strip ── */
.stats-strip {
  display: flex; align-items: center;
  padding: 10px 28px;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--line);
}
.stat-item { display: flex; align-items: baseline; gap: 7px; padding: 0 16px 0 0; }
.stat-item:first-child { padding-left: 0; }
.stat-val { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: var(--fg); }
.stat-val.danger { color: var(--danger); }
.stat-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg-mute); }
.stat-sep { width: 1px; height: 24px; background: var(--line-2); margin: 0 16px; }
.stat-item.agents { gap: 10px; }
.top-agent {
  font-size: 11px; color: var(--fg-dim);
  background: var(--line); padding: 2px 8px; border-radius: 999px;
}
.top-agent b { color: var(--accent); font-weight: 700; margin-left: 3px; }

/* ── Body split pane ── */
.body-pane {
  display: flex; flex: 1;
  min-height: 0;
  padding: 16px 20px;
  align-items: flex-start;
}

/* ── List panel ── */
.list-panel {
  flex: 1; min-width: 0;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-3xl);
  overflow: hidden;
  box-shadow: var(--shadow-island);
  transition: all .3s var(--spring);
}
.list-panel.collapsed {
  flex: 0 0 360px;
  margin-right: 14px;
}

.table-head {
  display: grid;
  grid-template-columns: 32px 90px 180px 120px 1fr 120px 36px;
  gap: 12px;
  padding: 10px 16px;
  background: var(--line);
  border-bottom: 1px solid var(--line);
  font-size: 10px; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--fg-mute);
}
.table-head.compact { grid-template-columns: 1fr 0px; padding: 10px 14px; }

.table-row {
  display: grid;
  grid-template-columns: 32px 90px 180px 120px 1fr 120px 36px;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  cursor: pointer; position: relative;
  transition: background .1s;
}
.table-row::before {
  content: ""; position: absolute;
  left: 0; top: 20%; bottom: 20%;
  width: 2px; border-radius: 0 2px 2px 0;
  background: var(--accent); opacity: 0;
  transition: opacity .15s;
}
.table-row:hover { background: var(--line); }
.table-row:hover::before { opacity: 0.5; }
.table-row.flagged::before { background: var(--danger); opacity: 1; }
.table-row:last-child { border-bottom: 0; }

.cell-meta { font-size: 11px; color: var(--fg-mute); }
.cell-meta.mono { font-family: var(--font-mono); }
.cell-action { display: grid; place-items: center; color: var(--fg-faint); transition: color .12s, transform .12s; }
.table-row:hover .cell-action { color: var(--accent); transform: translateX(2px); }

.cell-user { display: flex; align-items: center; gap: 10px; min-width: 0; }
.user-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #3b3b42, #1c1c22);
  color: var(--fg);
  display: grid; place-items: center;
  font-size: 10px; font-weight: 800;
}
.user-info { min-width: 0; }
.user-name { font-size: 12px; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-email { font-size: 10px; color: var(--fg-mute); font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.cell-qa { display: flex; flex-direction: column; gap: 4px; min-width: 0; font-size: 11.5px; line-height: 1.5; }
.qa-q, .qa-a {
  display: flex; align-items: flex-start; gap: 6px;
  color: var(--fg-dim);
  overflow: hidden;
}
.qa-a { color: var(--fg-mute); }
.qa-tag {
  flex-shrink: 0;
  display: inline-grid; place-items: center;
  width: 16px; height: 16px; border-radius: 4px;
  font-size: 9px; font-weight: 800;
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  color: var(--accent);
}
.qa-tag.a {
  background: color-mix(in oklab, var(--info, #38bdf8) 12%, transparent);
  color: var(--info, #38bdf8);
}

.compact-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  cursor: pointer; position: relative;
  transition: background .1s;
}
.compact-row::before {
  content: ""; position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px; border-radius: 0 2px 2px 0;
  background: var(--accent); opacity: 0;
  transition: opacity .15s;
}
.compact-row:hover { background: var(--line); }
.compact-row.selected { background: color-mix(in oklab, var(--accent) 5%, transparent); }
.compact-row.selected::before { opacity: 1; }
.compact-row.flagged::before { background: var(--danger); opacity: 1; }
.compact-row:last-child { border-bottom: 0; }
.compact-info { flex: 1; min-width: 0; }
.compact-name { font-size: 11.5px; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.compact-q { font-size: 11px; color: var(--fg-mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

.table-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--line);
  background: var(--line);
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--fg-mute);
}
.pager { display: flex; align-items: center; gap: 8px; }
.pager button {
  appearance: none;
  background: var(--bg-elev); border: 1px solid var(--line-2);
  color: var(--fg);
  width: 24px; height: 22px; border-radius: 4px;
  font-size: 13px; cursor: pointer;
}
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.pager button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.page-num { font-family: var(--font-mono); color: var(--fg-dim); }

.status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  background: var(--line); color: var(--fg-mute);
  border: 1px solid var(--line-2);
}
.status-badge.flagged {
  background: color-mix(in oklab, var(--danger) 10%, transparent);
  color: var(--danger);
  border-color: color-mix(in oklab, var(--danger) 25%, transparent);
}
.badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 48px 20px; gap: 8px;
}
.empty-icon {
  width: 44px; height: 44px; border-radius: 10px;
  border: 1px dashed var(--line-2);
  display: grid; place-items: center;
  color: var(--fg-faint); margin-bottom: 4px;
}
.empty-title { font-size: 11px; font-weight: 800; color: var(--fg-mute); }
.empty-sub { font-size: 11px; color: var(--fg-faint); text-align: center; }

/* ── Detail panel ── */
.detail-panel {
  flex: 1; min-width: 0; min-height: 500px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-3xl);
  overflow: hidden;
  box-shadow: var(--shadow-island);
  display: flex; flex-direction: column;
  align-self: stretch;
  max-height: calc(100vh - 200px);
}

/* ── Bulk action bar ── */
.bulk-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 28px;
  background: color-mix(in oklab, var(--accent) 8%, var(--bg-elev));
  border-bottom: 1px solid var(--line);
}
.bulk-count { font-size: 12px; font-weight: 700; color: var(--accent); }
.bulk-btn {
  height: 30px; padding: 0 12px;
  background: var(--bg-elev); border: 1px solid var(--line-2); color: var(--fg);
  border-radius: 7px; font-size: 11px; font-weight: 600; cursor: pointer;
}
.bulk-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.bulk-btn.ghost { color: var(--fg-mute); }
.bulk-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── Sort headers + checkbox column ── */
.th-sort { cursor: pointer; user-select: none; }
.th-sort:hover { color: var(--fg); }
.th-check, .cell-check { display: grid; place-items: center; }
.cell-check input, .th-check input { cursor: pointer; }
.table-row.picked { background: color-mix(in oklab, var(--accent) 6%, transparent); }

/* ── Quick-flag button ── */
.quick-flag {
  display: inline-flex; align-items: center; gap: 5px;
  background: transparent; border: 1px solid var(--line-2);
  color: var(--fg-faint); border-radius: 999px;
  padding: 3px 8px; cursor: pointer; font-size: 9px;
  font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
  transition: border-color .12s, color .12s;
}
.quick-flag:hover { border-color: color-mix(in oklab, var(--danger) 40%, transparent); color: var(--danger); }
.quick-flag.on {
  border-color: color-mix(in oklab, var(--danger) 30%, transparent);
  background: color-mix(in oklab, var(--danger) 10%, transparent);
  color: var(--danger);
}
.qf-reason { font-size: 9px; }

/* ── Access-log drawer ── */
.al-overlay {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,0.5);
  display: flex; justify-content: flex-end;
}
.al-drawer {
  width: 100%; max-width: 560px; height: 100%;
  background: var(--bg-elev); border-left: 1px solid var(--line-2);
  display: flex; flex-direction: column;
  box-shadow: -8px 0 32px rgba(0,0,0,0.4);
  animation: detail-pop-in .22s cubic-bezier(.4,0,.2,1);
}
.al-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid var(--line);
}
.al-head h3 { margin: 0; font-size: 14px; font-weight: 800; }
.al-close { background: none; border: 0; color: var(--fg-mute); font-size: 16px; cursor: pointer; }
.al-list { overflow-y: auto; padding: 8px 0; }
.al-row {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 18px; border-bottom: 1px solid var(--line);
  font-size: 11px;
}
.al-action {
  font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  background: var(--line); color: var(--fg-dim);
}
.al-action.reveal, .al-action.export { background: color-mix(in oklab, var(--warn,#f59e0b) 14%, transparent); color: var(--warn,#f59e0b); }
.al-action.bulk_flag, .al-action.flag { background: color-mix(in oklab, var(--danger) 12%, transparent); color: var(--danger); }
.al-admin { color: var(--fg); font-weight: 600; }
.al-admin em { color: var(--fg-mute); font-weight: 400; }
.al-time { color: var(--fg-mute); margin-left: auto; }
.al-meta { width: 100%; color: var(--fg-faint); font-size: 10px; word-break: break-all; }
.mono { font-family: var(--font-mono); }

/* ── Tablet (≤1024px) ── */
@media (max-width: 1024px) {
  .qa-page { font-size: 13px; }
  .page-header { padding: 16px 18px 14px; flex-wrap: wrap; gap: 10px; }
  .header-right { flex-wrap: wrap; gap: 6px; }
  .stats-strip { padding: 8px 18px; overflow-x: auto; flex-wrap: nowrap; gap: 0; }
  .stat-sep { flex-shrink: 0; }
  .body-pane { padding: 12px 14px; gap: 12px; }
  .list-panel,
  .list-panel.collapsed { flex: 1; margin-right: 0; }
  .table-head:not(.compact) { grid-template-columns: 32px 1fr 90px 60px 36px; gap: 10px; }
  .table-row                { grid-template-columns: 32px 1fr 90px 60px 36px; gap: 10px; }
  /* hide Time(2), User(3), Agent(4) — keep checkbox(1), Q&A(5), flag(6), action(7) */
  .table-head > *:nth-child(2),
  .table-row  > *:nth-child(2),
  .table-head > *:nth-child(3),
  .table-row  > *:nth-child(3),
  .table-head > *:nth-child(4),
  .table-row  > *:nth-child(4) { display: none; }

  .detail-panel {
    position: fixed;
    inset: 0 0 0 auto;
    z-index: 40;
    width: 100% !important;
    max-width: 720px !important;
    min-height: 100vh;
    max-height: none;
    margin: 0;
    border-radius: 0;
    border: 0;
    border-left: 1px solid var(--line);
    background: var(--bg);
    box-shadow: -8px 0 32px rgba(0,0,0,0.4);
    overflow-y: auto;
    animation: detail-pop-in .22s cubic-bezier(.4,0,.2,1);
  }
  .body-pane:has(.detail-panel)::before {
    content: "";
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 39;
    animation: backdrop-fade .2s ease;
  }
  @keyframes detail-pop-in {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes backdrop-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
}

/* ── Mobile (≤768px) ── */
@media (max-width: 768px) {
  .qa-page { font-size: 13px; }
  .page-header {
    padding: 14px 16px 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .page-title { font-size: 18px; }
  .page-sub { font-size: 11.5px; }
  .header-right {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .header-right > :deep(.ds-input),
  .header-right > :deep(.ds-input-wrap) { flex: 1 1 100%; width: 100% !important; min-width: 0; }
  .header-right :deep(input),
  .header-right :deep(select) { width: 100% !important; }
  .header-right > :deep(.ds-select) { flex: 1 1 calc(50% - 3px); min-width: 0; }
  .filter-chip { height: 30px; }

  .stats-strip {
    padding: 8px 14px;
    overflow-x: auto;
    flex-wrap: nowrap;
    gap: 0;
    -webkit-overflow-scrolling: touch;
  }
  .stat-val { font-size: 16px; }
  .stat-item { padding: 0 12px 0 0; }
  .stat-sep { margin: 0 12px; flex-shrink: 0; }

  .body-pane {
    padding: 10px;
    flex-direction: column;
    gap: 10px;
    overflow: visible;
  }

  .list-panel,
  .list-panel.collapsed {
    flex: none;
    width: 100%;
    max-height: none;
    margin: 0;
    border-radius: 10px;
  }

  /* Mobile: fullscreen popup */
  .detail-panel {
    position: fixed;
    inset: 0;
    z-index: 40;
    width: 100% !important;
    max-width: 100% !important;
    min-height: 100vh;
    max-height: none;
    margin: 0;
    border-radius: 0;
    border: 0;
    padding: 0;
    background: var(--bg);
    box-shadow: none;
    overflow-y: auto;
    animation: detail-pop-in-mobile .22s cubic-bezier(.4,0,.2,1);
  }
  @keyframes detail-pop-in-mobile {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .table-head { display: none !important; }
  .table-row {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch;
    text-align: left;
    gap: 6px;
    padding: 12px 14px;
    position: relative;
    min-height: 56px;
    grid-template-columns: none !important;
  }
  .table-row > * {
    display: block !important;
    width: auto;
    text-align: left;
  }
  .table-row > *:first-child { font-weight: 600; font-size: 13px; padding-right: 32px; }
  .table-row > *:not(:first-child):not(:last-child) {
    font-size: 11.5px;
    color: var(--fg-mute);
  }
  .table-row > *:last-child {
    position: absolute;
    top: 14px; right: 12px;
    display: grid !important;
    place-items: center;
  }

  .detail-panel :deep(.meta-grid) { grid-template-columns: 1fr !important; }
  .detail-panel :deep(.reason-grid) { grid-template-columns: 1fr !important; }
}

/* ── Small mobile (≤480px) ── */
@media (max-width: 480px) {
  .page-header { padding: 12px 12px 10px; }
  .page-title { font-size: 16px; }
  .body-pane { padding: 8px; gap: 8px; }
  .list-panel, .list-panel.collapsed { border-radius: 8px; }
  .detail-panel { border-radius: 8px; }
  .stats-strip { padding: 6px 12px; }
  .header-right > :deep(.ds-select) { flex: 1 1 100%; }
}
</style>
