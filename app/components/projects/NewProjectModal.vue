<template>
  <DsModal v-model="open" :title="editing ? 'Edit project' : 'New project'" size="md">
    <div class="np-form">
      <label class="np-field">
        <span>Name <em>*</em></span>
        <DsInput v-model="form.name" placeholder="e.g. Q4 Planning" autocomplete="off" />
      </label>

      <label class="np-field">
        <span>Description</span>
        <textarea v-model="form.description" rows="2" placeholder="What's this project about?"></textarea>
      </label>

      <label class="np-field">
        <span>Custom instructions</span>
        <textarea
          v-model="form.custom_instructions"
          rows="5"
          placeholder="System guidance applied to every conversation in this project. E.g. 'Write in formal English. Use TypeScript snippets.'"
        ></textarea>
        <small>Appended to the system prompt for every conversation in this project.</small>
      </label>

      <div class="np-row">
        <label class="np-field">
          <span>Color</span>
          <DsDropdown v-model="form.color" :options="COLORS.map(c => ({ value: c, label: c }))" />
        </label>
        <label class="np-field">
          <span>Icon (emoji)</span>
          <DsInput v-model="form.icon" placeholder="📁" maxlength="3" autocomplete="off" />
        </label>
      </div>

      <div v-if="error" class="np-error">{{ error }}</div>
    </div>

    <template #footer>
      <DsButton variant="ghost" @click="open = false">{{ t('common.cancel') }}</DsButton>
      <DsButton variant="primary" :disabled="saving || !form.name.trim()" @click="save">
        {{ saving ? 'Saving…' : (editing ? t('common.save') : t('common.create')) }}
      </DsButton>
    </template>
  </DsModal>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  project:    { type: Object, default: null }, // when editing
})
const emit = defineEmits(['update:modelValue', 'saved'])

const { apiFetch } = useApi()
const { show: showToast } = useToast()
const { t } = useI18n()

const COLORS = ['indigo','amber','pink','cyan','green','blue','purple','orange','teal','red','gray']

const open = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })
const editing = computed(() => !!props.project)

const form = reactive(emptyForm())
const saving = ref(false)
const error = ref('')

function emptyForm() {
  return { name: '', description: '', custom_instructions: '', color: 'indigo', icon: '' }
}

watch(() => props.modelValue, (v) => {
  if (!v) return
  if (props.project) Object.assign(form, { ...emptyForm(), ...props.project })
  else Object.assign(form, emptyForm())
  error.value = ''
})

async function save() {
  if (!form.name.trim()) return
  saving.value = true
  error.value = ''
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      custom_instructions: form.custom_instructions?.trim() || null,
      color: form.color,
      icon: form.icon?.trim() || null,
    }
    const proj = props.project
      ? await apiFetch(`/api/projects/${props.project.id}`, { method: 'PATCH', body: payload, _skipLoader: true })
      : await apiFetch(`/api/projects`, { method: 'POST', body: payload, _skipLoader: true })
    showToast(editing.value ? 'Project updated' : 'Project created', 'success')
    emit('saved', proj)
    open.value = false
  } catch (e) {
    error.value = e?.data?.error || 'Failed to save'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.np-form { display: flex; flex-direction: column; gap: 14px; }
.np-field { display: flex; flex-direction: column; gap: 5px; }
.np-field > span {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--fg-mute);
}
.np-field > span em { color: var(--danger); font-style: normal; }
.np-field small {
  font-size: 10.5px;
  color: var(--fg-faint);
  margin-top: 2px;
}
.np-field textarea {
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 9px 11px;
  color: var(--fg);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  min-height: 60px;
  outline: 0;
}
.np-field textarea:focus { border-color: var(--line-3); }

.np-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.np-error {
  padding: 9px 11px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 7px;
  color: #fca5a5;
  font-size: 12px;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .np-form { gap: 12px; }
  .np-row { grid-template-columns: 1fr; gap: 12px; }
  .np-field textarea { font-size: 14px; }
}
</style>
