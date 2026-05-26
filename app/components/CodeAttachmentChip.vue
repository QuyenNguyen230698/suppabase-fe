<template>
  <div class="code-chip" @click.stop="expanded = !expanded">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
    <span class="code-chip-title">{{ attachment.title }}</span>
    <span v-if="attachment.preview" class="code-chip-preview">— {{ attachment.preview }}</span>
    <button class="code-chip-x" @click.stop="emit('remove')" :title="t('chat.removeAttachment')">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    </button>

    <div v-if="expanded" class="code-chip-popover" @click.stop>
      <div class="code-chip-popover-head">
        <span class="code-chip-popover-title">{{ attachment.lang }} · {{ attachment.lines }} lines</span>
        <button class="code-chip-popover-close" @click="expanded = false">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <pre class="code-chip-popover-body"><code>{{ attachment.content }}</code></pre>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()
const props = defineProps({ attachment: { type: Object, required: true } })
const emit = defineEmits(['remove'])
const expanded = ref(false)
</script>

<style scoped>
.code-chip {
  position: relative;
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 4px 8px 4px 10px;
  font-size: 11.5px;
  color: var(--fg-dim);
  cursor: pointer;
  max-width: 100%;
  transition: background .15s, border-color .15s;
}
.code-chip:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.18);
}
.code-chip-title {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg);
  white-space: nowrap;
}
.code-chip-preview {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
  color: var(--fg-mute);
  font-size: 11px;
}
.code-chip-x {
  display: inline-flex; align-items: center; justify-content: center;
  background: none; border: none; padding: 2px;
  color: var(--fg-mute); cursor: pointer; border-radius: 4px;
  margin-left: 2px;
}
.code-chip-x:hover { color: var(--danger); background: rgba(255,255,255,0.05); }

.code-chip-popover {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 50;
  min-width: 480px;
  max-width: 720px;
  max-height: 50vh;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  display: flex; flex-direction: column;
  overflow: hidden;
  cursor: default;
}
.code-chip-popover-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  background: rgba(255,255,255,0.02);
}
.code-chip-popover-title {
  font-family: var(--font-mono); font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--fg-mute);
}
.code-chip-popover-close {
  background: none; border: none; color: var(--fg-mute); cursor: pointer;
  padding: 2px; border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
}
.code-chip-popover-close:hover { color: var(--fg); background: rgba(255,255,255,0.05); }
.code-chip-popover-body {
  margin: 0; padding: 12px 14px;
  overflow: auto;
  font-family: var(--font-mono); font-size: 12px; line-height: 1.55;
  color: var(--fg);
  white-space: pre;
}

@media (max-width: 768px) {
  .code-chip-popover {
    min-width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
    left: 50%;
    transform: translateX(-50%);
  }
}
</style>
