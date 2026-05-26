<template>
  <div class="ds-dd-wrap" ref="wrapRef">
    <!-- Trigger -->
    <div
      class="ds-dd-trigger"
      :class="[`ds-dd-trigger--${size}`, { open, disabled }]"
      @click="!disabled && toggle()"
      role="combobox"
      :aria-expanded="open"
    >
      <span class="ds-dd-value" :class="{ placeholder: !selectedLabel }">
        {{ selectedLabel || placeholder }}
      </span>
      <svg class="ds-dd-chevron" :class="{ open }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </div>

    <!-- Menu -->
    <Transition name="ds-dd-menu">
      <div v-if="open" class="ds-dd-menu" :class="`ds-dd-menu--${align}`" role="listbox">
        <div
          v-for="opt in options"
          :key="opt.value"
          class="ds-dd-item"
          :class="{ selected: opt.value === modelValue, disabled: opt.disabled }"
          @click="!opt.disabled && select(opt.value)"
          role="option"
          :aria-selected="opt.value === modelValue"
        >
          <svg v-if="opt.value === modelValue" class="ds-dd-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m5 12 5 5L20 7"/>
          </svg>
          <span v-else class="ds-dd-check-gap" />
          {{ opt.label }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue:  { type: [String, Number, Boolean], default: null },
  options:     { type: Array, default: () => [] }, // [{ value, label, disabled? }]
  placeholder: { type: String,  default: 'Select…' },
  size:        { type: String,  default: 'md' }, // md | sm
  align:       { type: String,  default: 'left' }, // left | right
  disabled:    { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])

const open    = ref(false)
const wrapRef = ref(null)

const selectedLabel = computed(() =>
  props.options.find(o => o.value === props.modelValue)?.label ?? ''
)

function toggle() { open.value = !open.value }

function select(value) {
  emit('update:modelValue', value)
  emit('change', value)
  open.value = false
}

function onOutside(e) {
  if (wrapRef.value && !wrapRef.value.contains(e.target)) open.value = false
}

onMounted(()       => document.addEventListener('mousedown', onOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onOutside))
</script>

<style scoped>
.ds-dd-wrap { position: relative; display: inline-block; width: 100%; }

/* Trigger */
.ds-dd-trigger {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  background: var(--line);
  border: 1px solid var(--line-2);
  border-radius: 8px;
  color: var(--fg);
  cursor: pointer; user-select: none;
  transition: border-color .12s, background .12s, box-shadow .12s;
  width: 100%;
}
.ds-dd-trigger--md { height: 34px; padding: 0 10px 0 12px; font-size: 12px; }
.ds-dd-trigger--sm { height: 28px; padding: 0 8px  0 10px; font-size: 11px; border-radius: 6px; }

.ds-dd-trigger.open,
.ds-dd-trigger:not(.disabled):hover {
  border-color: var(--line-3);
  background: var(--line-2);
}
.ds-dd-trigger.open {
  border-color: color-mix(in oklab, var(--accent) 45%, transparent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 10%, transparent);
}
.ds-dd-trigger.disabled { opacity: 0.4; cursor: not-allowed; }

.ds-dd-value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ds-dd-value.placeholder { color: var(--fg-faint); }

.ds-dd-chevron { color: var(--fg-mute); flex-shrink: 0; transition: transform .18s ease; }
.ds-dd-chevron.open { transform: rotate(180deg); color: var(--fg-dim); }

/* Menu */
.ds-dd-menu {
  position: absolute; top: calc(100% + 5px);
  background: var(--bg-elev-2);
  border: 1px solid var(--line-2);
  border-radius: 10px;
  padding: 4px;
  min-width: 100%;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15);
  z-index: 500;
  max-height: 240px; overflow-y: auto;
}
.ds-dd-menu--left  { left: 0; }
.ds-dd-menu--right { right: 0; }

/* Item */
.ds-dd-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px;
  border-radius: 7px;
  font-size: 12px; color: var(--fg-mute);
  cursor: pointer;
  transition: background .1s, color .1s;
  white-space: nowrap;
}
.ds-dd-item:hover:not(.disabled):not(.selected) {
  background: var(--line); color: var(--fg);
}
.ds-dd-item.selected {
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  color: var(--accent);
}
.ds-dd-item.disabled { opacity: 0.35; cursor: not-allowed; }

.ds-dd-check     { color: var(--accent); flex-shrink: 0; }
.ds-dd-check-gap { width: 12px; flex-shrink: 0; }

/* Animation */
.ds-dd-menu-enter-active { transition: opacity .15s ease, transform .15s cubic-bezier(.4,0,.2,1); }
.ds-dd-menu-leave-active { transition: opacity .1s ease, transform .1s ease; }
.ds-dd-menu-enter-from   { opacity: 0; transform: translateY(-6px) scale(0.98); }
.ds-dd-menu-leave-to     { opacity: 0; transform: translateY(-4px) scale(0.99); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .ds-dd-trigger--md { height: 38px; font-size: 13px; }
  .ds-dd-trigger--sm { height: 34px; font-size: 12px; }
  .ds-dd-item { padding: 9px 12px; font-size: 13px; }
  .ds-dd-menu { max-height: 200px; }
}
</style>
