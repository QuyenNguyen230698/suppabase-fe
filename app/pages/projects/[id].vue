<template>
  <div class="pd-page">
    <div v-if="loading" class="pd-state">{{ t('common.loading') }}</div>
    <div v-else-if="!project" class="pd-state">Project not found</div>

    <template v-else>
      <!-- Header -->
      <header class="pd-head">
        <NuxtLink to="/projects" class="pd-back">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
          Projects
        </NuxtLink>

        <div class="pd-title">
          <span class="pd-icon" :class="`color-${project.color}`">{{ project.icon || '📁' }}</span>
          <div>
            <h1>{{ project.name }}</h1>
            <p v-if="project.description">{{ project.description }}</p>
          </div>
        </div>

        <div class="pd-actions">
          <DsButton variant="ghost" size="sm" @click="editing = true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
            Edit
          </DsButton>
          <DsButton variant="ghost" size="sm" @click="toggleArchive">
            {{ project.is_archived ? 'Unarchive' : 'Archive' }}
          </DsButton>
          <DsButton variant="danger" size="sm" @click="onDelete">Delete</DsButton>
        </div>
      </header>

      <!-- Tabs -->
      <nav class="pd-tabs">
        <button :class="{ active: tab === 'conversations' }" @click="tab = 'conversations'">
          Conversations
          <span class="tab-count">{{ project.conversations?.length || 0 }}</span>
        </button>
        <button :class="{ active: tab === 'knowledge' }" @click="tab = 'knowledge'">
          Knowledge
          <span class="tab-count">{{ project.documents?.length || 0 }}</span>
        </button>
        <button :class="{ active: tab === 'instructions' }" @click="tab = 'instructions'">
          Instructions
        </button>
      </nav>

      <!-- Body -->
      <section v-if="tab === 'conversations'" class="pd-section">
        <div v-if="!project.conversations?.length" class="pd-empty">
          No conversations yet. Start one and use the context menu to move it here.
        </div>
        <div v-else class="pd-conv-list">
          <NuxtLink
            v-for="c in project.conversations"
            :key="c.id"
            :to="`/c/${c.id}`"
            class="pd-conv-row"
          >
            <span class="pd-conv-dot" :class="c.source"></span>
            <div class="pd-conv-info">
              <div class="pd-conv-title">{{ c.title || 'Untitled' }}</div>
              <div v-if="c.summary" class="pd-conv-sub">{{ c.summary }}</div>
            </div>
            <span v-if="c.pinned" class="pd-conv-flag">📌</span>
            <span class="pd-conv-time">{{ formatRel(c.last_message_at) }}</span>
          </NuxtLink>
        </div>
      </section>

      <section v-else-if="tab === 'knowledge'" class="pd-section">
        <p class="pd-section-help">
          Pinned documents are always available as context for conversations in this project.
        </p>
        <div v-if="!project.documents?.length" class="pd-empty">
          No documents pinned. Upload a document in chat, then pin it to this project.
        </div>
        <div v-else class="pd-doc-list">
          <div v-for="d in project.documents" :key="d.id" class="pd-doc-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <div class="pd-doc-info">
              <div class="pd-doc-name">{{ d.name }}</div>
              <div class="pd-doc-meta">{{ humanSize(d.size_bytes) }} · {{ d.type }}</div>
            </div>
            <span class="pd-doc-status" :class="d.status">{{ d.status }}</span>
            <button class="pd-doc-unpin" @click="unpin(d.id)" title="Unpin">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </section>

      <section v-else-if="tab === 'instructions'" class="pd-section">
        <p class="pd-section-help">
          These instructions are appended to the system prompt for every conversation in this project.
        </p>
        <textarea
          v-model="instructionsDraft"
          rows="14"
          placeholder="E.g. 'Always respond in formal English. Prefer TypeScript over JavaScript. Add reference links at the end.'"
        ></textarea>
        <div class="pd-instr-foot">
          <span v-if="instructionsDirty" class="pd-dirty">Unsaved changes</span>
          <DsButton variant="primary" size="sm" :disabled="!instructionsDirty || savingInstr" @click="saveInstructions">
            {{ savingInstr ? 'Saving…' : 'Save' }}
          </DsButton>
        </div>
      </section>
    </template>

    <NewProjectModal v-model="editing" :project="project" @saved="onProjectSaved" />
  </div>
</template>

<script setup>
const route  = useRoute()
const router = useRouter()
const { apiFetch } = useApi()
const { show: showToast } = useToast()
const { ask: askConfirm } = useConfirm()
const { t } = useI18n()

const project = ref(null)
const loading = ref(true)
const tab = ref('conversations')
const editing = ref(false)

const instructionsDraft = ref('')
const savingInstr = ref(false)
const instructionsDirty = computed(() =>
  (project.value?.custom_instructions || '') !== (instructionsDraft.value || '')
)

async function load() {
  loading.value = true
  try {
    project.value = await apiFetch(`/api/projects/${route.params.id}`, { _skipLoader: true })
    instructionsDraft.value = project.value.custom_instructions || ''
  } catch {
    project.value = null
  } finally {
    loading.value = false
  }
}

function onProjectSaved(p) {
  project.value = { ...project.value, ...p }
}

async function toggleArchive() {
  try {
    await apiFetch(`/api/projects/${project.value.id}`, {
      method: 'PATCH',
      body: { is_archived: !project.value.is_archived },
      _skipLoader: true,
    })
    project.value.is_archived = !project.value.is_archived
    showToast(project.value.is_archived ? 'Archived' : 'Unarchived', 'success')
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  }
}

async function onDelete() {
  const ok = await askConfirm({
    title: 'Delete project?',
    message: 'Conversations and pinned documents stay; they just lose the project link.',
    confirmLabel: 'Delete',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await apiFetch(`/api/projects/${project.value.id}`, { method: 'DELETE', _skipLoader: true })
    showToast('Project deleted', 'success')
    router.push('/projects')
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  }
}

async function saveInstructions() {
  savingInstr.value = true
  try {
    const updated = await apiFetch(`/api/projects/${project.value.id}`, {
      method: 'PATCH',
      body: { custom_instructions: instructionsDraft.value || null },
      _skipLoader: true,
    })
    project.value.custom_instructions = updated.custom_instructions
    showToast('Instructions saved', 'success')
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  } finally {
    savingInstr.value = false
  }
}

async function unpin(docId) {
  try {
    await apiFetch(`/api/projects/${project.value.id}/documents/${docId}`, { method: 'DELETE', _skipLoader: true })
    project.value.documents = project.value.documents.filter(d => d.id !== docId)
    showToast('Unpinned', 'success')
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  }
}

function formatRel(d) {
  if (!d) return ''
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60)       return 'just now'
  if (diff < 3600)     return `${Math.floor(diff/60)}m`
  if (diff < 86400)    return `${Math.floor(diff/3600)}h`
  if (diff < 30*86400) return `${Math.floor(diff/86400)}d`
  return new Date(d).toLocaleDateString()
}

function humanSize(b) {
  if (b == null) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1024/1024).toFixed(1)} MB`
}

onMounted(load)
</script>

<style scoped>
.pd-page { max-width: 980px; margin: 0 auto; padding: 24px 32px 64px; }
.pd-state { padding: 60px; text-align: center; color: var(--fg-mute); }

.pd-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.pd-back {
  display: inline-flex; align-items: center; gap: 4px;
  color: var(--fg-mute);
  font-size: 12px;
  text-decoration: none;
  padding: 4px 6px;
  border-radius: 6px;
}
.pd-back:hover { color: var(--fg); background: rgba(255,255,255,0.04); }

.pd-title {
  display: flex; align-items: center; gap: 14px;
  min-width: 0;
}
.pd-icon {
  width: 40px; height: 40px;
  display: grid; place-items: center;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  font-size: 18px;
  flex-shrink: 0;
}
.pd-title h1 {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 22px;
  margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pd-title p { margin: 2px 0 0; color: var(--fg-dim); font-size: 12.5px; }

.pd-actions { display: flex; gap: 6px; }

.pd-tabs {
  display: flex; gap: 4px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 18px;
}
.pd-tabs button {
  appearance: none; background: transparent; border: 0;
  color: var(--fg-mute);
  padding: 9px 14px;
  font-size: 12.5px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color .12s, border-color .12s;
  font-family: inherit;
}
.pd-tabs button:hover { color: var(--fg-dim); }
.pd-tabs button.active {
  color: var(--fg);
  border-bottom-color: var(--accent);
}
.tab-count {
  margin-left: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-faint);
}
.pd-tabs button.active .tab-count { color: var(--accent); }

.pd-section { padding: 4px 0; }
.pd-section-help {
  color: var(--fg-dim);
  font-size: 12.5px;
  margin: 0 0 14px;
}

.pd-empty {
  padding: 36px 24px;
  text-align: center;
  color: var(--fg-mute);
  font-size: 13px;
  background: rgba(255,255,255,0.02);
  border: 1px dashed var(--line);
  border-radius: 10px;
}

/* Conversations list */
.pd-conv-list { display: flex; flex-direction: column; gap: 4px; }
.pd-conv-row {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--fg);
  transition: background .12s;
}
.pd-conv-row:hover { background: rgba(255,255,255,0.04); }
.pd-conv-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--fg-faint);
  flex-shrink: 0;
}
.pd-conv-dot.pro  { background: #ffb84d; }
.pd-conv-dot.chat { background: #6ab7ff; }
.pd-conv-info { flex: 1; min-width: 0; }
.pd-conv-title {
  font-size: 13px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pd-conv-sub {
  font-size: 11px;
  color: var(--fg-mute);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: 1px;
}
.pd-conv-flag { font-size: 10px; }
.pd-conv-time {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-faint);
  flex-shrink: 0;
}

/* Documents list */
.pd-doc-list { display: flex; flex-direction: column; gap: 4px; }
.pd-doc-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
}
.pd-doc-row > svg:first-child { color: var(--fg-mute); flex-shrink: 0; }
.pd-doc-info { flex: 1; min-width: 0; }
.pd-doc-name { font-size: 13px; }
.pd-doc-meta {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-mute);
}
.pd-doc-status {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
}
.pd-doc-status.ready      { color: var(--ok); background: rgba(126,231,135,0.1); }
.pd-doc-status.processing { color: var(--warn); background: rgba(255,203,107,0.1); }
.pd-doc-status.error      { color: var(--danger); background: rgba(239,68,68,0.1); }
.pd-doc-unpin {
  background: transparent; border: 0;
  color: var(--fg-mute);
  width: 24px; height: 24px;
  border-radius: 6px;
  cursor: pointer;
  display: grid; place-items: center;
}
.pd-doc-unpin:hover { color: var(--danger); background: rgba(239,68,68,0.1); }

/* Instructions */
.pd-section textarea {
  width: 100%;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.6;
  resize: vertical;
  outline: 0;
}
.pd-section textarea:focus { border-color: var(--line-3); }

.pd-instr-foot {
  margin-top: 10px;
  display: flex; align-items: center; gap: 12px;
  justify-content: flex-end;
}
.pd-dirty {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--warn);
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .pd-page { padding: 18px 20px 48px; }
  .pd-title h1 { font-size: 19px; }
}

@media (max-width: 768px) {
  .pd-page { padding: 14px 12px 40px; }
  .pd-head {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .pd-back { display: none; }
  .pd-actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
  }
  .pd-title h1 { font-size: 17px; }
  .pd-title p { font-size: 11.5px; }
  .pd-tabs button { padding: 8px 10px; font-size: 12px; }
  .pd-conv-row { padding: 10px 8px; gap: 8px; }
  .pd-conv-time { display: none; }
  .pd-doc-row { flex-wrap: wrap; gap: 8px; }
  .pd-doc-meta { font-size: 10px; }
}
</style>
