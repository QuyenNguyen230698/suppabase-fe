<template>
  <button
    :class="['ds-btn', `ds-btn--${variant}`, `ds-btn--${size}`, { 'ds-btn--icon-only': iconOnly }]"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup>
defineOptions({ inheritAttrs: false })
defineProps({
  variant: { type: String, default: 'default' }, // default | primary | danger | ghost-danger
  size:    { type: String, default: 'md' },       // md | sm
  disabled: { type: Boolean, default: false },
  iconOnly: { type: Boolean, default: false },
})
</script>

<style scoped>
.ds-btn {
  display: inline-flex; align-items: center; gap: 7px;
  border-radius: 999px;                 /* pill — Apple-soft */
  font-family: var(--font-sans);
  font-weight: 600; cursor: pointer; white-space: nowrap;
  transition: background .15s, border-color .15s, color .15s, box-shadow .2s, transform .12s var(--spring);
  border: 1px solid transparent;
}
.ds-btn:active:not(:disabled) { transform: scale(0.96); }   /* .press */
.ds-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* sizes */
.ds-btn--md { height: 34px; padding: 0 16px; font-size: 12px; }
.ds-btn--sm { height: 28px; padding: 0 12px; font-size: 11px; }

/* variants */
.ds-btn--default {
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  backdrop-filter: blur(12px) saturate(160%);
  border-color: var(--line-2);
  color: var(--fg-dim);
  box-shadow: var(--shadow-card);
}
.ds-btn--default:hover:not(:disabled) {
  border-color: var(--line-3);
  color: var(--fg);
}
.ds-btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-fg);
  font-weight: 700;
  box-shadow: var(--shadow-pill);
}
.ds-btn--primary:hover:not(:disabled) {
  background: var(--accent-dark);
}
.ds-btn--danger {
  color: var(--danger);
  border-color: color-mix(in oklab, var(--danger) 40%, transparent);
  background: color-mix(in oklab, var(--danger) 8%, transparent);
}
.ds-btn--danger:hover:not(:disabled) {
  background: color-mix(in oklab, var(--danger) 14%, transparent);
  border-color: color-mix(in oklab, var(--danger) 60%, transparent);
}
.ds-btn--ghost-danger {
  color: var(--danger);
  border-color: transparent;
  background: transparent;
}
.ds-btn--ghost-danger:hover:not(:disabled) {
  background: color-mix(in oklab, var(--danger) 10%, transparent);
  border-color: color-mix(in oklab, var(--danger) 35%, transparent);
}

/* icon-only — round */
.ds-btn--icon-only.ds-btn--md { width: 34px; padding: 0; justify-content: center; }
.ds-btn--icon-only.ds-btn--sm { width: 28px; padding: 0; justify-content: center; }
</style>
