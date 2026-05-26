<template>
  <div :class="['ds-card', { 'ds-card--flush': flush }]">
    <div v-if="$slots.header" class="ds-card-header">
      <slot name="header" />
    </div>
    <div v-if="$slots.default" class="ds-card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="ds-card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  flush: { type: Boolean, default: false }, // no padding on body
})
</script>

<style scoped>
.ds-card {
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
}
.ds-card-header {
  display: flex; align-items: center; gap: 11px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}
.ds-card-body {
  padding: 14px 16px;
}
.ds-card--flush .ds-card-body {
  padding: 0;
}
.ds-card-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  background: var(--line);
}

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .ds-card-header { padding: 12px 14px; }
  .ds-card-body   { padding: 12px 14px; }
  .ds-card-footer { padding: 10px 14px; }
}

@media (max-width: 768px) {
  .ds-card { border-radius: 10px; }
  .ds-card-header { padding: 10px 12px; gap: 8px; }
  .ds-card-body   { padding: 10px 12px; }
  .ds-card-footer { padding: 10px 12px; }
}
</style>
