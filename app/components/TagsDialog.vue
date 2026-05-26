<template>
  <DsModal v-model="open" :title="t('tags.title')" size="md">
    <div class="td-body">
      <!-- Per-conversation attach picker -->
      <template v-if="conversationId">
        <p class="td-help">{{ t('tags.pickHelp') }}</p>
        <div class="td-tag-grid">
          <button
            v-for="tag in tags"
            :key="tag.id"
            class="td-chip"
            :class="[`color-${tag.color || 'gray'}`, { active: selectedIds.has(tag.id) }]"
            @click="toggle(tag)"
          >
            <span class="td-dot" :class="`dot-${tag.color || 'gray'}`"></span>
            {{ tag.name }}
            <svg v-if="selectedIds.has(tag.id)" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 12 5 5L20 7"/></svg>
          </button>
        </div>
        <div class="td-divider"></div>
      </template>

      <!-- Create new -->
      <div class="td-create">
        <DsInput v-model="draftName" :placeholder="t('tags.newPlaceholder')" @keydown.enter="create" />
        <DsDropdown v-model="draftColor" :options="COLOR_OPTIONS" />
        <DsButton variant="primary" size="sm" :disabled="!draftName.trim() || creating" @click="create">
          {{ creating ? '…' : t('tags.create') }}
        </DsButton>
      </div>

      <!-- Management list -->
      <div v-if="!conversationId" class="td-manage">
        <p class="td-help">{{ t('tags.manageHelp') }}</p>
        <div v-if="!tags.length" class="td-empty">{{ t('tags.empty') }}</div>
        <div v-for="tag in tags" :key="tag.id" class="td-manage-row">
          <span class="td-dot" :class="`dot-${tag.color || 'gray'}`"></span>
          <input class="td-rename" v-model="tag.name" @blur="renameTag(tag)" />
          <DsDropdown
            :model-value="tag.color || 'gray'"
            :options="COLOR_OPTIONS"
            @update:model-value="(v) => recolor(tag, v)"
          />
          <span class="td-count">{{ tag.usage_count || 0 }}</span>
          <button class="td-del" @click="remove(tag)" :title="t('common.delete')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <DsButton variant="ghost" @click="open = false">{{ t('common.close') }}</DsButton>
    </template>
  </DsModal>
</template>

<script setup>
const props = defineProps({
  modelValue:     { type: Boolean, default: false },
  conversationId: { type: String, default: null },
  initialTags:    { type: Array, default: () => [] }, // [{ id, name, color }]
})
const emit = defineEmits(['update:modelValue', 'changed'])

const { t } = useI18n()
const { show: showToast } = useToast()
const { ask: askConfirm } = useConfirm()
const tagsApi = useTags()
const { tags } = tagsApi

const open = computed({ get: () => props.modelValue, set: v => emit('update:modelValue', v) })

const COLOR_OPTIONS = [
  { value: 'gray',   label: 'Gray' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'amber',  label: 'Amber' },
  { value: 'pink',   label: 'Pink' },
  { value: 'cyan',   label: 'Cyan' },
  { value: 'green',  label: 'Green' },
  { value: 'blue',   label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'teal',   label: 'Teal' },
  { value: 'red',    label: 'Red' },
]

const draftName  = ref('')
const draftColor = ref('gray')
const creating   = ref(false)

const selectedIds = ref(new Set())

watch(() => props.modelValue, (v) => {
  if (!v) return
  tagsApi.load()
  selectedIds.value = new Set((props.initialTags || []).map(t => t.id))
})

async function create() {
  const name = draftName.value.trim()
  if (!name) return
  creating.value = true
  try {
    const t = await tagsApi.createTag(name, draftColor.value)
    draftName.value = ''
    if (props.conversationId) {
      await tagsApi.attachToConversation(props.conversationId, t.id)
      selectedIds.value.add(t.id)
      emit('changed', { type: 'attached', tag: t })
    }
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  } finally {
    creating.value = false
  }
}

async function toggle(tag) {
  if (!props.conversationId) return
  const had = selectedIds.value.has(tag.id)
  try {
    if (had) {
      await tagsApi.detachFromConversation(props.conversationId, tag.id)
      selectedIds.value.delete(tag.id)
      emit('changed', { type: 'detached', tag })
    } else {
      await tagsApi.attachToConversation(props.conversationId, tag.id)
      selectedIds.value.add(tag.id)
      emit('changed', { type: 'attached', tag })
    }
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  }
}

async function renameTag(tag) {
  const name = tag.name.trim()
  if (!name) return
  try { await tagsApi.updateTag(tag.id, { name }) }
  catch (e) { showToast(e?.data?.error || 'Failed', 'error') }
}

async function recolor(tag, color) {
  try {
    await tagsApi.updateTag(tag.id, { color })
    tag.color = color
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  }
}

async function remove(tag) {
  const ok = await askConfirm({
    title: t('tags.deleteConfirmTitle', { name: tag.name }),
    message: t('tags.deleteConfirmBody'),
    confirmLabel: t('common.delete'),
    variant: 'danger',
  })
  if (!ok) return
  try {
    await tagsApi.deleteTag(tag.id)
    selectedIds.value.delete(tag.id)
    emit('changed', { type: 'deleted', tag })
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  }
}
</script>

<style scoped>
.td-body { display: flex; flex-direction: column; gap: 14px; }
.td-help { margin: 0; font-size: 12px; color: var(--fg-dim); }
.td-divider { height: 1px; background: var(--line); margin: 4px 0; }

.td-tag-grid {
  display: flex; flex-wrap: wrap; gap: 6px;
}

.td-chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--line);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--fg-dim);
  cursor: pointer;
  transition: background .12s, color .12s, border-color .12s;
}
.td-chip:hover { color: var(--fg); border-color: var(--line-2); }
.td-chip.active {
  background: rgba(216,255,91,0.07);
  color: var(--accent);
  border-color: color-mix(in oklab, var(--accent) 40%, transparent);
}

.td-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.dot-gray   { background: #94a3b8; }
.dot-indigo { background: #818cf8; }
.dot-amber  { background: #fbbf24; }
.dot-pink   { background: #f472b6; }
.dot-cyan   { background: #22d3ee; }
.dot-green  { background: #4ade80; }
.dot-blue   { background: #60a5fa; }
.dot-purple { background: #a78bfa; }
.dot-orange { background: #fb923c; }
.dot-teal   { background: #2dd4bf; }
.dot-red    { background: #f87171; }

.td-create {
  display: grid;
  grid-template-columns: 1fr 110px auto;
  gap: 8px;
  align-items: center;
}

.td-manage { display: flex; flex-direction: column; gap: 6px; }
.td-empty { padding: 16px; text-align: center; color: var(--fg-mute); font-size: 12px; }
.td-manage-row {
  display: grid;
  grid-template-columns: 14px 1fr 110px 32px 24px;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
}
.td-manage-row:hover { background: rgba(255,255,255,0.03); }
.td-rename {
  background: transparent;
  border: 0;
  color: var(--fg);
  font-size: 13px;
  outline: 0;
  padding: 4px 6px;
  border-radius: 4px;
}
.td-rename:focus { background: rgba(255,255,255,0.05); }
.td-count {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-mute);
  text-align: right;
}
.td-del {
  background: transparent; border: 0;
  color: var(--fg-mute);
  width: 20px; height: 20px;
  border-radius: 4px;
  cursor: pointer;
  display: grid; place-items: center;
}
.td-del:hover { color: var(--danger); background: rgba(239,68,68,0.08); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .td-create {
    grid-template-columns: 1fr;
  }
  .td-manage-row {
    grid-template-columns: 14px 1fr 90px 28px 24px;
    gap: 6px;
    padding: 6px 4px;
  }
  .td-chip { padding: 6px 10px; min-height: 36px; }
}
</style>
