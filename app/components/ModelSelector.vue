<template>
  <div class="model-selector" ref="root">
    <button class="model-selector-btn" @click="open = !open" :title="selectedLabel">
      <span class="dot" :class="{ pro: selectedKind === 'pro' }"></span>
      {{ shortSelectedLabel }}
      <svg class="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>

    <div v-if="open" class="model-selector-menu">
      <button
        v-for="m in models"
        :key="m.name"
        class="model-option"
        :data-selected="modelValue === m.name"
        @click="select(m.name)"
      >
        <div class="model-info">
          <div class="model-name">
            {{ m.kind === 'pro' ? 'Pro Plan' : shortModelName(m.label || m.name) }}
            <span v-if="m.kind === 'pro'" class="model-badge pro">Pro</span>
            <span v-if="m.thinking" class="model-badge thinking">Thinking</span>
          </div>
        </div>
        <svg class="check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ modelValue: String, models: Array })
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const root = ref(null)

const selectedModel = computed(() => props.models?.find(m => m.name === props.modelValue))
const selectedLabel = computed(() => selectedModel.value?.label || selectedModel.value?.name || props.modelValue)
const selectedKind  = computed(() => selectedModel.value?.kind || 'chat')

// Rút gọn tên model: bỏ prefix @cf/<org>/ hoặc @cf/, chỉ giữ "tên-phiên-bản"
// Ví dụ: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b" → "deepseek-r1-distill-qwen-32b"
//        "@cf/meta/llama-3.3-70b-instruct-fp8-fast"     → "llama-3.3-70b-instruct-fp8-fast"
//        "@cf/qwen/qwq-32b"                              → "qwq-32b"
function shortModelName(raw) {
  if (!raw) return raw
  // Strip @cf/<org>/ or @cf/
  const stripped = raw.replace(/^@[^/]+\/[^/]+\//, '').replace(/^@[^/]+\//, '')
  return stripped
}

const shortSelectedLabel = computed(() => {
  const m = selectedModel.value
  if (!m) return props.modelValue ? shortModelName(props.modelValue) : 'Select model'
  if (m.kind === 'pro') return 'Pro Plan'
  return shortModelName(m.label || m.name)
})

function select(name) {
  emit('update:modelValue', name)
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', onOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onOutside)
})
function onOutside(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}
</script>

<style scoped>
.model-selector { position: relative; }

.model-selector-btn {
  display: flex; align-items: center; gap: 7px;
  height: 28px;
  padding: 0 8px 0 10px;
  max-width: 220px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: border-color .12s, background .12s, color .12s;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.model-selector-btn:hover {
  border-color: var(--line-2);
  background: rgba(255,255,255,0.03);
  color: var(--fg);
}
.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
  flex-shrink: 0;
}
.dot.pro {
  background: #ffb84d;
  box-shadow: 0 0 8px #ffb84d;
}
.chev { color: var(--fg-faint); }

.model-selector-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  background: var(--bg-elev-2);
  border: 1px solid var(--line-2);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3);
  z-index: 30;
  animation: menuIn .15s cubic-bezier(.3,.7,.4,1) both;
}
@keyframes menuIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.model-option {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: 0;
  border-radius: 7px;
  color: var(--fg);
  font-family: var(--font-sans);
  text-align: left;
  cursor: pointer;
  transition: background .1s;
}
.model-option:hover { background: rgba(255,255,255,0.05); }
.model-option[data-selected="true"] { background: rgba(255,255,255,0.03); }
.model-info { flex: 1; min-width: 0; }
.model-name { font-size: 13px; font-family: var(--font-mono); display: flex; align-items: center; gap: 6px; }
.model-desc { font-size: 11px; color: var(--fg-mute); margin-top: 1px; }
.model-badge {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  flex-shrink: 0;
}
.model-badge.thinking {
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in oklab, var(--accent) 35%, transparent);
}
.model-badge.pro {
  background: rgba(255,184,77,0.13);
  color: #ffb84d;
  border: 1px solid rgba(255,184,77,0.35);
}
.check { color: var(--accent); opacity: 0; flex-shrink: 0; }
.model-option[data-selected="true"] .check { opacity: 1; }

@media (max-width: 768px) {
  .model-selector-btn { max-width: 160px; font-size: 10.5px; }
  .model-selector-menu { min-width: 180px; }
}
</style>
