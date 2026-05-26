<template>
  <div class="av-wrap">
    <div class="av-circle" :title="modelValue ? 'Click to replace' : 'Click to upload'">
      <img v-if="modelValue" :src="modelValue" alt="" />
      <span v-else class="av-initials">{{ initials }}</span>
    </div>
    <div class="av-actions">
      <input ref="file" type="file" accept="image/*" hidden @change="onPick" />
      <DsButton size="sm" variant="ghost" :disabled="uploading" @click="file?.click()">
        {{ uploading ? 'Uploading…' : (modelValue ? 'Change' : 'Upload') }}
      </DsButton>
      <DsButton v-if="modelValue" size="sm" variant="danger" :disabled="uploading" @click="remove">
        Remove
      </DsButton>
    </div>
    <p class="av-hint">PNG or JPG, ≤ 256 KB.</p>
    <p v-if="error" class="av-error">{{ error }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },     // data URI or URL
  initials:   { type: String, default: '??' },
})
const emit = defineEmits(['update:modelValue', 'change'])

const { apiFetch } = useApi()
const { show: showToast } = useToast()

const file = ref(null)
const uploading = ref(false)
const error = ref('')

async function onPick(e) {
  const f = e.target.files?.[0]
  if (!f) return
  if (!f.type.startsWith('image/')) { error.value = 'Please pick an image file'; return }
  if (f.size > 256 * 1024)          { error.value = 'Max 256 KB'; return }
  uploading.value = true
  error.value = ''
  try {
    const form = new FormData()
    form.append('avatar', f)
    const config = useRuntimeConfig()
    const auth   = useAuthStore()
    const res = await fetch(`${config.public.apiBase}/api/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.getToken()}` },
      body: form,
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    emit('update:modelValue', data.avatar_url)
    emit('change', data.avatar_url)
    showToast('Avatar updated', 'success')
  } catch (e) {
    error.value = e.message || 'Upload failed'
  } finally {
    uploading.value = false
    if (file.value) file.value.value = ''
  }
}

async function remove() {
  uploading.value = true
  try {
    await apiFetch(`/api/me/avatar`, { method: 'DELETE', _skipLoader: true })
    emit('update:modelValue', '')
    emit('change', '')
    showToast('Avatar removed', 'success')
  } catch (e) {
    error.value = e?.data?.error || 'Failed'
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.av-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.av-circle {
  width: 92px; height: 92px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: linear-gradient(135deg, #3b3b42, #1c1c22);
  display: grid; place-items: center;
  overflow: hidden;
  cursor: pointer;
  font-size: 24px;
  font-weight: 700;
  color: var(--fg);
}
.av-circle img { width: 100%; height: 100%; object-fit: cover; }
.av-initials { letter-spacing: 0.04em; }
.av-actions { display: flex; gap: 8px; }
.av-hint { margin: 0; font-size: 10.5px; color: var(--fg-faint); }
.av-error { margin: 0; font-size: 11.5px; color: var(--danger); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .av-circle { width: 80px; height: 80px; font-size: 20px; }
  .av-actions { gap: 10px; }
  .av-actions :deep(button) { min-height: 40px; padding: 0 16px; }
}
</style>
