<template>
  <form class="cp-form" @submit.prevent="submit">
    <div class="cp-field">
      <label>Current password</label>
      <DsInput v-model="cur" type="password" autocomplete="current-password" :error="!!error" />
    </div>
    <div class="cp-field">
      <label>New password</label>
      <DsInput v-model="next" type="password" autocomplete="new-password" :error="!!error" />
      <PasswordStrengthBar :password="next" />
    </div>
    <div class="cp-field">
      <label>Confirm new password</label>
      <DsInput v-model="confirm" type="password" autocomplete="new-password" :error="!!error" />
    </div>

    <div v-if="error" class="cp-error">{{ error }}</div>

    <div class="cp-foot">
      <DsButton type="submit" variant="primary" :disabled="saving || !canSubmit">
        {{ saving ? 'Saving…' : 'Change password' }}
      </DsButton>
    </div>
  </form>
</template>

<script setup>
const emit = defineEmits(['changed'])
const { apiFetch } = useApi()
const { show: showToast } = useToast()

const cur     = ref('')
const next    = ref('')
const confirm = ref('')
const saving  = ref(false)
const error   = ref('')

const canSubmit = computed(() =>
  cur.value && next.value.length >= 8 && next.value === confirm.value
)

async function submit() {
  if (!canSubmit.value) {
    if (next.value.length < 8)      error.value = 'New password must be ≥ 8 characters'
    else if (next.value !== confirm.value) error.value = "Passwords don't match"
    else                             error.value = 'Fill all fields'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await apiFetch('/api/me/password', {
      method: 'POST',
      body: { current_password: cur.value, new_password: next.value },
      _skipLoader: true,
    })
    showToast('Password changed', 'success')
    cur.value = ''; next.value = ''; confirm.value = ''
    emit('changed')
  } catch (e) {
    error.value = e?.data?.error || 'Failed to change password'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cp-form { display: flex; flex-direction: column; gap: 14px; max-width: 420px; }
.cp-field { display: flex; flex-direction: column; gap: 5px; }
.cp-field label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--fg-mute);
}
.cp-error {
  padding: 8px 11px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 7px;
  color: #fca5a5;
  font-size: 12px;
}
.cp-foot { display: flex; justify-content: flex-start; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .cp-form { max-width: 100%; gap: 12px; }
  .cp-foot :deep(button) { width: 100%; justify-content: center; min-height: 44px; }
}
</style>
