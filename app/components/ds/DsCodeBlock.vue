<template>
  <div class="ds-code-block">
    <button class="ds-code-copy" :class="{ copied }" @click="copy" type="button">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="8" y="8" width="12" height="12" rx="2"/>
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>
      </svg>
      {{ copied ? 'Copied!' : 'Copy' }}
    </button>
    <pre class="ds-code-pre"><code>{{ code }}</code></pre>
  </div>
</template>

<script setup>
const props = defineProps({
  code: { type: String, default: '' },
})

const copied = ref(false)
async function copy() {
  await navigator.clipboard.writeText(props.code).catch(() => {})
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<style scoped>
.ds-code-block {
  position: relative;
  background: var(--bg-elev-3);
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}
.ds-code-pre {
  padding: 14px 16px;
  color: var(--fg-mute);
  font-family: var(--font-mono);
  font-size: 11px; line-height: 1.7;
  white-space: pre; overflow-x: auto;
  margin: 0;
}
.ds-code-copy {
  position: absolute; top: 8px; right: 8px;
  display: inline-flex; align-items: center; gap: 5px;
  height: 24px; padding: 0 9px;
  background: var(--line); border: 1px solid var(--line-2);
  border-radius: 5px; color: var(--fg-mute);
  font-size: 10px; font-weight: 600; font-family: var(--font-mono);
  cursor: pointer;
  transition: color .12s, background .12s;
}
.ds-code-copy:hover { background: var(--line-2); color: var(--fg); }
.ds-code-copy.copied { color: var(--ok); border-color: color-mix(in oklab, var(--ok) 35%, transparent); }

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .ds-code-pre { padding: 10px 12px; font-size: 10.5px; }
}

@media (max-width: 768px) {
  .ds-code-pre {
    padding: 10px 10px;
    font-size: 11px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  /* Bigger copy button tap target */
  .ds-code-copy { height: 28px; padding: 0 10px; font-size: 11px; }
}
</style>
