<template>
  <div class="token-page">

    <!-- Page header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">API Tokens</h1>
        <p class="page-sub">Manage access tokens for external integrations.</p>
      </div>
      <div class="header-right">
        <DsInput v-model="search" placeholder="Search tokens…" clearable style="width:200px">
          <template #prefix>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </template>
        </DsInput>

        <div class="filter-chip" :class="{ active: filterStatus }" @click="cycleStatus">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 12h.01M12 3v.01M21 12h-.01M12 21v-.01"/></svg>
          {{ filterStatus ? filterStatus : 'Status' }}
          <button v-if="filterStatus" class="chip-clear" @click.stop="filterStatus = ''">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <DsButton v-if="can('api_tokens', 'create')" variant="primary" @click="showCreate = true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          New Token
        </DsButton>
      </div>
    </div>

    <!-- Stats strip -->
    <div class="stats-strip">
      <div class="stat-item">
        <span class="stat-val">{{ tokens.length }}</span>
        <span class="stat-lbl">Total</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-item">
        <span class="stat-val emerald">{{ tokens.filter(t => t.is_active).length }}</span>
        <span class="stat-lbl">Active</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-item">
        <span class="stat-val muted">{{ tokens.filter(t => !t.is_active).length }}</span>
        <span class="stat-lbl">Revoked</span>
      </div>
    </div>

    <!-- Split pane body -->
    <div class="body-pane">

      <!-- LEFT: token list -->
      <div class="list-panel" :class="{ collapsed: !!selectedToken }">

        <div class="table-head" :class="{ compact: !!selectedToken }">
          <template v-if="!selectedToken">
            <span>Name</span>
            <span>Prefix</span>
            <span>Expires</span>
            <span>Last used</span>
            <span>Status</span>
            <span></span>
          </template>
          <template v-else>
            <span>Token</span>
            <span></span>
          </template>
        </div>

        <div v-if="!filteredTokens.length" class="empty-state">
          <div class="empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="5"/><path d="m14 14 7 7M14 9h7M17.5 5.5v7"/></svg>
          </div>
          <div class="empty-title">No tokens found</div>
          <div class="empty-sub">{{ search || filterStatus ? 'Try clearing filters.' : 'Create your first token to use the API.' }}</div>
        </div>

        <template v-else-if="selectedToken">
          <div
            v-for="token in filteredTokens"
            :key="token.id"
            class="compact-row"
            :class="{ selected: selectedToken?.id === token.id }"
            @click="selectToken(token)"
          >
            <div class="compact-avatar">{{ token.name.slice(0, 2).toUpperCase() }}</div>
            <div class="compact-info">
              <div class="compact-name">{{ token.name }}</div>
              <div class="compact-meta">{{ token.prefix || 'nk_live_…' }}</div>
            </div>
            <span class="status-badge" :class="token.is_active ? 'active' : 'revoked'">
              <span class="badge-dot"></span>
              {{ token.is_active ? 'active' : 'revoked' }}
            </span>
          </div>
        </template>

        <template v-else>
          <div
            v-for="token in filteredTokens"
            :key="token.id"
            class="table-row"
            :class="{ selected: selectedToken?.id === token.id }"
            @click="selectToken(token)"
          >
            <div class="cell-name">{{ token.name }}</div>
            <div class="cell-mono">{{ token.prefix || 'nk_live_…' }}</div>
            <div class="cell-meta">{{ token.expires_at ? formatDate(token.expires_at) : 'Never' }}</div>
            <div class="cell-meta">{{ token.last_used_at ? formatDate(token.last_used_at) : '—' }}</div>
            <div>
              <span class="status-badge" :class="token.is_active ? 'active' : 'revoked'">
                <span class="badge-dot"></span>
                {{ token.is_active ? 'active' : 'revoked' }}
              </span>
            </div>
            <div class="cell-action">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>
        </template>

        <div v-if="filteredTokens.length" class="table-footer">
          <span>{{ filteredTokens.length }} token{{ filteredTokens.length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- RIGHT: detail panel -->
      <transition name="panel">
        <div v-if="selectedToken" class="detail-panel">

          <div class="detail-head">
            <div class="detail-avatar">{{ selectedToken.name.slice(0, 2).toUpperCase() }}</div>
            <div class="detail-title-block">
              <div class="detail-name">{{ selectedToken.name }}</div>
              <div class="detail-prefix">{{ selectedToken.prefix || 'nk_live_…' }}</div>
            </div>
            <span class="status-badge lg" :class="selectedToken.is_active ? 'active' : 'revoked'">
              <span class="badge-dot"></span>
              {{ selectedToken.is_active ? 'active' : 'revoked' }}
            </span>
            <button class="close-btn" @click="selectedToken = null" title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="detail-meta">
            <div class="meta-row">
              <span class="meta-key">Token</span>
              <div class="meta-token-row">
                <span class="meta-val token-truncate">{{ selectedToken.token || '—' }}</span>
                <button class="token-copy-btn" @click="copyToken" :class="{ copied: prefixCopied }" title="Copy token">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
                  {{ prefixCopied ? 'Copied!' : 'Copy' }}
                </button>
              </div>
            </div>
            <div class="meta-row">
              <span class="meta-key">Created</span>
              <span class="meta-val">{{ selectedToken.created_at ? formatDate(selectedToken.created_at) : '—' }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">Expires</span>
              <span class="meta-val">{{ selectedToken.expires_at ? formatDate(selectedToken.expires_at) : 'Never' }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">Last used</span>
              <span class="meta-val">{{ selectedToken.last_used_at ? formatDate(selectedToken.last_used_at) : 'Never' }}</span>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-label">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              cURL example
              <span class="section-badge">POST /v1/chat/completions</span>
            </div>
            <div class="curl-block">
              <button class="copy-btn" @click="copyCurl" :class="{ copied: curlCopied }">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
                {{ curlCopied ? 'Copied!' : 'Copy' }}
              </button>
              <div v-if="curlLoading" class="curl-loading">
                <svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                Loading…
              </div>
              <pre v-else class="curl-code">{{ curlExample }}</pre>
            </div>
          </div>

          <div class="detail-footer">
            <DsButton v-if="selectedToken.is_active && can('api_tokens', 'edit')" variant="danger" size="sm" @click="revokeToken(selectedToken.id)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
              Revoke token
            </DsButton>
            <div v-else-if="!selectedToken.is_active" class="revoked-actions">
              <span class="revoked-note">This token has been revoked and can no longer be used.</span>
              <DsButton v-if="can('api_tokens', 'delete')" variant="ghost-danger" size="sm" @click="deleteToken(selectedToken.id)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Delete permanently
              </DsButton>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <CreateTokenModal v-if="showCreate" @close="showCreate = false" @done="onTokenCreated" />
  </div>
</template>

<script setup>
const { apiFetch } = useApi()
const auth = useAuthStore()
const { can } = usePermission()

const tokens = ref([])
const showCreate = ref(false)
const selectedToken = ref(null)
const curlExample = ref('')
const curlCopied = ref(false)
const curlLoading = ref(false)
const prefixCopied = ref(false)
const search = ref('')
const filterStatus = ref('')
const { show: showToast } = useToast()
const { ask: confirm } = useConfirm()

const filteredTokens = computed(() => {
  let list = tokens.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(t => t.name.toLowerCase().includes(q) || (t.prefix || '').toLowerCase().includes(q))
  }
  if (filterStatus.value === 'active') list = list.filter(t => t.is_active)
  if (filterStatus.value === 'revoked') list = list.filter(t => !t.is_active)
  return list
})

onMounted(loadTokens)

async function loadTokens() {
  try { tokens.value = await apiFetch('/api/admin/tokens') } catch {}
}

function cycleStatus() {
  if (!filterStatus.value) filterStatus.value = 'active'
  else if (filterStatus.value === 'active') filterStatus.value = 'revoked'
  else filterStatus.value = ''
}

async function selectToken(token) {
  selectedToken.value = token
  curlExample.value = ''
  curlLoading.value = true
  try {
    const data = await apiFetch(`/api/admin/tokens/${token.id}/curl`)
    curlExample.value = data.curl
  } catch {
    curlExample.value = `# Could not load cURL example for: ${token.name}`
  } finally {
    curlLoading.value = false
  }
}

async function revokeToken(id) {
  const ok = await confirm({ title: 'Revoke token?', message: 'This token will stop working immediately.', confirmLabel: 'Revoke', variant: 'danger' })
  if (!ok) return
  await apiFetch(`/api/admin/tokens/${id}`, { method: 'DELETE' }).catch(() => {})
  await loadTokens()
  selectedToken.value = null
  showToast('Token revoked')
}

async function deleteToken(id) {
  const ok = await confirm({ title: 'Delete token?', message: 'This action cannot be undone.', confirmLabel: 'Delete', variant: 'danger' })
  if (!ok) return
  await apiFetch(`/api/admin/tokens/${id}/permanent`, { method: 'DELETE' }).catch(() => {})
  await loadTokens()
  selectedToken.value = null
  showToast('Token deleted')
}

async function copyToken() {
  const token = selectedToken.value?.token || ''
  if (!token) return
  await navigator.clipboard.writeText(token).catch(() => {})
  prefixCopied.value = true
  setTimeout(() => (prefixCopied.value = false), 1500)
}

async function copyCurl() {
  await navigator.clipboard.writeText(curlExample.value).catch(() => {})
  curlCopied.value = true
  setTimeout(() => (curlCopied.value = false), 1500)
}

async function onTokenCreated() {
  showCreate.value = false
  await loadTokens()
  showToast('Token created')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.token-page {
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  background: var(--line);
  border: 1px solid var(--line-2);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-mute);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color .12s, background .12s, color .12s;
  user-select: none;
}
.filter-chip:hover { border-color: color-mix(in oklab, var(--accent) 30%, transparent); background: color-mix(in oklab, var(--accent) 4%, transparent); color: var(--fg); }
.filter-chip.active {
  border-color: color-mix(in oklab, var(--accent) 35%, transparent);
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  color: var(--accent);
  font-weight: 700;
}
.chip-clear {
  background: transparent;
  border: 0;
  color: var(--accent);
  cursor: pointer;
  padding: 0;
  display: grid;
  place-items: center;
  opacity: 0.6;
  transition: opacity .12s;
  flex-shrink: 0;
}
.chip-clear:hover { opacity: 1; }

/* ── Stats strip ── */
.stats-strip {
  display: flex;
  align-items: center;
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
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 16px 20px;
  align-items: flex-start;
}

/* ── List panel ── */
.list-panel {
  flex: 1;
  min-width: 0;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  transition: all .3s cubic-bezier(.4,0,.2,1);
}
.list-panel.collapsed {
  flex: 0 0 300px;
  margin-right: 14px;
}

.table-head {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 1fr 0.8fr 36px;
  gap: 12px;
  padding: 10px 16px;
  background: var(--line);
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg-mute);
}
.table-head.compact {
  grid-template-columns: 1fr 0px;
  padding: 10px 14px;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 1fr 0.8fr 36px;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  position: relative;
  transition: background .1s;
}
.table-row::before {
  content: "";
  position: absolute;
  left: 0; top: 20%; bottom: 20%;
  width: 2px;
  border-radius: 0 2px 2px 0;
  background: var(--accent);
  opacity: 0;
  transition: opacity .15s;
}
.table-row:hover { background: var(--line); }
.table-row:hover::before { opacity: 0.5; }
.table-row.selected { background: color-mix(in oklab, var(--accent) 4%, transparent); }
.table-row.selected::before { opacity: 1; }
.table-row:last-child { border-bottom: 0; }

.cell-name { font-size: 12px; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-mono { font-family: var(--font-mono); font-size: 11px; color: var(--fg-mute); }
.cell-meta { font-size: 11px; color: var(--fg-mute); }
.cell-action { display: grid; place-items: center; color: var(--fg-faint); transition: color .12s, transform .12s; }
.table-row:hover .cell-action { color: var(--accent); transform: translateX(2px); }
.table-row.selected .cell-action { color: var(--accent); }

.compact-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  position: relative;
  transition: background .1s;
}
.compact-row::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  border-radius: 0 2px 2px 0;
  background: var(--accent);
  opacity: 0;
  transition: opacity .15s;
}
.compact-row:hover { background: var(--line); }
.compact-row.selected { background: color-mix(in oklab, var(--accent) 5%, transparent); }
.compact-row.selected::before { opacity: 1; }
.compact-row:last-child { border-bottom: 0; }

.compact-avatar {
  width: 30px; height: 30px; border-radius: 8px;
  background: color-mix(in oklab, var(--accent) 10%, transparent); color: var(--accent);
  font-size: 10px; font-weight: 800;
  display: grid; place-items: center; flex-shrink: 0;
}
.compact-info { flex: 1; min-width: 0; }
.compact-name { font-size: 12px; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.compact-meta { font-size: 10px; font-family: var(--font-mono); color: var(--fg-mute); }

.table-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--line);
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--fg-mute);
  background: var(--line);
}

.status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  background: var(--line); color: var(--fg-mute);
  border: 1px solid var(--line-2);
}
.status-badge.active { background: color-mix(in oklab, var(--ok) 10%, transparent); color: var(--ok); border-color: color-mix(in oklab, var(--ok) 25%, transparent); }
.status-badge.revoked { background: var(--line); color: var(--fg-faint); border-color: var(--line-2); }
.status-badge.lg { font-size: 10px; padding: 3px 9px; }
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
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  display: flex; flex-direction: column;
}
.detail-head {
  display: flex; align-items: center; gap: 11px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}
.detail-avatar {
  width: 36px; height: 36px; border-radius: 10px;
  background: color-mix(in oklab, var(--accent) 10%, transparent); color: var(--accent);
  font-size: 11px; font-weight: 800;
  display: grid; place-items: center; flex-shrink: 0;
}
.detail-title-block { flex: 1; min-width: 0; }
.detail-name { font-size: 13px; font-weight: 700; color: var(--fg); }
.detail-prefix { font-size: 10px; font-family: var(--font-mono); color: var(--fg-mute); }
.close-btn {
  background: transparent; border: 0; color: var(--fg-mute);
  width: 28px; height: 28px; border-radius: 6px;
  display: grid; place-items: center; cursor: pointer;
  transition: color .12s, background .12s;
}
.close-btn:hover { color: var(--fg); background: var(--line); }

.detail-meta {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  display: flex; flex-direction: column; gap: 6px;
}
.meta-row { display: flex; justify-content: space-between; align-items: center; }
.meta-key { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-mute); }
.meta-val { font-size: 12px; font-weight: 500; color: var(--fg-dim); font-family: var(--font-mono); }
.meta-token-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
.token-truncate { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.token-copy-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 22px; padding: 0 8px;
  background: var(--line); border: 1px solid var(--line-2);
  border-radius: 4px; color: var(--fg-mute);
  font-size: 10px; font-weight: 600; font-family: var(--font-mono);
  cursor: pointer; transition: color .12s, background .12s;
}
.token-copy-btn:hover { background: var(--bg-elev-2); color: var(--fg); }
.token-copy-btn.copied { color: var(--ok); border-color: color-mix(in oklab, var(--ok) 30%, transparent); }

.detail-section { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
.section-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--fg-mute);
}
.section-badge {
  margin-left: auto;
  font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
  background: color-mix(in oklab, var(--accent) 8%, transparent); color: var(--accent);
  border: 1px solid color-mix(in oklab, var(--accent) 20%, transparent);
  padding: 2px 7px; border-radius: 5px;
  font-family: var(--font-mono);
}
.curl-block {
  position: relative;
  background: var(--bg-elev-3);
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
}
.curl-code {
  padding: 14px 16px;
  color: var(--fg-mute);
  font-family: var(--font-mono);
  font-size: 11px; line-height: 1.65;
  white-space: pre; overflow-x: auto;
  margin: 0;
}
.curl-loading {
  display: flex; align-items: center; gap: 8px;
  padding: 18px 16px;
  font-family: var(--font-mono);
  font-size: 11px; color: var(--fg-mute);
}
.copy-btn {
  position: absolute; top: 8px; right: 8px;
  display: inline-flex; align-items: center; gap: 5px;
  height: 24px; padding: 0 9px;
  background: var(--line); border: 1px solid var(--line-2);
  border-radius: 5px; color: var(--fg-mute);
  font-size: 10px; font-weight: 600; font-family: var(--font-mono);
  cursor: pointer; transition: color .12s, background .12s;
}
.copy-btn:hover { background: var(--bg-elev-2); color: var(--fg); }
.copy-btn.copied { color: var(--ok); border-color: color-mix(in oklab, var(--ok) 30%, transparent); }

.detail-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  background: var(--line);
  display: flex; align-items: center;
}
.revoked-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.revoked-note { font-size: 11px; color: var(--fg-faint); }

.panel-enter-active { transition: opacity .25s ease, transform .25s cubic-bezier(.4,0,.2,1); }
.panel-leave-active { transition: opacity .18s ease, transform .18s ease; }
.panel-enter-from { opacity: 0; transform: translateX(12px); }
.panel-leave-to { opacity: 0; transform: translateX(8px); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .8s linear infinite; }

/* ── Tablet (≤1024px) ── */
@media (max-width: 1024px) {
  .body-pane { padding: 12px 14px; gap: 12px; }
  /* List stays full width — detail becomes popup */
  .list-panel,
  .list-panel.collapsed { flex: 1; margin-right: 0; }
  .table-head { grid-template-columns: 2fr 1fr 80px 36px; gap: 10px; }
  .table-row  { grid-template-columns: 2fr 1fr 80px 36px; gap: 10px; }
  .table-head > *:nth-child(3),
  .table-row  > *:nth-child(3),
  .table-head > *:nth-child(4),
  .table-row  > *:nth-child(4) { display: none; }
  .page-header { padding: 16px 18px 14px; }
  .stats-strip { padding: 8px 18px; overflow-x: auto; flex-wrap: nowrap; gap: 0; }
  .stat-sep { flex-shrink: 0; }

  /* Detail panel popup overlay */
  .detail-panel {
    position: fixed;
    inset: 0;
    z-index: 40;
    width: 100% !important;
    max-width: 720px;
    margin: 0 auto;
    border-radius: 0;
    border: 0;
    border-left: 1px solid var(--line);
    background: var(--bg);
    box-shadow: -8px 0 32px rgba(0,0,0,0.4);
    overflow-y: auto;
    animation: detail-pop-in .22s cubic-bezier(.4,0,.2,1);
  }
  /* Backdrop using ::before on body-pane when detail is open */
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
  .token-page { font-size: 13px; }
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
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px;
    align-items: center;
  }
  .header-right > :deep(.ds-input),
  .header-right > :deep(.ds-input-wrap) { width: 100% !important; min-width: 0; }
  .header-right :deep(input) { width: 100% !important; }
  .filter-chip { grid-column: 1 / 2; height: 30px; }
  .header-right > :deep(.ds-button) { grid-column: 2 / 3; grid-row: 1 / 3; align-self: stretch; }

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
    margin: 0;
    max-height: none;
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

  .table-head { display: none; }
  .table-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 12px 14px;
    position: relative;
    min-height: 56px;
  }
  .table-row > *:last-child {
    position: absolute;
    top: 12px; right: 12px;
  }
  .table-row > *:nth-child(3),
  .table-row > *:nth-child(4) { display: block; }
  .cell-name { font-size: 13px; font-weight: 600; padding-right: 32px; white-space: normal; }
  .cell-mono, .cell-meta { font-size: 11.5px; }

  .detail-head { padding: 14px; }
  .detail-meta { padding: 12px 14px; }
  .detail-section { padding: 12px 14px; }
  .detail-footer { padding: 12px 14px; }
  .meta-row { flex-wrap: wrap; gap: 4px; }
  .token-truncate { max-width: 100%; }
  .curl-block { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .curl-code { font-size: 10.5px; padding: 12px; }
}

/* ── Small mobile (≤480px) ── */
@media (max-width: 480px) {
  .page-header { padding: 12px 12px 10px; }
  .page-title { font-size: 16px; }
  .body-pane { padding: 8px; gap: 8px; }
  .list-panel, .list-panel.collapsed { border-radius: 8px; }
  .detail-panel { border-radius: 8px; }
  .stats-strip { padding: 6px 12px; }
}
</style>
