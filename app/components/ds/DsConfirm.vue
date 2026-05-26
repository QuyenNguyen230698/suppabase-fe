<template>
  <DsModal v-model="visible" :title="options.title" size="sm" :close-on-backdrop="false">
    <p v-if="options.message" class="ds-confirm-msg">{{ options.message }}</p>
    <template #footer>
      <DsButton variant="ghost" @click="cancel">{{ options.cancelLabel }}</DsButton>
      <DsButton :variant="options.variant === 'danger' ? 'danger' : 'primary'" @click="confirm">
        {{ options.confirmLabel }}
      </DsButton>
    </template>
  </DsModal>
</template>

<script setup>
const { visible, options, confirm, cancel } = useConfirm()
</script>

<style scoped>
.ds-confirm-msg {
  margin: 0;
  font-size: 13px;
  color: var(--fg-dim);
  line-height: 1.6;
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .ds-confirm-msg { font-size: 12.5px; }
}
</style>
