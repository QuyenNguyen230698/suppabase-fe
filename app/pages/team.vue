<template>
  <div class="team-page">
    <header class="team-head">
      <h1>My team</h1>
      <p>Direct reports — people who have you set as their manager.</p>
    </header>

    <div v-if="loading" class="team-state">{{ t('common.loading') }}</div>

    <div v-else-if="!team.length" class="team-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <h2>No direct reports</h2>
      <p>An admin can assign team members to report to you in the Permissions page.</p>
    </div>

    <div v-else class="team-table">
      <div class="th">
        <span>Member</span>
        <span>Title / Dept</span>
        <span>Country</span>
        <span>Last login</span>
        <span>Status</span>
      </div>
      <div v-for="m in team" :key="m.id" class="tr">
        <div class="td member">
          <div class="avatar">
            <img v-if="m.avatar_url" :src="m.avatar_url" alt="" />
            <span v-else>{{ initials(m) }}</span>
          </div>
          <div class="info">
            <div class="name">{{ m.full_name || m.display_name || m.username }}</div>
            <div class="email">{{ m.email }}</div>
          </div>
        </div>
        <div class="td">
          <div v-if="m.job_title || m.department">
            <div>{{ m.job_title || '—' }}</div>
            <div class="muted">{{ m.department || '' }}</div>
          </div>
          <span v-else class="muted">—</span>
        </div>
        <div class="td">{{ flagFor(m.country_code) }} {{ m.country_code || '—' }}</div>
        <div class="td mono">{{ formatRel(m.last_login_at) }}</div>
        <div class="td">
          <span class="badge" :class="{ inactive: !m.is_active }">
            {{ m.is_active ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { COUNTRIES } from '~/composables/useOrgConstants.js'

const { apiFetch } = useApi()
const { t } = useI18n()

const team    = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const data = await apiFetch('/api/me/team', { _skipLoader: true })
    team.value = data.items || []
  } finally {
    loading.value = false
  }
}

function initials(m) {
  const u = m.full_name || m.display_name || m.username || ''
  return (u || '??').slice(0, 2).toUpperCase()
}

function flagFor(code) {
  return COUNTRIES.find(c => c.code === code)?.flag || ''
}

function formatRel(d) {
  if (!d) return 'never'
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60)       return 'just now'
  if (diff < 3600)     return `${Math.floor(diff/60)}m ago`
  if (diff < 86400)    return `${Math.floor(diff/3600)}h ago`
  if (diff < 30*86400) return `${Math.floor(diff/86400)}d ago`
  return new Date(d).toLocaleDateString()
}

onMounted(load)
</script>

<style scoped>
.team-page { max-width: 1100px; margin: 0 auto; padding: 28px 32px 64px; }
.team-head { margin-bottom: 22px; }
.team-head h1 {
  font-family: var(--font-serif); font-weight: 400; font-size: 26px;
  margin: 0 0 4px;
}
.team-head p { margin: 0; color: var(--fg-dim); font-size: 13px; }

.team-state { padding: 60px; text-align: center; color: var(--fg-mute); }

.team-empty {
  text-align: center;
  padding: 64px 20px;
  color: var(--fg-mute);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.team-empty h2 { font-family: var(--font-serif); font-weight: 400; margin: 4px 0 2px; color: var(--fg); }
.team-empty p { margin: 0; max-width: 360px; }

.team-table {
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-elev);
}
.th, .tr {
  display: grid;
  grid-template-columns: 2.4fr 1.6fr 1fr 1fr 0.8fr;
  gap: 16px;
  padding: 12px 18px;
  align-items: center;
}
.th {
  background: var(--line);
  border-bottom: 1px solid var(--line);
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--fg-mute);
}
.tr + .tr { border-top: 1px solid var(--line); }
.tr:hover { background: var(--line); }
.td { min-width: 0; font-size: 12.5px; }
.td.mono { font-family: var(--font-mono); font-size: 11px; color: var(--fg-dim); }
.muted { color: var(--fg-mute); font-size: 11px; }

.member { display: flex; align-items: center; gap: 10px; }
.avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--bg-elev-3);
  border: 1px solid var(--line);
  display: grid; place-items: center;
  font-size: 10.5px; font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.info { min-width: 0; }
.name {
  font-size: 12.5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.email {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-mute);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--ok) 10%, transparent);
  color: var(--ok);
  border: 1px solid color-mix(in oklab, var(--ok) 20%, transparent);
}
.badge.inactive {
  background: color-mix(in oklab, var(--danger) 8%, transparent);
  color: var(--danger);
  border-color: color-mix(in oklab, var(--danger) 20%, transparent);
}

@media (max-width: 1024px) {
  .team-page { padding: 20px 20px 48px; }
  .th, .tr { grid-template-columns: 2fr 1.4fr 1fr 0.8fr; gap: 10px; padding: 10px 14px; }
  .th > *:nth-child(4), .tr > *:nth-child(4) { display: none; } /* hide Department */
}

@media (max-width: 768px) {
  .team-page { padding: 16px 12px 40px; }
  .th { display: none; }
  .tr {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 4px 8px;
    padding: 12px 14px;
  }
  .tr > *:nth-child(1) { grid-column: 1; grid-row: 1; }
  .tr > *:nth-child(2) { grid-column: 1; grid-row: 2; font-size: 11px; color: var(--fg-mute); }
  .tr > *:nth-child(3) { grid-column: 2; grid-row: 1; }
  .tr > *:nth-child(4),
  .tr > *:nth-child(5) { display: none; }
}
</style>
