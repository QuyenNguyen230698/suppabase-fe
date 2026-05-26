<template>
  <DsModal v-model="open" :title="createdToken ? 'Token created' : 'New API Token'" size="sm" @close="$emit('close')">

    <!-- Create form -->
    <template v-if="!createdToken">
      <div class="field">
        <label class="field-label">Token name</label>
        <DsInput v-model="form.name" placeholder="e.g. ios-app, jenkins-ci" />
      </div>
      <div class="field">
        <label class="field-label">Expires</label>
        <DsDropdown v-model="form.expires_in" :options="expiryOptions" />
      </div>
      <div v-if="error" class="error-msg">{{ error }}</div>
    </template>

    <!-- Token reveal -->
    <template v-else>
      <div class="field">
        <label class="field-label">Your API Token</label>
        <div class="token-strip">
          <code>{{ createdToken }}</code>
          <button class="copy-btn" @click="copy" :data-copied="copied">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
        </div>
        <p class="token-hint">Copy this token now — it won't be shown again.</p>
      </div>
    </template>

    <template #footer>
      <template v-if="!createdToken">
        <DsButton variant="ghost" @click="$emit('close')">Cancel</DsButton>
        <DsButton variant="primary" @click="create" :disabled="loading || !form.name.trim()">
          {{ loading ? 'Creating…' : 'Generate token' }}
        </DsButton>
      </template>
      <template v-else>
        <DsButton variant="primary" @click="$emit('done')">Done</DsButton>
      </template>
    </template>

  </DsModal>
</template>

<script setup>
const { apiFetch } = useApi()
const emit = defineEmits(['close', 'done'])

const open = ref(true)

const expiryOptions = [
  { value: '1h',    label: '1 hour' },
  { value: '1d',    label: '1 day' },
  { value: '7d',    label: '7 days' },
  { value: '30d',   label: '30 days' },
  { value: 'never', label: 'Never' },
]

const form         = reactive({ name: '', expires_in: 'never' })
const loading      = ref(false)
const error        = ref('')
const createdToken = ref('')
const copied       = ref(false)

async function create() {
  loading.value = true
  error.value   = ''
  try {
    const data = await apiFetch('/api/admin/tokens', { method: 'POST', body: form })
    createdToken.value = data.token
  } catch (err) {
    error.value = err?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

async function copy() {
  await navigator.clipboard.writeText(createdToken.value).catch(() => {})
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<style scoped>
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field:last-child { margin-bottom: 0; }
.field-label {
  font-family: ui-monospace, "Geist Mono", monospace;
  font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase;
  color: #475569;
}

.error-msg {
  color: #fca5a5; font-size: 12px;
  padding: 8px 12px; border-radius: 8px;
  background: rgba(248,113,113,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  margin-bottom: 2px;
}

.token-strip {
  display: flex; align-items: stretch;
  background: #08080a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; overflow: hidden;
}
.token-strip code {
  flex: 1; min-width: 0;
  font-family: ui-monospace, monospace; font-size: 11.5px;
  padding: 10px 12px; color: #a3e635;
  white-space: nowrap; overflow-x: auto;
}
.copy-btn {
  padding: 0 12px; background: transparent; border: 0;
  border-left: 1px solid rgba(255,255,255,0.08);
  color: #475569; font-family: ui-monospace, monospace; font-size: 10.5px;
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  transition: background .12s, color .12s;
}
.copy-btn:hover { background: rgba(255,255,255,0.04); color: #e2e8f0; }
.copy-btn[data-copied="true"] { color: #d8ff5b; }

.token-hint { margin: 6px 0 0; font-size: 11px; color: #334155; }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .token-strip { flex-direction: column; }
  .token-strip code { white-space: pre-wrap; word-break: break-all; font-size: 11px; }
  .copy-btn {
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.08);
    padding: 8px 12px;
    justify-content: center;
    min-height: 38px;
  }
}
</style>
