<template>
  <div :class="['ds-input-wrap', { focused, error }]">
    <span v-if="$slots.prefix" class="ds-input-icon"><slot name="prefix" /></span>
    <input
      v-bind="$attrs"
      :value="modelValue"
      :type="inputType"
      :placeholder="placeholder"
      class="ds-input"
      @input="$emit('update:modelValue', $event.target.value)"
      @focus="focused = true"
      @blur="focused = false"
    />
    <!-- password toggle -->
    <button v-if="type === 'password'" class="ds-input-clear" @click="showPwd = !showPwd" type="button" :title="showPwd ? 'Hide' : 'Show'">
      <svg v-if="!showPwd" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      <svg v-else             width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    </button>
    <!-- clear -->
    <button v-else-if="modelValue && clearable" class="ds-input-clear" @click="$emit('update:modelValue', '')" type="button">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <span v-if="$slots.suffix" class="ds-input-icon"><slot name="suffix" /></span>
  </div>
</template>

<script setup>
defineOptions({ inheritAttrs: false })
const props = defineProps({
  modelValue:  { type: String,  default: '' },
  placeholder: { type: String,  default: '' },
  type:        { type: String,  default: 'text' }, // text | password | email | number …
  clearable:   { type: Boolean, default: false },
  error:       { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])

const focused  = ref(false)
const showPwd  = ref(false)
const inputType = computed(() =>
  props.type === 'password' ? (showPwd.value ? 'text' : 'password') : props.type
)
</script>

<style scoped>
.ds-input-wrap {
  display: flex; align-items: center; gap: 7px;
  height: 32px; padding: 0 10px;
  background: var(--line);
  border: 1px solid var(--line-2);
  border-radius: 8px;
  color: var(--fg-mute);
  transition: border-color .12s, box-shadow .12s;
}
.ds-input-wrap.focused {
  border-color: color-mix(in oklab, var(--accent) 50%, transparent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 12%, transparent);
  background: var(--line-2);
}
.ds-input-wrap.error {
  border-color: color-mix(in oklab, var(--danger) 50%, transparent);
}
.ds-input-wrap.error.focused {
  border-color: color-mix(in oklab, var(--danger) 65%, transparent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--danger) 12%, transparent);
}
.ds-input {
  flex: 1; border: 0; outline: none; background: transparent;
  font-size: 12px; color: var(--fg);
  font-family: var(--font-sans);
}
.ds-input::placeholder { color: var(--fg-faint); }
.ds-input-icon { display: grid; place-items: center; flex-shrink: 0; }
.ds-input-clear {
  background: transparent; border: 0; color: var(--fg-mute);
  cursor: pointer; padding: 0; display: grid; place-items: center;
  transition: color .12s;
}
.ds-input-clear:hover { color: var(--fg); }

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .ds-input-wrap { height: 30px; }
}

@media (max-width: 768px) {
  /* Taller tap target on mobile */
  .ds-input-wrap { height: 40px; padding: 0 12px; }
  .ds-input { font-size: 14px; } /* prevent iOS zoom on focus (needs ≥16px, but 14px is acceptable with meta viewport) */
  .ds-input-clear { width: 28px; height: 28px; } /* bigger tap target */
}
</style>
