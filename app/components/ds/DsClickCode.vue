<template>
  <div class="dcc-wrap" :class="{ open }">
    <div class="dcc-target" @click="open = !open" :title="open ? 'Hide code' : 'Click to see code'">
      <slot />
      <span class="dcc-hint" :class="{ visible: !open }">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </span>
    </div>

    <transition name="dcc">
      <div v-if="open" class="dcc-panel">
        <div class="dcc-panel-header">
          <span class="dcc-panel-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            {{ label || 'Code' }}
          </span>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="dcc-copy" :class="{ copied }" @click.stop="copy">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
            <button class="dcc-close" @click.stop="open = false">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <pre class="dcc-pre"><code>{{ code }}</code></pre>
      </div>
    </transition>
  </div>
</template>

<script setup>
const props = defineProps({
  code:  { type: String, default: '' },
  label: { type: String, default: '' },
})

const open   = ref(false)
const copied = ref(false)

async function copy() {
  await navigator.clipboard.writeText(props.code).catch(() => {})
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<style scoped>
/* block by default so code panel renders below */
.dcc-wrap { display: block; }

.dcc-target {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  transition: outline .1s;
  outline: 2px solid transparent;
  outline-offset: 3px;
}
.dcc-target:hover {
  outline-color: rgba(216,255,91,0.25);
}
.dcc-wrap.open .dcc-target {
  outline-color: rgba(216,255,91,0.45);
}

/* floating hint badge */
.dcc-hint {
  position: absolute; top: -8px; right: -8px;
  width: 20px; height: 20px; border-radius: 999px;
  background: rgba(216,255,91,0.15);
  border: 1px solid rgba(216,255,91,0.3);
  color: var(--ds-accent, #d8ff5b);
  display: grid; place-items: center;
  opacity: 0;
  transition: opacity .15s;
  pointer-events: none;
  z-index: 2;
}
.dcc-target:hover .dcc-hint.visible,
.dcc-wrap.open .dcc-hint { opacity: 1; }

/* slide-down panel */
.dcc-panel {
  margin-top: 8px;
  background: var(--bg-elev-3);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  border-radius: 8px;
  overflow: hidden;
}
.dcc-panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 12px;
  background: color-mix(in oklab, var(--accent) 6%, transparent);
  border-bottom: 1px solid var(--line);
}
.dcc-panel-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--accent);
}
.dcc-pre {
  padding: 12px 14px;
  color: var(--fg-mute);
  font-family: var(--font-mono);
  font-size: 11px; line-height: 1.65;
  white-space: pre; overflow-x: auto;
  margin: 0;
}
.dcc-copy {
  display: inline-flex; align-items: center; gap: 4px;
  height: 22px; padding: 0 8px;
  background: var(--line); border: 1px solid var(--line-2);
  border-radius: 4px; color: var(--fg-mute);
  font-size: 10px; font-weight: 600; font-family: var(--font-mono);
  cursor: pointer; transition: color .12s, background .12s;
}
.dcc-copy:hover { background: var(--line-2); color: var(--fg); }
.dcc-copy.copied { color: var(--ok); border-color: color-mix(in oklab, var(--ok) 35%, transparent); }

.dcc-close {
  background: transparent; border: 0;
  color: var(--fg-mute); cursor: pointer; padding: 0;
  display: grid; place-items: center; width: 22px; height: 22px;
  border-radius: 4px; transition: color .1s, background .1s;
}
.dcc-close:hover { color: var(--fg); background: var(--line); }

/* transition */
.dcc-enter-active { transition: opacity .18s ease, transform .2s cubic-bezier(.4,0,.2,1), max-height .22s ease; }
.dcc-leave-active { transition: opacity .14s ease, transform .14s ease, max-height .16s ease; }
.dcc-enter-from { opacity: 0; transform: translateY(-6px); }
.dcc-leave-to   { opacity: 0; transform: translateY(-4px); }

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .dcc-pre { padding: 10px 12px; }
}

@media (max-width: 768px) {
  .dcc-pre {
    padding: 10px 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    font-size: 11px;
  }
  /* Bigger tap target for copy/close */
  .dcc-copy  { height: 28px; padding: 0 10px; }
  .dcc-close { width: 28px; height: 28px; }
  /* Hint badge is less useful on touch; hide to reduce clutter */
  .dcc-hint  { display: none; }
}
</style>
