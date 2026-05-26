<template>
  <Teleport to="body">
    <div class="ds-toast-container">
      <TransitionGroup name="ds-toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="ds-toast"
          :class="`ds-toast--${t.variant}`"
        >
          <span class="ds-toast-ic" v-html="icons[t.variant]" />
          <span class="ds-toast-msg">{{ t.message }}</span>
          <button class="ds-toast-close" @click="dismiss(t.id)" aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
const toast = useToast()
const toasts = toast.toasts
const dismiss = toast.dismiss

const icons = {
  success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>`,
  error:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
}
</script>

<style scoped>
.ds-toast-container {
  position: fixed; top: 20px; right: 24px;
  display: flex; flex-direction: column; gap: 8px;
  z-index: 9999;
  pointer-events: none;
  width: max-content;
  max-width: min(480px, calc(100vw - 48px));
}

.ds-toast {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 11px 12px 11px 14px;
  border-radius: 10px;
  font-size: 12px; font-weight: 600;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  border-left: 3px solid transparent;
  width: 100%;
  pointer-events: all;
  box-sizing: border-box;
}

/* ── Variants ─────────────────────────────────── */
.ds-toast--success {
  background: rgba(52, 211, 153, 0.12);
  border-left-color: #34d399;
  color: #a7f3d0;
  box-shadow: 0 8px 32px rgba(52, 211, 153, 0.15), 0 2px 8px rgba(0,0,0,0.4);
}
.ds-toast--success .ds-toast-ic  { color: #34d399; }
.ds-toast--success .ds-toast-close:hover { background: rgba(52,211,153,0.15); }

.ds-toast--error {
  background: rgba(248, 113, 113, 0.12);
  border-left-color: #f87171;
  color: #fca5a5;
  box-shadow: 0 8px 32px rgba(248, 113, 113, 0.15), 0 2px 8px rgba(0,0,0,0.4);
}
.ds-toast--error .ds-toast-ic  { color: #f87171; }
.ds-toast--error .ds-toast-close:hover { background: rgba(248,113,113,0.15); }

.ds-toast--warning {
  background: rgba(251, 191, 36, 0.12);
  border-left-color: #fbbf24;
  color: #fde68a;
  box-shadow: 0 8px 32px rgba(251, 191, 36, 0.15), 0 2px 8px rgba(0,0,0,0.4);
}
.ds-toast--warning .ds-toast-ic  { color: #fbbf24; }
.ds-toast--warning .ds-toast-close:hover { background: rgba(251,191,36,0.15); }

.ds-toast--info {
  background: rgba(96, 165, 250, 0.12);
  border-left-color: #60a5fa;
  color: #bfdbfe;
  box-shadow: 0 8px 32px rgba(96, 165, 250, 0.15), 0 2px 8px rgba(0,0,0,0.4);
}
.ds-toast--info .ds-toast-ic  { color: #60a5fa; }
.ds-toast--info .ds-toast-close:hover { background: rgba(96,165,250,0.15); }

/* ── Parts ────────────────────────────────────── */
.ds-toast-ic  { display: grid; place-items: center; flex-shrink: 0; margin-top: 1px; }
.ds-toast-msg { flex: 1; white-space: normal; word-break: break-word; line-height: 1.5; }

.ds-toast-close {
  display: grid; place-items: center;
  flex-shrink: 0;
  margin-left: 4px;
  padding: 2px;
  background: none; border: none; cursor: pointer;
  color: var(--fg-faint);
  border-radius: 4px;
  transition: color .15s, background .15s;
}
.ds-toast-close:hover { color: var(--fg); }

/* ── Animation ────────────────────────────────── */
.ds-toast-enter-active { transition: opacity .2s ease, transform .25s cubic-bezier(.4,0,.2,1); }
.ds-toast-leave-active { transition: opacity .18s ease, transform .18s ease; position: absolute; }
.ds-toast-enter-from   { opacity: 0; transform: translateX(24px); }
.ds-toast-leave-to     { opacity: 0; transform: translateX(16px); }
.ds-toast-move         { transition: transform .25s cubic-bezier(.4,0,.2,1); }

@media (max-width: 768px) {
  .ds-toast-list {
    top: auto;
    bottom: 16px;
    right: 12px;
    left: 12px;
    align-items: stretch;
  }
  .ds-toast-item {
    max-width: 100%;
    width: 100%;
    font-size: 12.5px;
  }
}
</style>
