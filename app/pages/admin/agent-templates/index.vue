<template>
  <div class="agent-page">

    <!-- Page header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Agent Templates</h1>
        <p class="page-sub">Mỗi template = persona + danh sách rule áp dụng trước khi câu hỏi gửi tới AI.</p>
      </div>
      <div class="header-right">
        <DsInput v-model="search" placeholder="Tìm template…" clearable style="width:200px">
          <template #prefix>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </template>
        </DsInput>

        <div class="filter-chip" :class="{ active: filterCategory }" @click="cycleCategory">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          {{ filterCategory || 'Category' }}
          <button v-if="filterCategory" class="chip-clear" @click.stop="filterCategory = ''">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="filter-chip" :class="{ active: includeInactive }" @click="includeInactive = !includeInactive">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {{ includeInactive ? 'Hiện cả đã xoá' : 'Chỉ active' }}
        </div>

        <DsButton variant="primary" @click="onCreate">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          New Template
        </DsButton>
      </div>
    </div>

    <!-- Stats strip -->
    <div class="stats-strip">
      <div class="stat-item">
        <span class="stat-val">{{ items.length }}</span>
        <span class="stat-lbl">Total</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-item">
        <span class="stat-val emerald">{{ items.filter(t => t.is_active).length }}</span>
        <span class="stat-lbl">Active</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-item">
        <span class="stat-val muted">{{ items.filter(t => t.is_default).length }}</span>
        <span class="stat-lbl">Default</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-item">
        <span class="stat-val">{{ totalUsage }}</span>
        <span class="stat-lbl">Uses</span>
      </div>
    </div>

    <!-- Split pane body -->
    <div class="body-pane">

      <!-- LEFT: list -->
      <div class="list-panel" :class="{ collapsed: !!selected }">

        <div class="table-head" :class="{ compact: !!selected }">
          <template v-if="!selected">
            <span>Name</span>
            <span>Slug</span>
            <span>Category</span>
            <span>Visibility</span>
            <span>Uses</span>
            <span></span>
          </template>
          <template v-else>
            <span>Templates</span>
            <span></span>
          </template>
        </div>

        <div v-if="loading" class="empty-state">
          <div class="empty-sub">Đang tải…</div>
        </div>

        <div v-else-if="!filtered.length" class="empty-state">
          <div class="empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="5"/><path d="m14 14 7 7M14 9h7M17.5 5.5v7"/></svg>
          </div>
          <div class="empty-title">No templates found</div>
          <div class="empty-sub">{{ search || filterCategory ? 'Thử xoá filter.' : 'Tạo template đầu tiên để bắt đầu.' }}</div>
        </div>

        <template v-else-if="selected">
          <div
            v-for="t in filtered"
            :key="t.id"
            class="compact-row"
            :class="{ selected: selected?.id === t.id, inactive: !t.is_active }"
            @click="selectTemplate(t)"
          >
            <div class="compact-avatar" v-html="iconSvg(t.icon)"></div>
            <div class="compact-info">
              <div class="compact-name">{{ t.name }}</div>
              <div class="compact-meta">{{ t.slug }}</div>
            </div>
            <span v-if="t.is_default" class="status-badge default">
              <span class="badge-dot"></span>default
            </span>
          </div>
        </template>

        <template v-else>
          <div
            v-for="t in filtered"
            :key="t.id"
            class="table-row"
            :class="{ inactive: !t.is_active }"
            @click="selectTemplate(t)"
          >
            <div class="cell-name-with-icon">
              <span class="row-icon" v-html="iconSvg(t.icon)"></span>
              <div class="cell-name-block">
                <span class="cell-name">{{ t.name }}</span>
                <span v-if="!t.is_active" class="status-badge inactive">inactive</span>
                <span v-if="t.is_default" class="status-badge default"><span class="badge-dot"></span>default</span>
              </div>
            </div>
            <div class="cell-mono">{{ t.slug }}</div>
            <div class="cell-meta">{{ t.category }}</div>
            <div>
              <span class="status-badge" :class="`vis-${t.visibility}`">{{ t.visibility }}</span>
            </div>
            <div class="cell-meta mono">{{ t.usage_count }}</div>
            <div class="cell-action">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>
        </template>

        <div v-if="filtered.length" class="table-footer">
          <span>{{ filtered.length }} template{{ filtered.length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- RIGHT: detail / editor -->
      <div v-if="selected" class="detail-panel">
        <AgentTemplateEditor
          :key="selected.id || 'new'"
          :template-id="selected.id || null"
          :is-new="!selected.id"
          @saved="onSaved"
          @deleted="onDeleted"
          @close="selected = null"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const { apiFetch } = useApi()
const { show: showToast } = useToast()

const items = ref([])
const loading = ref(true)
const selected = ref(null)
const search = ref('')
const filterCategory = ref('')
const includeInactive = ref(false)

const CATEGORIES = ['general', 'document', 'writing', 'coding']

const filtered = computed(() => {
  let list = items.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.slug?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    )
  }
  if (filterCategory.value) list = list.filter(t => t.category === filterCategory.value)
  return list
})

const totalUsage = computed(() => items.value.reduce((s, t) => s + (t.usage_count || 0), 0))

function cycleCategory() {
  const i = CATEGORIES.indexOf(filterCategory.value)
  filterCategory.value = i < 0 ? CATEGORIES[0] : (i === CATEGORIES.length - 1 ? '' : CATEGORIES[i + 1])
}

async function load(preserveSelected = false) {
  loading.value = true
  try {
    const qs = new URLSearchParams()
    if (includeInactive.value) qs.set('include_inactive', '1')
    const url = `/api/admin/agent-templates${qs.toString() ? '?' + qs : ''}`
    const r = await apiFetch(url, { _skipLoader: true })
    items.value = r.items || []
    if (preserveSelected && selected.value?.id) {
      const fresh = items.value.find(t => t.id === selected.value.id)
      if (fresh) selected.value = fresh
    }
  } catch (e) {
    showToast(e?.data?.error || 'Failed to load templates', 'error')
  } finally {
    loading.value = false
  }
}

function selectTemplate(t) { selected.value = t }
function onCreate()        { selected.value = { id: null } }
async function onSaved({ id }) {
  await load()
  const fresh = items.value.find(t => t.id === id)
  if (fresh) selected.value = fresh
}
async function onDeleted() {
  selected.value = null
  await load()
}

watch(includeInactive, () => load())

// Lucide-style icons inline (no icon library dependency)
const ICONS = {
  sparkles:    '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  'pen-tool':  '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
  code:        '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  bot:         '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/>',
}
function iconSvg(name) {
  const body = ICONS[name] || ICONS.bot
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
}

onMounted(() => load())
</script>

<style scoped>
.agent-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  background: var(--bg);
}

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 28px 18px;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--line);
}
.page-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 3px;
  background: linear-gradient(135deg, var(--fg) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.page-sub { font-size: 12px; color: var(--fg-mute); margin: 0; }
.header-right { display: flex; align-items: center; gap: 8px; }

.filter-chip {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 10px;
  background: var(--line);
  border: 1px solid var(--line-2);
  border-radius: 8px;
  font-size: 11px; font-weight: 600;
  color: var(--fg-mute);
  cursor: pointer; white-space: nowrap; user-select: none;
  transition: border-color .12s, background .12s, color .12s;
}
.filter-chip:hover { border-color: color-mix(in oklab, var(--accent) 30%, transparent); background: color-mix(in oklab, var(--accent) 4%, transparent); color: var(--fg); }
.filter-chip.active {
  border-color: color-mix(in oklab, var(--accent) 35%, transparent);
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  color: var(--accent); font-weight: 700;
}
.chip-clear {
  background: transparent; border: 0; color: var(--accent);
  cursor: pointer; padding: 0;
  display: grid; place-items: center;
  opacity: 0.6; transition: opacity .12s; flex-shrink: 0;
}
.chip-clear:hover { opacity: 1; }

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
.stat-val.emerald { color: var(--ok); }
.stat-val.muted { color: var(--fg-faint); }
.stat-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg-mute); }
.stat-sep { width: 1px; height: 24px; background: var(--line-2); margin: 0 16px; }

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
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  transition: all .3s cubic-bezier(.4,0,.2,1);
}
.list-panel.collapsed {
  flex: 0 0 320px;
  margin-right: 14px;
}

.table-head {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 1fr 0.6fr 36px;
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
  grid-template-columns: 2fr 1.2fr 1fr 1fr 0.6fr 36px;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  position: relative;
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
.table-row.inactive { opacity: 0.55; }
.table-row:last-child { border-bottom: 0; }

.cell-name-with-icon { display: flex; align-items: center; gap: 10px; min-width: 0; }
.row-icon {
  width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  display: grid; place-items: center;
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  color: var(--accent);
}
.cell-name-block { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.cell-name { font-size: 12px; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-mono { font-family: var(--font-mono); font-size: 11px; color: var(--fg-mute); }
.cell-meta { font-size: 11px; color: var(--fg-mute); }
.cell-meta.mono { font-family: var(--font-mono); }
.cell-action { display: grid; place-items: center; color: var(--fg-faint); transition: color .12s, transform .12s; }
.table-row:hover .cell-action { color: var(--accent); transform: translateX(2px); }

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
.compact-row.inactive { opacity: 0.55; }
.compact-row:last-child { border-bottom: 0; }

.compact-avatar {
  width: 30px; height: 30px; border-radius: 8px;
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  color: var(--accent);
  display: grid; place-items: center;
  flex-shrink: 0;
}
.compact-info { flex: 1; min-width: 0; }
.compact-name { font-size: 12px; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.compact-meta { font-size: 10px; font-family: var(--font-mono); color: var(--fg-mute); }

.table-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--line);
  background: var(--line);
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--fg-mute);
}

.status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  background: var(--line); color: var(--fg-mute);
  border: 1px solid var(--line-2);
}
.status-badge.default {
  background: color-mix(in oklab, var(--ok) 10%, transparent);
  color: var(--ok);
  border-color: color-mix(in oklab, var(--ok) 25%, transparent);
}
.status-badge.inactive {
  background: color-mix(in oklab, var(--danger) 8%, transparent);
  color: var(--danger);
  border-color: color-mix(in oklab, var(--danger) 25%, transparent);
}
.status-badge.vis-global {
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  color: var(--accent);
  border-color: color-mix(in oklab, var(--accent) 25%, transparent);
}
.status-badge.vis-org { background: var(--line); color: var(--fg-mute); }
.status-badge.vis-private { background: var(--line); color: var(--fg-faint); }
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
  flex: 1;
  min-width: 0;
  min-height: 500px;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  display: flex; flex-direction: column;
  align-self: stretch;
  max-height: calc(100vh - 180px);
}

.panel-enter-active { transition: opacity .25s ease, transform .25s cubic-bezier(.4,0,.2,1); }
.panel-leave-active { transition: opacity .18s ease, transform .18s ease; }
.panel-enter-from { opacity: 0; transform: translateX(12px); }
.panel-leave-to { opacity: 0; transform: translateX(8px); }

/* ── Tablet (≤1024px) ── */
@media (max-width: 1024px) {
  .agent-page { font-size: 13px; }
  .page-header { padding: 16px 18px 14px; flex-wrap: wrap; gap: 10px; }
  .header-right { flex-wrap: wrap; gap: 6px; }
  .stats-strip { padding: 8px 18px; overflow-x: auto; flex-wrap: nowrap; gap: 0; }
  .stat-sep { flex-shrink: 0; }
  .body-pane { padding: 12px 14px; gap: 12px; }
  /* List stays full width — detail becomes popup */
  .list-panel,
  .list-panel.collapsed { flex: 1; margin-right: 0; }
  .table-head { grid-template-columns: 1fr 100px 36px; gap: 10px; }
  .table-row  { grid-template-columns: 1fr 100px 36px; gap: 10px; }
  .table-head > *:nth-child(n+3):not(:last-child),
  .table-row  > *:nth-child(n+3):not(:last-child) { display: none; }

  /* Detail panel as popup overlay */
  .detail-panel {
    position: fixed;
    inset: 0 0 0 auto;
    z-index: 40;
    width: 100% !important;
    max-width: 720px !important;
    min-height: 100vh;
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
  .agent-page { font-size: 13px; }
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
  .header-right :deep(input) { width: 100% !important; }
  .filter-chip { height: 30px; }
  .header-right > :deep(.ds-button) { margin-left: auto; }

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
    align-items: stretch;
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

  /* Table → list of cards */
  .table-head { display: none !important; }
  .table-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    text-align: left;
    gap: 10px;
    padding: 12px 14px;
    position: relative;
    min-height: 56px;
  }
  .table-row > * { width: auto; }
  .cell-name-with-icon { flex: 1; min-width: 0; }
  .cell-name { white-space: normal; font-size: 13px; }
  .cell-name-block { gap: 4px; }
  .table-row .cell-mono,
  .table-row .cell-meta:not(.cell-action) { display: none; }
  .table-row > div:nth-child(4) { /* visibility badge */
    display: block;
    flex-shrink: 0;
  }
  .cell-action { flex-shrink: 0; margin-left: auto; }

  .compact-row { padding: 10px 12px; }
  .ed-grid-2 { grid-template-columns: 1fr !important; }
  .reason-grid { grid-template-columns: 1fr !important; }
}

/* ── Small mobile (≤480px) ── */
@media (max-width: 480px) {
  .page-header { padding: 12px 12px 10px; }
  .page-title { font-size: 16px; }
  .body-pane { padding: 8px; gap: 8px; }
  .list-panel, .list-panel.collapsed { border-radius: 8px; }
  .detail-panel { border-radius: 8px; }
  .table-row > div:nth-child(4) { display: none; } /* hide visibility on tiny */
  .stats-strip { padding: 6px 12px; }
}
</style>
