<template>
  <DsModal v-model="open" :title="t('common.share')" size="md">
    <div v-if="loading" class="sd-loading">{{ t('common.loading') }}</div>

    <div v-else-if="error" class="sd-error">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ error }}
    </div>

    <div v-else class="sd-body">
      <p class="sd-desc">
        Anyone with the link can view this conversation read-only. They won't see your account.
      </p>

      <!-- Expiry selector -->
      <div class="sd-field">
        <label>Expires</label>
        <DsDropdown v-model="expiresIn" :options="EXPIRES_OPTIONS" />
      </div>

      <!-- Current link (if any) -->
      <div v-if="shareUrl" class="sd-link-row">
        <input ref="linkInput" :value="shareUrl" readonly @focus="selectAll" />
        <button class="sd-copy" @click="copy">
          <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 5 5L20 7"/></svg>
        </button>
      </div>

      <p v-if="expiresAt" class="sd-meta">
        Expires {{ formatDate(expiresAt) }}
      </p>
    </div>

    <template #footer>
      <DsButton v-if="shareUrl" variant="danger" :disabled="saving" @click="revoke">Revoke</DsButton>
      <DsButton variant="ghost" @click="open = false">{{ t('common.close') }}</DsButton>
      <DsButton variant="primary" :disabled="saving" @click="generate">
        {{ shareUrl ? 'Regenerate' : 'Create link' }}
      </DsButton>
    </template>
  </DsModal>
</template>

<script setup>
const props = defineProps({
  modelValue:     { type: Boolean, default: false },
  conversationId: { type: String, default: null },
  existingToken:  { type: String, default: null },
  existingExpiry: { type: [String, Date, null], default: null },
})
const emit = defineEmits(['update:modelValue', 'changed'])

const { apiFetch } = useApi()
const { show: showToast } = useToast()
const { t } = useI18n()

const EXPIRES_OPTIONS = [
  { value: '1d',    label: '1 day' },
  { value: '7d',    label: '7 days' },
  { value: '30d',   label: '30 days' },
  { value: 'never', label: 'Never expires' },
]

const open      = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const expiresIn = ref('never')
const shareUrl  = ref('')
const expiresAt = ref(null)
const saving    = ref(false)
const loading   = ref(false)
const error     = ref('')
const copied    = ref(false)
const linkInput = ref(null)

watch(() => props.modelValue, (v) => {
  if (!v) return
  // Pre-fill from existing share state on open
  shareUrl.value  = props.existingToken ? buildUrl(props.existingToken) : ''
  expiresAt.value = props.existingExpiry || null
  copied.value = false
  error.value  = ''
})

function buildUrl(token) {
  return `${window.location.origin}/share/${token}`
}

function selectAll(e) { e.target.select() }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString()
}

async function generate() {
  if (!props.conversationId) return
  saving.value = true
  error.value = ''
  try {
    const res = await apiFetch(`/api/conversations/${props.conversationId}/share`, {
      method: 'POST',
      body: { expires_in: expiresIn.value },
      _skipLoader: true,
    })
    shareUrl.value  = buildUrl(res.share_token)
    expiresAt.value = res.share_expires_at
    emit('changed', { token: res.share_token, expires_at: res.share_expires_at })
    showToast('Share link created', 'success')
    nextTick(() => linkInput.value?.select())
  } catch (e) {
    error.value = e?.data?.error || 'Failed to create link'
  } finally {
    saving.value = false
  }
}

async function revoke() {
  if (!props.conversationId) return
  saving.value = true
  try {
    await apiFetch(`/api/conversations/${props.conversationId}/share`, {
      method: 'DELETE', _skipLoader: true,
    })
    shareUrl.value  = ''
    expiresAt.value = null
    emit('changed', { token: null, expires_at: null })
    showToast('Share link revoked', 'success')
    open.value = false
  } catch (e) {
    error.value = e?.data?.error || 'Failed to revoke'
  } finally {
    saving.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {}
}
</script>

<style scoped>
.sd-body { display: flex; flex-direction: column; gap: 14px; }
.sd-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--fg-dim);
  line-height: 1.55;
}
.sd-field { display: flex; flex-direction: column; gap: 5px; }
.sd-field label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--fg-mute);
}

.sd-link-row {
  display: flex; gap: 6px;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 4px 4px 4px 10px;
}
.sd-link-row input {
  flex: 1; min-width: 0;
  background: transparent;
  border: 0; outline: 0;
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 11.5px;
}
.sd-copy {
  background: transparent; border: 0;
  color: var(--fg-mute);
  width: 28px; height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: grid; place-items: center;
}
.sd-copy:hover { color: var(--fg); background: rgba(255,255,255,0.06); }

.sd-meta {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-mute);
}
.sd-loading { padding: 16px; color: var(--fg-mute); text-align: center; }
.sd-error {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 8px;
  color: #fca5a5;
  font-size: 12px;
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .sd-body { gap: 12px; }
  .sd-link-row { padding: 4px 4px 4px 8px; }
  .sd-link-row input { font-size: 11px; }
}
</style>
