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
  border-radius: 8px;
  font-family: var(--font-sans);
  font-weight: 600; cursor: pointer; white-space: nowrap;
  transition: background .12s, border-color .12s, color .12s, transform .1s;
  border: 1px solid transparent;
}
.ds-btn:active:not(:disabled) { transform: translateY(1px); }
.ds-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* sizes */
.ds-btn--md { height: 32px; padding: 0 13px; font-size: 12px; }
.ds-btn--sm { height: 28px; padding: 0 10px; font-size: 11px; border-radius: 6px; }

/* variants */
.ds-btn--default {
  background: var(--line);
  border-color: var(--line-2);
  color: var(--fg-mute);
}
.ds-btn--default:hover:not(:disabled) {
  background: var(--line-2);
  border-color: var(--line-3);
  color: var(--fg);
}
.ds-btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-fg);
  font-weight: 700;
}
.ds-btn--primary:hover:not(:disabled) {
  background: color-mix(in oklab, var(--accent) 88%, #fff);
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

/* icon-only square */
.ds-btn--icon-only.ds-btn--md { width: 32px; padding: 0; justify-content: center; }
.ds-btn--icon-only.ds-btn--sm { width: 28px; padding: 0; justify-content: center; }
</style>
