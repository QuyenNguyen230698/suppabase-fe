<template>
  <Teleport to="body">
    <Transition name="ds-modal-backdrop">
      <div v-if="modelValue" class="ds-modal-backdrop" @click.self="closeOnBackdrop && close()">
        <Transition name="ds-modal-panel" appear>
          <div v-if="modelValue" class="ds-modal" :class="`ds-modal--${size}`" role="dialog" aria-modal="true">

            <!-- Header -->
            <div class="ds-modal-head">
              <div class="ds-modal-title">
                <slot name="title">{{ title }}</slot>
              </div>
              <button class="ds-modal-close" @click="close" aria-label="Close">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Body -->
            <div class="ds-modal-body">
              <slot />
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" class="ds-modal-foot">
              <slot name="footer" />
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue:      { type: Boolean, default: false },
  title:           { type: String,  default: '' },
  size:            { type: String,  default: 'md' }, // sm | md | lg
  closeOnBackdrop: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'close'])

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onEsc(e) { if (e.key === 'Escape') close() }

watch(() => props.modelValue, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(()        => document.addEventListener('keydown', onEsc))
onBeforeUnmount(()  => {
  document.removeEventListener('keydown', onEsc)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<style scoped>
.ds-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(5, 5, 7, 0.65);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.ds-modal {
  background: var(--bg-elev);
  border: 1px solid var(--line-2);
  border-radius: 16px;
  width: 100%;
  box-shadow: 0 24px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.15);
  display: flex; flex-direction: column;
  max-height: calc(100vh - 48px);
  overflow: hidden;
}
.ds-modal--sm { max-width: 360px; }
.ds-modal--md { max-width: 480px; }
.ds-modal--lg { max-width: 640px; }

/* Header */
.ds-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.ds-modal-title {
  font-family: var(--font-serif);
  font-size: 19px; font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--fg);
}
.ds-modal-close {
  width: 28px; height: 28px; border-radius: 7px;
  background: transparent; border: 1px solid var(--line-2);
  color: var(--fg-mute); display: grid; place-items: center;
  cursor: pointer; flex-shrink: 0;
  transition: background .12s, color .12s, border-color .12s;
}
.ds-modal-close:hover { background: var(--line); color: var(--fg); border-color: var(--line-3); }

/* Body */
.ds-modal-body {
  padding: 18px 20px;
  overflow-y: auto;
  flex: 1;
}

/* Footer */
.ds-modal-foot {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
  background: var(--line);
  flex-shrink: 0;
}

/* Animations */
.ds-modal-backdrop-enter-active,
.ds-modal-backdrop-leave-active { transition: opacity .18s ease; }
.ds-modal-backdrop-enter-from,
.ds-modal-backdrop-leave-to     { opacity: 0; }

.ds-modal-panel-enter-active { transition: opacity .2s ease, transform .22s cubic-bezier(.3,.7,.4,1.1); }
.ds-modal-panel-leave-active { transition: opacity .15s ease, transform .15s ease; }
.ds-modal-panel-enter-from   { opacity: 0; transform: translateY(10px) scale(0.97); }
.ds-modal-panel-leave-to     { opacity: 0; transform: translateY(6px) scale(0.98); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .ds-modal-backdrop { padding: 8px; align-items: flex-end; }
  .ds-modal {
    border-radius: 14px 14px 10px 10px;
    max-height: calc(100vh - 24px);
  }
  .ds-modal--sm,
  .ds-modal--md,
  .ds-modal--lg { max-width: 100%; }
  .ds-modal-head { padding: 14px 16px 12px; }
  .ds-modal-title { font-size: 16px; }
  .ds-modal-body { padding: 14px 16px; }
  .ds-modal-foot { padding: 12px 16px; gap: 6px; }
  .ds-modal-foot > * { flex: 1; }
}
</style>
