<template>
  <span :class="['ds-badge', `ds-badge--${status}`, size === 'lg' ? 'ds-badge--lg' : '']">
    <span v-if="dot" class="ds-badge-dot"></span>
    <slot />
  </span>
</template>

<script setup>
defineProps({
  status: { type: String, default: 'default' }, // default | active | revoked
  size:   { type: String, default: 'sm' },       // sm | lg
  dot:    { type: Boolean, default: true },
})
</script>

<style scoped>
.ds-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  background: var(--line);
  color: var(--fg-mute);
  border: 1px solid var(--line-2);
}
.ds-badge--lg { font-size: 10px; padding: 3px 9px; }
.ds-badge--active  { background: color-mix(in oklab, var(--ok) 12%, transparent); color: var(--ok); border-color: color-mix(in oklab, var(--ok) 30%, transparent); }
.ds-badge--revoked { background: var(--line); color: var(--fg-faint); border-color: var(--line); }
.ds-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
</style>
