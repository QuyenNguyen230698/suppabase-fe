<template>
  <div class="proj-page">
    <header class="proj-head">
      <div class="proj-head-left">
        <h1>Projects</h1>
        <p>Group conversations + pinned docs under a shared context.</p>
      </div>
      <DsButton variant="primary" @click="openCreate">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
        New project
      </DsButton>
    </header>

    <div class="proj-toolbar">
      <DsInput v-model="search" placeholder="Search projects…" clearable>
        <template #prefix>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </template>
      </DsInput>
      <label class="proj-archived-toggle">
        <input type="checkbox" v-model="showArchived" @change="load" />
        <span>Show archived</span>
      </label>
    </div>

    <div v-if="loading" class="proj-state">{{ t('common.loading') }}</div>
    <div v-else-if="!filtered.length" class="proj-empty">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      <h2>{{ search ? 'No matches' : 'No projects yet' }}</h2>
      <p v-if="!search">Create your first project to group related conversations and pin reference documents.</p>
      <DsButton v-if="!search" variant="primary" @click="openCreate">Create project</DsButton>
    </div>

    <div v-else class="proj-grid">
      <NuxtLink
        v-for="p in filtered"
        :key="p.id"
        :to="`/projects/${p.id}`"
        class="proj-card"
        :class="[`color-${p.color}`, { archived: p.is_archived }]"
      >
        <div class="pc-head">
          <span class="pc-icon">{{ p.icon || '📁' }}</span>
          <span v-if="p.is_archived" class="pc-badge">Archived</span>
        </div>
        <h3>{{ p.name }}</h3>
        <p v-if="p.description">{{ p.description }}</p>
        <p v-else class="muted">No description</p>
        <div class="pc-meta">
          <span>{{ p.conversation_count }} chats</span>
          <span>·</span>
          <span>{{ p.document_count }} docs</span>
          <span class="pc-time">{{ formatRel(p.updated_at) }}</span>
        </div>
      </NuxtLink>
    </div>

    <NewProjectModal v-model="creating" @saved="onSaved" />
  </div>
</template>

<script setup>
const { apiFetch } = useApi()
const { t } = useI18n()

const projects = ref([])
const loading  = ref(true)
const search   = ref('')
const showArchived = ref(false)
const creating = ref(false)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return projects.value
  return projects.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q)
  )
})

function formatRel(d) {
  if (!d) return ''
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60)      return 'just now'
  if (diff < 3600)    return `${Math.floor(diff/60)}m ago`
  if (diff < 86400)   return `${Math.floor(diff/3600)}h ago`
  if (diff < 30*86400) return `${Math.floor(diff/86400)}d ago`
  return new Date(d).toLocaleDateString()
}

async function load() {
  loading.value = true
  try {
    const data = await apiFetch(`/api/projects${showArchived.value ? '?archived=1' : ''}`, { _skipLoader: true })
    projects.value = data.items || []
  } finally {
    loading.value = false
  }
}

function openCreate() { creating.value = true }
function onSaved() { load() }

onMounted(load)
</script>

<style scoped>
.proj-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 32px 64px;
}
.proj-head {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  margin-bottom: 18px;
}
.proj-head h1 {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 28px;
  margin: 0 0 4px;
}
.proj-head p { margin: 0; color: var(--fg-dim); font-size: 13px; }

.proj-toolbar {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 22px;
  max-width: 540px;
}
.proj-archived-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--fg-mute);
  font-size: 11.5px;
  cursor: pointer;
  white-space: nowrap;
}
.proj-archived-toggle input { margin: 0; accent-color: var(--accent); }

.proj-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.proj-card {
  display: flex; flex-direction: column;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 18px 18px 16px;
  text-decoration: none;
  color: var(--fg);
  transition: border-color .12s, transform .12s, background .12s;
  position: relative;
  min-height: 154px;
}
.proj-card:hover {
  border-color: var(--line-3);
  transform: translateY(-1px);
  background: rgba(255,255,255,0.025);
}
.proj-card.archived { opacity: 0.55; }

.pc-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.pc-icon {
  width: 32px; height: 32px;
  display: grid; place-items: center;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  font-size: 16px;
}
.pc-badge {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-mute);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  padding: 2px 6px;
  border-radius: 999px;
}

.proj-card h3 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}
.proj-card p {
  margin: 0;
  font-size: 12.5px;
  color: var(--fg-dim);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.proj-card p.muted { color: var(--fg-faint); font-style: italic; }

.pc-meta {
  margin-top: auto;
  padding-top: 12px;
  display: flex; align-items: center; gap: 6px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-mute);
}
.pc-time { margin-left: auto; }

/* Color accents (left border) */
.proj-card.color-indigo { border-left: 3px solid #818cf8; }
.proj-card.color-amber  { border-left: 3px solid #fbbf24; }
.proj-card.color-pink   { border-left: 3px solid #f472b6; }
.proj-card.color-cyan   { border-left: 3px solid #22d3ee; }
.proj-card.color-green  { border-left: 3px solid #4ade80; }
.proj-card.color-blue   { border-left: 3px solid #60a5fa; }
.proj-card.color-purple { border-left: 3px solid #c084fc; }
.proj-card.color-orange { border-left: 3px solid #fb923c; }
.proj-card.color-teal   { border-left: 3px solid #2dd4bf; }
.proj-card.color-red    { border-left: 3px solid #f87171; }
.proj-card.color-gray   { border-left: 3px solid var(--fg-mute); }

.proj-empty {
  text-align: center;
  padding: 64px 20px;
  color: var(--fg-mute);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.proj-empty h2 { font-weight: 400; font-family: var(--font-serif); margin: 4px 0 2px; color: var(--fg); }
.proj-empty p { margin: 0 0 18px; max-width: 360px; }

.proj-state {
  padding: 40px;
  text-align: center;
  color: var(--fg-mute);
}

@media (max-width: 1024px) {
  .projects-page { padding: 20px 20px 48px; }
  .projects-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
}

@media (max-width: 768px) {
  .projects-page { padding: 16px 12px 40px; }
  .projects-head {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .projects-grid { grid-template-columns: 1fr; }
}
</style>
