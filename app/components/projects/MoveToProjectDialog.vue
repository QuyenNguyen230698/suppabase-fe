<template>
  <DsModal v-model="open" title="Move to project" size="sm">
    <div class="mp-body">
      <div v-if="loading" class="mp-loading">{{ t('common.loading') }}</div>
      <template v-else>
        <DsDropdown
          v-model="selectedId"
          :options="options"
          placeholder="Select a project…"
        />
        <p v-if="conversationId && projects.length === 0" class="mp-empty">
          You don't have any projects yet.
          <NuxtLink to="/projects" @click="open = false">Create one</NuxtLink>.
        </p>
      </template>
    </div>

    <template #footer>
      <DsButton variant="ghost" @click="open = false">{{ t('common.cancel') }}</DsButton>
      <DsButton variant="danger" v-if="currentProjectId" :disabled="saving" @click="moveTo(null)">
        Remove from project
      </DsButton>
      <DsButton variant="primary" :disabled="saving || !selectedId" @click="moveTo(selectedId)">
        {{ saving ? 'Saving…' : 'Move' }}
      </DsButton>
    </template>
  </DsModal>
</template>

<script setup>
const props = defineProps({
  modelValue:       { type: Boolean, default: false },
  conversationId:   { type: String, default: null },
  currentProjectId: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'moved'])

const { apiFetch } = useApi()
const { show: showToast } = useToast()
const { t } = useI18n()

const open = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })

const projects = ref([])
const loading  = ref(false)
const saving   = ref(false)
const selectedId = ref('')

const options = computed(() =>
  projects.value.map(p => ({ value: p.id, label: `${p.icon || '📁'} ${p.name}` }))
)

watch(() => props.modelValue, async (v) => {
  if (!v) return
  selectedId.value = props.currentProjectId || ''
  loading.value = true
  try {
    const data = await apiFetch('/api/projects', { _skipLoader: true })
    projects.value = data.items || []
  } finally {
    loading.value = false
  }
})

async function moveTo(projectId) {
  if (!props.conversationId) return
  saving.value = true
  try {
    await apiFetch(`/api/conversations/${props.conversationId}`, {
      method: 'PATCH',
      body: { project_id: projectId },
      _skipLoader: true,
    })
    showToast(projectId ? 'Moved to project' : 'Removed from project', 'success')
    emit('moved', { projectId })
    open.value = false
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.mp-body { display: flex; flex-direction: column; gap: 10px; }
.mp-loading { color: var(--fg-mute); padding: 16px 0; text-align: center; font-size: 12px; }
.mp-empty {
  margin: 0;
  font-size: 12px;
  color: var(--fg-mute);
}
.mp-empty a { color: var(--accent); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .mp-body { gap: 8px; }
  .mp-loading { padding: 12px 0; }
}
</style>
