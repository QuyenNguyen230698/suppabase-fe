<template>
  <div class="ap-wrap" v-click-outside="close">
    <button class="ap-trigger" :class="{ active: open }" @click="open = !open" :disabled="disabled">
      <span class="ap-ico" v-html="iconSvg(selected?.icon || 'bot')"></span>
      <span class="ap-name">{{ selected?.name || 'Chọn agent' }}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="caret">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <div v-if="open" class="ap-pop">
      <div class="ap-search">
        <input v-model="q" placeholder="Tìm agent…" autofocus />
      </div>
      <div class="ap-list">
        <button
          v-for="t in filtered"
          :key="t.id"
          class="ap-item"
          :class="{ on: t.id === modelValue }"
          @click="pick(t)"
        >
          <span class="ap-ico" v-html="iconSvg(t.icon || 'bot')"></span>
          <div class="ap-meta">
            <div class="ap-row1">
              <span class="n">{{ t.name }}</span>
              <span v-if="t.is_default" class="pill default">default</span>
            </div>
            <div class="desc">{{ t.description || t.category }}</div>
          </div>
        </button>
        <div v-if="!filtered.length" class="empty">Không có agent phù hợp.</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: null },
  disabled:   { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])

const { apiFetch } = useApi()

const open = ref(false)
const q = ref('')
const items = ref([])

const selected = computed(() => items.value.find(t => t.id === props.modelValue) || items.value.find(t => t.is_default) || null)

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return items.value
  return items.value.filter(t =>
    t.name?.toLowerCase().includes(term) ||
    t.slug?.toLowerCase().includes(term) ||
    t.description?.toLowerCase().includes(term)
  )
})

function close() { open.value = false; q.value = '' }
function pick(t) {
  emit('update:modelValue', t.id)
  emit('change', t)
  close()
}

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

onMounted(async () => {
  try {
    const r = await apiFetch('/api/agent-templates', { _skipLoader: true })
    items.value = r.items || []
    // Auto-pick default if nothing selected yet
    if (!props.modelValue) {
      const def = items.value.find(t => t.is_default)
      if (def) emit('update:modelValue', def.id)
    }
  } catch (e) {
    // silent — picker just shows "Chọn agent"
  }
})

// Tiny v-click-outside directive
const vClickOutside = {
  mounted(el, binding) {
    el._handler = (e) => { if (!el.contains(e.target)) binding.value() }
    document.addEventListener('mousedown', el._handler)
  },
  unmounted(el) { document.removeEventListener('mousedown', el._handler) },
}
</script>

<style scoped>
.ap-wrap { position: relative; display: inline-block; }
.ap-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--bg-elev); border: 1px solid var(--line);
  color: var(--fg); border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px; font-family: var(--font-sans);
  cursor: pointer; transition: border-color .12s;
  max-width: 220px;
}
.ap-trigger:hover:not(:disabled) { border-color: var(--line-2); }
.ap-trigger.active { border-color: var(--accent); }
.ap-trigger:disabled { opacity: 0.5; cursor: not-allowed; }
.ap-ico { display: inline-flex; color: var(--accent); }
.ap-name {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 150px;
}
.caret { color: var(--fg-mute); flex-shrink: 0; }

.ap-pop {
  position: absolute; bottom: calc(100% + 6px); left: 0;
  width: 320px; max-height: 380px;
  background: var(--bg-elev);
  border: 1px solid var(--line-2);
  border-radius: 10px;
  box-shadow: 0 -8px 24px rgba(0,0,0,0.32);
  z-index: 200;
  overflow: hidden;
  display: flex; flex-direction: column;
}
.ap-search { padding: 8px; border-bottom: 1px solid var(--line); }
.ap-search input {
  width: 100%;
  background: var(--bg); border: 1px solid var(--line);
  color: var(--fg); border-radius: 6px;
  padding: 6px 10px; font-size: 12px;
}
.ap-search input:focus { outline: 1px solid var(--accent); border-color: var(--accent); }

.ap-list { overflow-y: auto; padding: 4px; }
.ap-item {
  width: 100%; display: flex; gap: 10px; align-items: flex-start;
  background: transparent; border: 0; color: var(--fg);
  text-align: left; cursor: pointer;
  padding: 8px 10px; border-radius: 6px;
}
.ap-item:hover { background: rgba(255,255,255,0.04); }
.ap-item.on { background: color-mix(in oklab, var(--accent) 12%, transparent); }
.ap-item .ap-ico { margin-top: 1px; flex-shrink: 0; }
.ap-meta { min-width: 0; flex: 1; }
.ap-row1 { display: flex; align-items: center; gap: 6px; }
.n { font-size: 12.5px; font-weight: 500; }
.desc {
  font-size: 11px; color: var(--fg-mute);
  margin-top: 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.empty { padding: 24px; text-align: center; color: var(--fg-mute); font-size: 12px; }

.pill {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 1px 5px; border-radius: 999px;
}
.pill.default { background: rgba(126,231,135,0.12); color: var(--ok); }

@media (max-width: 768px) {
  .ap-trigger { max-width: 160px; padding: 5px 8px; font-size: 11.5px; }
  .ap-name { max-width: 110px; }
  .ap-pop { width: calc(100vw - 32px); left: auto; right: 0; }
}
</style>
