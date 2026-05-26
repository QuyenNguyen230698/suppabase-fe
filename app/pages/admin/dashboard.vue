<template>
  <div class="ad-page">
    <header class="ad-head">
      <div>
        <h1>Admin dashboard</h1>
        <p>System-wide telemetry — last {{ days }} days.</p>
      </div>
      <div class="ad-range">
        <button
          v-for="d in [7, 30, 90]"
          :key="d"
          :class="{ active: days === d, loading: rangeLoading && days === d }"
          :disabled="rangeLoading"
          @click="changeDays(d)"
        >
          <span v-if="rangeLoading && days === d" class="ad-range-spinner" aria-hidden="true"></span>
          {{ d }}d
        </button>
      </div>
    </header>

    <div v-if="initialLoading" class="ad-state">{{ t('common.loading') }}</div>
    <div v-else-if="!summary" class="ad-state">Failed to load</div>

    <template v-else>
      <div class="ad-content" :class="{ 'is-refreshing': rangeLoading }">
      <!-- Stat cards -->
      <div class="ad-stats">
        <div class="ad-stat">
          <div class="ad-stat-label">Users</div>
          <div class="ad-stat-num">{{ summary.users.total }}</div>
          <div class="ad-stat-sub">{{ summary.users.active_7d }} active in 7d</div>
        </div>
        <div class="ad-stat">
          <div class="ad-stat-label">Conversations</div>
          <div class="ad-stat-num">{{ summary.conversations.total }}</div>
          <div class="ad-stat-sub">{{ recentConvs }} in last {{ days }}d</div>
        </div>
        <div class="ad-stat">
          <div class="ad-stat-label">Messages</div>
          <div class="ad-stat-num">{{ summary.messages.total }}</div>
          <div class="ad-stat-sub">{{ recentMsgs }} in last {{ days }}d</div>
        </div>
        <div class="ad-stat">
          <div class="ad-stat-label">Tokens</div>
          <div class="ad-stat-num">{{ humanize(totalTokens) }}</div>
          <div class="ad-stat-sub">{{ humanize(promptTokens) }} in · {{ humanize(completionTokens) }} out</div>
        </div>
      </div>

      <!-- Sparklines -->
      <div class="ad-card">
        <div class="ad-card-head">
          <h2>Messages per day</h2>
        </div>
        <Sparkline :data="msgSeries" :max="msgMax" />
      </div>

      <div class="ad-card">
        <div class="ad-card-head">
          <h2>Tokens per day</h2>
          <span class="ad-legend">
            <span class="dot dot-in"></span> Input
            <span class="dot dot-out"></span> Output
          </span>
        </div>
        <Sparkline :data="tokInSeries"  :max="tokMax" label="Input"  color-class="in" />
        <Sparkline :data="tokOutSeries" :max="tokMax" label="Output" color-class="out" />
      </div>

      <!-- Top users -->
      <div class="ad-card">
        <div class="ad-card-head"><h2>Top users by token usage</h2></div>
        <div v-if="!summary.top_users.length" class="ad-empty">No activity in the selected window.</div>
        <table v-else class="ad-table">
          <thead>
            <tr><th>User</th><th>Conversations</th><th>Tokens</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in summary.top_users" :key="u.id">
              <td>
                <div class="user-cell">
                  <div class="avatar">{{ (u.full_name || u.username || '?').slice(0,2).toUpperCase() }}</div>
                  <div>
                    <div>{{ u.full_name || u.username }}</div>
                    <div class="muted">{{ u.username }}</div>
                  </div>
                </div>
              </td>
              <td class="mono">{{ u.conversation_count }}</td>
              <td class="mono">{{ humanize(u.tokens_used) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Jobs -->
      <div class="ad-card">
        <div class="ad-card-head">
          <h2>Background jobs</h2>
          <DsButton variant="ghost" size="sm" @click="loadJobs">Refresh</DsButton>
        </div>
        <table class="ad-table">
          <thead>
            <tr><th>Job</th><th>Last run</th><th>Status</th><th>Duration</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="j in jobs" :key="j.name">
              <td>
                <div>{{ j.name }}</div>
                <div class="muted">{{ j.description }}</div>
              </td>
              <td class="mono">{{ formatRel(j.last_run_at) }}</td>
              <td>
                <span v-if="j.last_run_ok === true"  class="pill ok">ok</span>
                <span v-else-if="j.last_run_ok === false" class="pill err">failed</span>
                <span v-else class="pill idle">never</span>
                <div v-if="j.last_error" class="err-msg">{{ j.last_error }}</div>
              </td>
              <td class="mono">{{ j.last_run_ms != null ? j.last_run_ms + 'ms' : '—' }}</td>
              <td>
                <DsButton size="sm" variant="ghost" :disabled="runningJob === j.name" @click="runJob(j.name)">
                  {{ runningJob === j.name ? 'Running…' : 'Run now' }}
                </DsButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const { apiFetch } = useApi()
const { t } = useI18n()
const { show: showToast } = useToast()

const days           = ref(7)
const initialLoading = ref(true)  // only true on first mount, hides whole layout
const rangeLoading   = ref(false) // true on range switch, keeps existing data visible
const summary        = ref(null)
const jobs           = ref([])
const runningJob     = ref(null)

const recentConvs = computed(() =>
  summary.value?.conversations.by_day.reduce((s, d) => s + d.n, 0) || 0
)
const recentMsgs = computed(() =>
  summary.value?.messages.by_day.reduce((s, d) => s + d.n, 0) || 0
)
const promptTokens = computed(() =>
  summary.value?.tokens_by_day.reduce((s, d) => s + (d.tokens_in || 0), 0) || 0
)
const completionTokens = computed(() =>
  summary.value?.tokens_by_day.reduce((s, d) => s + (d.tokens_out || 0), 0) || 0
)
const totalTokens = computed(() => promptTokens.value + completionTokens.value)

const msgSeries     = computed(() => summary.value?.messages.by_day.map(d => d.n) || [])
const msgMax        = computed(() => Math.max(1, ...msgSeries.value))
const tokInSeries   = computed(() => summary.value?.tokens_by_day.map(d => d.tokens_in) || [])
const tokOutSeries  = computed(() => summary.value?.tokens_by_day.map(d => d.tokens_out) || [])
const tokMax        = computed(() => Math.max(1, ...tokInSeries.value, ...tokOutSeries.value))

function humanize(n) {
  if (n == null) return '0'
  if (n < 1000)      return String(n)
  if (n < 1_000_000) return (n/1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return (n/1_000_000).toFixed(2).replace(/\.00$/, '') + 'M'
}

function formatRel(d) {
  if (!d) return 'never'
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return new Date(d).toLocaleString()
}

async function load({ initial = false } = {}) {
  if (initial) initialLoading.value = true
  else rangeLoading.value = true
  try {
    const [sm, jb] = await Promise.all([
      apiFetch(`/api/admin/telemetry/summary?days=${days.value}`, { _skipLoader: true }),
      apiFetch(`/api/admin/telemetry/jobs`, { _skipLoader: true }),
    ])
    summary.value = sm
    jobs.value    = jb.items || []
  } finally {
    initialLoading.value = false
    rangeLoading.value   = false
  }
}

async function loadJobs() {
  jobs.value = (await apiFetch('/api/admin/telemetry/jobs', { _skipLoader: true })).items || []
}

async function runJob(name) {
  runningJob.value = name
  try {
    await apiFetch(`/api/admin/telemetry/jobs/${name}/run`, { method: 'POST', _skipLoader: true })
    showToast(`Job "${name}" finished`, 'success')
    await loadJobs()
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  } finally {
    runningJob.value = null
  }
}

function changeDays(n) {
  if (n === days.value || rangeLoading.value) return
  days.value = n
  load()
}

onMounted(() => load({ initial: true }))
</script>

<style scoped>
.ad-page { max-width: 1100px; margin: 0 auto; padding: 28px 32px 64px; }
.ad-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 18px;
}
.ad-head h1 {
  font-family: var(--font-serif); font-weight: 400; font-size: 26px;
  margin: 0 0 4px;
}
.ad-head p { margin: 0; color: var(--fg-dim); font-size: 13px; }

.ad-range { display: flex; gap: 4px; }
.ad-range button {
  appearance: none; background: transparent;
  border: 1px solid var(--line);
  color: var(--fg-mute);
  padding: 6px 12px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: color .12s, border-color .12s, background .12s;
}
.ad-range button:hover { color: var(--fg); border-color: var(--line-2); }
.ad-range button.active {
  color: var(--accent);
  border-color: color-mix(in oklab, var(--accent) 40%, transparent);
  background: color-mix(in oklab, var(--accent) 8%, transparent);
}
.ad-range button:disabled { cursor: wait; }
.ad-range button.loading { padding-left: 8px; }
.ad-range-spinner {
  display: inline-block;
  width: 9px; height: 9px;
  margin-right: 5px;
  vertical-align: -1px;
  border: 1.4px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ad-spin .7s linear infinite;
}
@keyframes ad-spin { to { transform: rotate(360deg); } }

/* Keep layout stable while refreshing — dim content only */
.ad-content { transition: opacity .15s ease; }
.ad-content.is-refreshing { opacity: 0.55; pointer-events: none; }

.ad-state { padding: 60px; text-align: center; color: var(--fg-mute); }

.ad-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}
.ad-stat {
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;
}
.ad-stat-label {
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--fg-mute);
  margin-bottom: 6px;
}
.ad-stat-num {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 400;
  color: var(--fg);
  line-height: 1.1;
}
.ad-stat-sub {
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-mute);
}

.ad-card {
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 14px;
}
.ad-card-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.ad-card-head h2 {
  font-family: var(--font-serif); font-weight: 400; font-size: 16px;
  margin: 0;
}
.ad-legend {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--font-mono); font-size: 10px;
  color: var(--fg-mute);
}
.ad-legend .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 4px; }
.dot-in  { background: var(--accent); }
.dot-out { background: var(--info); }

.ad-table {
  width: 100%; border-collapse: collapse;
  font-size: 12.5px;
}
.ad-table th {
  text-align: left;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--fg-mute);
  font-weight: 700;
  padding: 6px 10px 10px;
  border-bottom: 1px solid var(--line);
}
.ad-table td {
  padding: 10px;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
.ad-table tr:last-child td { border-bottom: 0; }
.ad-table .mono { font-family: var(--font-mono); color: var(--fg-dim); }
.ad-table .muted { color: var(--fg-mute); font-size: 11px; font-family: var(--font-mono); }

.user-cell { display: flex; align-items: center; gap: 10px; }
.user-cell .avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b3b42, #1c1c22);
  display: grid; place-items: center;
  font-size: 10px; font-weight: 700;
}

.ad-empty { padding: 24px; text-align: center; color: var(--fg-mute); }

.pill {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
}
.pill.ok  { background: rgba(126,231,135,0.1); color: var(--ok); }
.pill.err { background: rgba(239,68,68,0.1); color: var(--danger); }
.pill.idle{ background: rgba(255,255,255,0.04); color: var(--fg-mute); }

.err-msg {
  margin-top: 6px;
  font-family: var(--font-mono); font-size: 10.5px;
  color: var(--danger);
  max-width: 320px;
  word-break: break-word;
}

/* ── Tablet (≤1024px) ── */
@media (max-width: 1024px) {
  .ad-page { padding: 22px 20px 48px; max-width: 100%; }
  .ad-stats { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .ad-card { padding: 14px 16px; }
}

/* ── Mobile (≤768px) ── */
@media (max-width: 768px) {
  .ad-page { padding: 16px 14px 40px; max-width: 100%; }
  .ad-head { flex-direction: column; align-items: stretch; gap: 12px; margin-bottom: 14px; }
  .ad-head h1 { font-size: 22px; }
  .ad-head p { font-size: 12.5px; }
  .ad-range { align-self: flex-start; }
  .ad-range button { padding: 6px 14px; font-size: 11px; }

  .ad-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 14px; }
  .ad-stat { padding: 12px 13px; border-radius: 10px; }
  .ad-stat-label { font-size: 9.5px; margin-bottom: 4px; }
  .ad-stat-num { font-size: 20px; }
  .ad-stat-sub { font-size: 10px; }

  .ad-card { padding: 14px; margin-bottom: 12px; border-radius: 10px; }
  .ad-card-head { margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
  .ad-card-head h2 { font-size: 15px; }

  .ad-card table { font-size: 12px; table-layout: fixed; width: 100%; }
  .ad-card table td,
  .ad-card table th { padding: 8px 6px; white-space: normal; word-break: break-word; overflow: hidden; }
  .user-cell .avatar { width: 24px; height: 24px; font-size: 9px; }
  .user-cell { gap: 8px; }

  .err-msg { max-width: 100%; }
}

/* ── Small mobile (≤480px) ── */
@media (max-width: 480px) {
  .ad-page { padding: 14px 12px 36px; }
  .ad-stats { grid-template-columns: 1fr 1fr; gap: 6px; }
  .ad-stat { padding: 10px 12px; }
  .ad-stat-num { font-size: 18px; }
  .ad-card { padding: 12px; }
  .ad-card-head h2 { font-size: 14px; }
}
</style>
