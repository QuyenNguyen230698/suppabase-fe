<template>
  <div class="ad-page">
    <header class="ad-head">
      <div>
        <h1>Analytics</h1>
        <p>System-wide telemetry · last {{ days }} days</p>
      </div>
      <div class="ad-range" role="tablist">
        <button
          v-for="d in [7, 30, 90]"
          :key="d"
          role="tab"
          :aria-selected="days === d"
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

        <!-- Metric cards (Google-Analytics style: big number + delta) -->
        <div class="gx-metrics">
          <button
            v-for="m in metrics"
            :key="m.key"
            class="gx-metric"
            :class="{ active: activeMetric === m.key }"
            @click="activeMetric = m.key"
          >
            <span class="gx-metric-dot" :style="{ background: m.color }"></span>
            <div class="gx-metric-label">{{ m.label }}</div>
            <div class="gx-metric-num">{{ humanize(m.total) }}</div>
            <div class="gx-metric-foot">
              <span class="gx-delta" :class="m.delta.dir">
                <svg v-if="m.delta.dir !== 'flat'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path v-if="m.delta.dir === 'up'" d="M7 14l5-5 5 5"/>
                  <path v-else d="M7 10l5 5 5-5"/>
                </svg>
                {{ m.delta.pct }}
              </span>
              <span class="gx-metric-sub">{{ m.sub }}</span>
            </div>
          </button>
        </div>

        <!-- Main trend chart for the selected metric -->
        <section class="gx-card gx-chart-card">
          <div class="gx-card-head">
            <div>
              <h2>{{ activeMeta.label }} over time</h2>
              <div class="gx-card-sub">{{ humanize(activeMeta.total) }} total · last {{ days }} days</div>
            </div>
            <div class="gx-legend">
              <span v-for="s in activeSeries" :key="s.key" class="gx-leg-item">
                <span class="gx-leg-dot" :style="{ background: s.color }"></span>{{ s.name }}
              </span>
            </div>
          </div>
          <AreaChart :series="activeSeries" :labels="dayLabels" />
        </section>

        <!-- Two-column: top users + jobs -->
        <div class="gx-grid">
          <section class="gx-card">
            <div class="gx-card-head"><h2>Top users by tokens</h2></div>
            <div v-if="!summary.top_users.length" class="gx-empty">No activity in the selected window.</div>
            <ul v-else class="gx-rank">
              <li v-for="(u, idx) in summary.top_users" :key="u.id">
                <span class="gx-rank-n">{{ idx + 1 }}</span>
                <span class="avatar">{{ (u.full_name || u.username || '?').slice(0,2).toUpperCase() }}</span>
                <span class="gx-rank-name">
                  <span class="nm">{{ u.full_name || u.username }}</span>
                  <span class="muted">{{ u.conversation_count }} conversations</span>
                </span>
                <span class="gx-rank-bar">
                  <span class="gx-rank-fill" :style="{ width: barPct(u.tokens_used) + '%' }"></span>
                </span>
                <span class="gx-rank-val">{{ humanize(u.tokens_used) }}</span>
              </li>
            </ul>
          </section>

          <section class="gx-card">
            <div class="gx-card-head">
              <h2>Background jobs</h2>
              <DsButton variant="ghost" size="sm" @click="loadJobs">Refresh</DsButton>
            </div>
            <ul class="gx-jobs">
              <li v-for="j in jobs" :key="j.name">
                <span class="gx-job-status">
                  <span class="pill" :class="j.last_run_ok === true ? 'ok' : j.last_run_ok === false ? 'err' : 'idle'"></span>
                </span>
                <span class="gx-job-meta">
                  <span class="nm">{{ j.name }}</span>
                  <span class="muted">{{ j.description }}</span>
                  <span v-if="j.last_error" class="err-msg">{{ j.last_error }}</span>
                </span>
                <span class="gx-job-time">
                  <span class="mono">{{ formatRel(j.last_run_at) }}</span>
                  <span class="muted mono">{{ j.last_run_ms != null ? j.last_run_ms + 'ms' : '—' }}</span>
                </span>
                <DsButton size="sm" variant="ghost" :disabled="runningJob === j.name" @click="runJob(j.name)">
                  {{ runningJob === j.name ? 'Running…' : 'Run' }}
                </DsButton>
              </li>
            </ul>
          </section>
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
const initialLoading = ref(true)
const rangeLoading   = ref(false)
const summary        = ref(null)
const jobs           = ref([])
const runningJob     = ref(null)
const activeMetric   = ref('messages')   // which series drives the big chart

// ── Build a continuous day axis so the chart has no gaps ─────
const dayKeys = computed(() => {
  // ascending list of YYYY-MM-DD for the whole window
  const out = []
  const today = new Date()
  for (let i = days.value - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
})
const dayLabels = computed(() =>
  dayKeys.value.map(k => {
    const [, m, d] = k.split('-')
    return `${d}/${m}`
  })
)

// Map a backend by_day array → dense values aligned to dayKeys.
function densify(rows, field) {
  const map = new Map((rows || []).map(r => [r.day, Number(r[field] || 0)]))
  return dayKeys.value.map(k => map.get(k) || 0)
}

const msgValues   = computed(() => densify(summary.value?.messages.by_day, 'n'))
const convValues  = computed(() => densify(summary.value?.conversations.by_day, 'n'))
const tokInValues = computed(() => densify(summary.value?.tokens_by_day, 'tokens_in'))
const tokOutValues= computed(() => densify(summary.value?.tokens_by_day, 'tokens_out'))

const C_MSG  = 'var(--accent)'
const C_CONV = '#a855f7'
const C_IN   = '#22c55e'
const C_OUT  = '#f59e0b'

// % change: sum of the second half vs the first half of the window.
function delta(values) {
  const half = Math.floor(values.length / 2)
  if (half === 0) return { dir: 'flat', pct: '—' }
  const prev = values.slice(0, half).reduce((a, b) => a + b, 0)
  const curr = values.slice(half).reduce((a, b) => a + b, 0)
  if (prev === 0) return curr > 0 ? { dir: 'up', pct: 'new' } : { dir: 'flat', pct: '0%' }
  const change = ((curr - prev) / prev) * 100
  const dir = change > 1 ? 'up' : change < -1 ? 'down' : 'flat'
  return { dir, pct: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%` }
}

const totalTokens = computed(() =>
  tokInValues.value.reduce((a, b) => a + b, 0) + tokOutValues.value.reduce((a, b) => a + b, 0)
)

const metrics = computed(() => [
  {
    key: 'messages', label: 'Messages', color: C_MSG,
    total: summary.value?.messages.total || 0,
    sub: `${humanize(sum(msgValues.value))} in range`,
    delta: delta(msgValues.value),
  },
  {
    key: 'conversations', label: 'Conversations', color: C_CONV,
    total: summary.value?.conversations.total || 0,
    sub: `${humanize(sum(convValues.value))} in range`,
    delta: delta(convValues.value),
  },
  {
    key: 'tokens', label: 'Tokens', color: C_IN,
    total: totalTokens.value,
    sub: `${humanize(sum(tokInValues.value))} in · ${humanize(sum(tokOutValues.value))} out`,
    delta: delta(tokInValues.value.map((v, i) => v + tokOutValues.value[i])),
  },
  {
    key: 'users', label: 'Users', color: '#06b6d4',
    total: summary.value?.users.total || 0,
    sub: `${summary.value?.users.active_7d || 0} active in 7d`,
    delta: { dir: 'flat', pct: `${summary.value?.users.active_7d || 0}/7d` },
  },
])

const activeMeta = computed(() => metrics.value.find(m => m.key === activeMetric.value) || metrics.value[0])

// Series feeding the big chart depend on the selected metric.
const activeSeries = computed(() => {
  switch (activeMetric.value) {
    case 'conversations':
      return [{ key: 'conv', name: 'Conversations', color: C_CONV, values: convValues.value }]
    case 'tokens':
      return [
        { key: 'in',  name: 'Input',  color: C_IN,  values: tokInValues.value },
        { key: 'out', name: 'Output', color: C_OUT, values: tokOutValues.value },
      ]
    case 'users':
      // no per-day user series available → show messages as a proxy of activity
      return [{ key: 'act', name: 'Activity (messages)', color: '#06b6d4', values: msgValues.value }]
    default:
      return [{ key: 'msg', name: 'Messages', color: C_MSG, values: msgValues.value }]
  }
})

const maxTokenUser = computed(() => Math.max(1, ...summary.value?.top_users.map(u => u.tokens_used || 0) || [1]))
function barPct(v) { return Math.round((v / maxTokenUser.value) * 100) }

function sum(arr) { return arr.reduce((a, b) => a + b, 0) }

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
  return new Date(d).toLocaleDateString()
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
.ad-page { max-width: 1160px; margin: 0 auto; padding: 32px 32px 64px; }

.ad-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 24px;
}
.ad-head h1 {
  font-family: var(--font-serif); font-weight: 400; font-size: 30px;
  margin: 0 0 4px; letter-spacing: -0.01em;
}
.ad-head p { margin: 0; color: var(--fg-dim); font-size: 13px; }

/* Range pills */
.ad-range {
  display: flex; gap: 2px;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px;
}
.ad-range button {
  appearance: none; background: transparent; border: 0;
  color: var(--fg-mute);
  padding: 6px 16px; border-radius: 999px;
  font-family: var(--font-mono); font-size: 11px;
  cursor: pointer;
  transition: color .12s, background .12s;
}
.ad-range button:hover { color: var(--fg); }
.ad-range button.active {
  color: var(--accent-fg); background: var(--accent);
}
.ad-range button:disabled { cursor: wait; }
.ad-range-spinner {
  display: inline-block; width: 9px; height: 9px; margin-right: 5px; vertical-align: -1px;
  border: 1.4px solid currentColor; border-right-color: transparent;
  border-radius: 50%; animation: ad-spin .7s linear infinite;
}
@keyframes ad-spin { to { transform: rotate(360deg); } }

.ad-content { transition: opacity .15s ease; }
.ad-content.is-refreshing { opacity: 0.55; pointer-events: none; }
.ad-state { padding: 80px; text-align: center; color: var(--fg-mute); }

/* ── Metric cards ─────────────────────────────────── */
.gx-metrics {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
  margin-bottom: 16px;
}
.gx-metric {
  position: relative;
  text-align: left;
  appearance: none; cursor: pointer;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 18px 18px 16px;
  transition: border-color .15s, box-shadow .15s, transform .12s;
}
.gx-metric:hover { border-color: var(--line-2); box-shadow: var(--shadow-card); }
.gx-metric.active {
  border-color: color-mix(in oklab, var(--accent) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 14%, transparent);
}
.gx-metric-dot {
  position: absolute; top: 18px; right: 18px;
  width: 8px; height: 8px; border-radius: 50%;
}
.gx-metric-label {
  font-size: 11px; font-weight: 600; letter-spacing: 0.03em;
  text-transform: uppercase; color: var(--fg-mute);
  margin-bottom: 10px;
}
.gx-metric-num {
  font-family: var(--font-serif);
  font-size: 32px; font-weight: 400; line-height: 1; color: var(--fg);
}
.gx-metric-foot {
  display: flex; align-items: center; gap: 8px; margin-top: 10px;
  flex-wrap: wrap;
}
.gx-delta {
  display: inline-flex; align-items: center; gap: 2px;
  font-family: var(--font-mono); font-size: 11px; font-weight: 600;
  padding: 2px 7px; border-radius: 999px;
}
.gx-delta.up   { color: var(--ok);     background: color-mix(in oklab, var(--ok) 12%, transparent); }
.gx-delta.down { color: var(--danger); background: color-mix(in oklab, var(--danger) 12%, transparent); }
.gx-delta.flat { color: var(--fg-mute); background: var(--line); }
.gx-metric-sub { font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-mute); }

/* ── Cards ────────────────────────────────────────── */
.gx-card {
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 20px 22px;
  margin-bottom: 16px;
}
.gx-card-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 16px; gap: 12px;
}
.gx-card-head h2 {
  font-family: var(--font-serif); font-weight: 400; font-size: 17px; margin: 0;
}
.gx-card-sub {
  font-family: var(--font-mono); font-size: 11px; color: var(--fg-mute); margin-top: 3px;
}
.gx-chart-card { padding-bottom: 16px; }

.gx-legend { display: flex; gap: 14px; flex-shrink: 0; }
.gx-leg-item {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-mute);
}
.gx-leg-dot { width: 8px; height: 8px; border-radius: 2px; }

.gx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* ── Ranked top users ─────────────────────────────── */
.gx-rank { list-style: none; margin: 0; padding: 0; }
.gx-rank li {
  display: grid;
  grid-template-columns: 18px 28px 1fr 80px auto;
  align-items: center; gap: 10px;
  padding: 8px 0;
}
.gx-rank li + li { border-top: 1px solid var(--line); }
.gx-rank-n { font-family: var(--font-mono); font-size: 11px; color: var(--fg-faint); text-align: center; }
.avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, color-mix(in oklab, var(--accent) 60%, #000), var(--accent));
  color: #fff; display: grid; place-items: center; font-size: 10px; font-weight: 700;
}
.gx-rank-name { display: flex; flex-direction: column; min-width: 0; }
.gx-rank-name .nm { font-size: 13px; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gx-rank-name .muted { font-family: var(--font-mono); font-size: 10px; color: var(--fg-mute); }
.gx-rank-bar { height: 6px; border-radius: 999px; background: var(--line); overflow: hidden; }
.gx-rank-fill { display: block; height: 100%; border-radius: 999px; background: var(--accent); }
.gx-rank-val { font-family: var(--font-mono); font-size: 12px; color: var(--fg-dim); text-align: right; }

/* ── Jobs list ────────────────────────────────────── */
.gx-jobs { list-style: none; margin: 0; padding: 0; }
.gx-jobs li {
  display: grid;
  grid-template-columns: 14px 1fr auto auto;
  align-items: center; gap: 12px;
  padding: 10px 0;
}
.gx-jobs li + li { border-top: 1px solid var(--line); }
.gx-job-meta { display: flex; flex-direction: column; min-width: 0; }
.gx-job-meta .nm { font-size: 13px; color: var(--fg); }
.gx-job-meta .muted { font-family: var(--font-mono); font-size: 10px; color: var(--fg-mute); }
.gx-job-time { display: flex; flex-direction: column; align-items: flex-end; }
.gx-job-time .mono { font-family: var(--font-mono); font-size: 11px; color: var(--fg-dim); }
.gx-job-time .muted { color: var(--fg-mute); font-size: 10px; }

.pill { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.pill.ok  { background: var(--ok); box-shadow: 0 0 7px color-mix(in oklab, var(--ok) 60%, transparent); }
.pill.err { background: var(--danger); }
.pill.idle{ background: var(--fg-faint); }

.err-msg { font-family: var(--font-mono); font-size: 10px; color: var(--danger); margin-top: 3px; word-break: break-word; }
.gx-empty { padding: 28px; text-align: center; color: var(--fg-mute); font-size: 13px; }

/* ── Responsive ───────────────────────────────────── */
@media (max-width: 1024px) {
  .ad-page { padding: 24px 20px 48px; }
  .gx-metrics { grid-template-columns: repeat(2, 1fr); }
  .gx-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .ad-head { flex-direction: column; gap: 14px; }
  .gx-metrics { grid-template-columns: 1fr 1fr; gap: 10px; }
  .gx-metric { padding: 14px; border-radius: 13px; }
  .gx-metric-num { font-size: 26px; }
  .gx-card { padding: 16px; border-radius: 13px; }
  .gx-legend { display: none; }
  .gx-rank li { grid-template-columns: 16px 24px 1fr auto; }
  .gx-rank-bar { display: none; }
}
</style>
