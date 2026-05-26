<template>
  <div class="ds-empty">
    <div class="ds-empty-icon">
      <slot name="icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="5"/><path d="m14 14 7 7M14 9h7M17.5 5.5v7"/></svg>
      </slot>
    </div>
    <div class="ds-empty-title">{{ title }}</div>
    <div class="ds-empty-sub">{{ sub }}</div>
    <slot name="action" />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: 'Nothing here yet' },
  sub:   { type: String, default: '' },
})
</script>

<style scoped>
.ds-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 48px 20px; gap: 8px;
}
.ds-empty-icon {
  width: 44px; height: 44px; border-radius: 10px;
  border: 1px dashed var(--line-2);
  display: grid; place-items: center;
  color: var(--fg-faint); margin-bottom: 4px;
}
.ds-empty-title { font-size: 11px; font-weight: 800; color: var(--fg-mute); }
.ds-empty-sub   { font-size: 11px; color: var(--fg-faint); text-align: center; }

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .ds-empty { padding: 36px 16px; }
}

@media (max-width: 768px) {
  .ds-empty { padding: 28px 16px; gap: 6px; }
  .ds-empty-icon { width: 40px; height: 40px; }
  .ds-empty-title { font-size: 12px; }
  .ds-empty-sub   { font-size: 12px; }
}
</style>
