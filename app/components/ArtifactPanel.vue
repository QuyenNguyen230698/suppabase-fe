<template>
  <Transition name="ap-slide">
    <aside v-if="modelValue && artifact" class="artifact-panel">
      <div class="ap-head">
        <div class="ap-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span>{{ artifact.title }}</span>
          <span class="ap-lang" v-if="artifact.lang">{{ artifact.lang }}</span>
        </div>
        <div class="ap-actions">
          <button class="ap-btn" @click="copy" :title="t('common.copy')">
            <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 5 5L20 7"/></svg>
          </button>
          <button class="ap-btn" @click="download" title="Download">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="ap-btn" @click="$emit('update:modelValue', false)" :title="t('common.close')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div class="ap-body">
        <pre><code v-html="highlighted" /></pre>
      </div>
    </aside>
  </Transition>
</template>

<script setup>
import hljs from 'highlight.js/lib/common'
import { sanitizeHtml } from '~/composables/useSafeMarkdown.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  artifact:   { type: Object, default: null }, // { title, lang, content }
})
defineEmits(['update:modelValue'])
const { t } = useI18n()

const copied = ref(false)

const highlighted = computed(() => {
  if (!props.artifact) return ''
  const lang = props.artifact.lang || ''
  let html
  try {
    if (lang && hljs.getLanguage(lang)) {
      html = hljs.highlight(props.artifact.content, { language: lang, ignoreIllegals: true }).value
    } else {
      html = hljs.highlightAuto(props.artifact.content).value
    }
  } catch {
    html = escapeHtml(props.artifact.content)
  }
  return sanitizeHtml(html)
})

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function copy() {
  try {
    await navigator.clipboard.writeText(props.artifact.content)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1200)
  } catch {}
}

function download() {
  const ext = props.artifact.lang || 'txt'
  const filename = `${(props.artifact.title || 'artifact').replace(/\W+/g, '-').toLowerCase()}.${ext}`
  const blob = new Blob([props.artifact.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.artifact-panel {
  display: flex;
  flex-direction: column;
  width: 460px;
  min-width: 0;
  height: 100%;
  background: #0f0f11;
  border-left: 1px solid var(--line);
  overflow: hidden;
}

.ap-head {
  display: flex; align-items: center; justify-content: space-between;
  height: 42px;
  padding: 0 12px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.ap-title {
  display: flex; align-items: center; gap: 8px;
  color: var(--fg-dim);
  font-size: 12.5px;
  font-weight: 500;
  min-width: 0;
  flex: 1;
}
.ap-title span:nth-of-type(1) {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ap-lang {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(216,255,91,0.08);
  color: var(--accent);
  flex-shrink: 0;
}
.ap-actions { display: flex; gap: 4px; }
.ap-btn {
  appearance: none;
  background: transparent; border: 0;
  color: var(--fg-mute);
  width: 26px; height: 26px;
  border-radius: 6px;
  display: grid; place-items: center;
  cursor: pointer;
  transition: color .12s, background .12s;
}
.ap-btn:hover { color: var(--fg); background: rgba(255,255,255,0.06); }

.ap-body {
  flex: 1; min-height: 0;
  overflow: auto;
}
.ap-body pre {
  margin: 0;
  padding: 16px 18px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.55;
  color: #e2e8f0;
}

.ap-slide-enter-active,
.ap-slide-leave-active { transition: transform .22s cubic-bezier(.4,0,.2,1), opacity .18s ease; }
.ap-slide-enter-from,
.ap-slide-leave-to     { transform: translateX(40px); opacity: 0; }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .artifact-panel { width: 360px; }
}

@media (max-width: 768px) {
  .artifact-panel {
    width: 100%;
    height: 50vh;
    border-left: none;
    border-top: 1px solid var(--line);
  }
  .ap-body pre { padding: 12px 14px; font-size: 12px; }
}
</style>
