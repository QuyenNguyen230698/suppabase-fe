<template>
  <!-- Compact "PASTED" card (Claude-style). Click to view the full content in
       a modal; the × removes the attachment. -->
  <div class="paste-card" @click="open = true" :title="t('chat.viewPasted') || 'View pasted content'">
    <button v-if="!readonly" class="paste-card-x" @click.stop="emit('remove')" :title="t('chat.removeAttachment')">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    </button>
    <pre class="paste-card-preview"><code>{{ attachment.snippet || attachment.content }}</code></pre>
    <span class="paste-card-tag">PASTED</span>

    <!-- Full-content viewer. DsModal teleports to <body>, so nesting it here
         doesn't affect the chip's inline flex layout, and keeps a single
         template root. -->
    <DsModal v-model="open" size="lg" :title="''" @click.stop>
      <template #title>
        <div class="pasted-head">
          <span class="pasted-head-title">{{ t('chat.pastedContent') || 'Pasted content' }}</span>
          <span class="pasted-head-meta">
            {{ formatBytes(attachment.bytes) }} · {{ attachment.lines }} lines
            <span class="pasted-head-note">· {{ t('chat.pastedNote') || 'Formatting may be inconsistent from source' }}</span>
          </span>
        </div>
      </template>
      <pre class="pasted-body"><code class="hljs" v-html="highlighted"></code></pre>
    </DsModal>
  </div>
</template>

<script setup>
import hljs from 'highlight.js'
import { formatBytes } from '~/composables/usePasteCode.js'

const { t } = useI18n()
const props = defineProps({
  attachment: { type: Object, required: true },
  // When shown inside an already-sent message there's nothing to remove.
  readonly:   { type: Boolean, default: false },
})
const emit = defineEmits(['remove'])
const open = ref(false)

// Highlight lazily — only when the modal is actually opened, so a composer with
// several pasted chips doesn't pay hljs cost up front.
const highlighted = computed(() => {
  if (!open.value) return ''
  const content = props.attachment.content || ''
  const lang = props.attachment.lang
  try {
    if (lang && lang !== 'text' && hljs.getLanguage(lang)) {
      return hljs.highlight(content, { language: lang }).value
    }
    return hljs.highlightAuto(content).value
  } catch {
    // Fall back to escaped plain text if highlighting throws.
    const div = document.createElement('div')
    div.textContent = content
    return div.innerHTML
  }
})
</script>

<style scoped>
/* ── Compact PASTED card ─────────────────────────────── */
.paste-card {
  position: relative;
  width: 168px;
  height: 92px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 10px 8px;
  cursor: pointer;
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: background .15s, border-color .15s;
}
.paste-card:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.18);
}
.paste-card-preview {
  margin: 0;
  flex: 1;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 9px;
  line-height: 1.45;
  color: var(--fg-mute);
  white-space: pre;
  /* fade the bottom so it reads as "more below" */
  -webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
  pointer-events: none;
}
.paste-card-tag {
  align-self: flex-start;
  margin-top: 6px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--fg-dim);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 2px 7px;
}
.paste-card-x {
  position: absolute;
  top: 5px; right: 5px;
  z-index: 2;
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px;
  background: rgba(0,0,0,0.35); border: none; border-radius: 5px;
  color: var(--fg-mute); cursor: pointer;
  opacity: 0; transition: opacity .12s, color .12s, background .12s;
}
.paste-card:hover .paste-card-x { opacity: 1; }
.paste-card-x:hover { color: #fff; background: var(--danger); }

/* ── Modal header ────────────────────────────────────── */
.pasted-head {
  display: flex; flex-direction: column; gap: 3px;
}
.pasted-head-title {
  font-size: 16px; font-weight: 600; color: var(--fg);
}
.pasted-head-meta {
  font-size: 12px; color: var(--fg-mute);
  font-family: var(--font-mono);
}
.pasted-head-note { color: var(--fg-faint); }

/* ── Modal body ──────────────────────────────────────── */
.pasted-body {
  margin: 0;
  padding: 14px 16px;
  background: rgba(0,0,0,0.25);
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: auto;
  max-height: 60vh;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--fg);
  white-space: pre;
  -webkit-overflow-scrolling: touch;
}
.pasted-body code { font-family: inherit; }
</style>
