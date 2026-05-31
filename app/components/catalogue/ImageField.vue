<script setup>
/* Image input: paste a URL or upload a file (downscaled → base64 data URL).
   v-model is the image src string (URL or data URL). */
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  ratio: { type: String, default: '4 / 3' },   // preview aspect-ratio
  max: { type: Number, default: 1200 },         // max edge (px) for uploads
})
const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const busy = ref(false)
const error = ref('')

function setUrl(e) { emit('update:modelValue', e.target.value.trim()) }
function clear() { emit('update:modelValue', '') }
function pick() { fileInput.value?.click() }

/* Downscale an uploaded image to keep localStorage small, return a data URL. */
async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) { error.value = 'Chỉ chấp nhận ảnh'; return }
  busy.value = true; error.value = ''
  try {
    const dataUrl = await downscale(file, props.max)
    emit('update:modelValue', dataUrl)
  } catch {
    error.value = 'Không đọc được ảnh'
  } finally {
    busy.value = false
  }
}

function downscale(file, maxEdge) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width: w, height: h } = img
      const scale = Math.min(1, maxEdge / Math.max(w, h))
      w = Math.round(w * scale); h = Math.round(h * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}
</script>

<template>
  <div class="imgfield">
    <span v-if="label" class="if-label">{{ label }}</span>
    <div class="if-row">
      <div class="if-preview" :style="{ aspectRatio: ratio }">
        <img v-if="modelValue" :src="modelValue" alt="" />
        <span v-else class="if-empty">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        </span>
      </div>
      <div class="if-controls">
        <input class="if-url" type="text" :value="modelValue && modelValue.startsWith('data:') ? '(ảnh đã upload)' : modelValue" :readonly="modelValue && modelValue.startsWith('data:')" placeholder="Dán URL ảnh…" @change="setUrl" />
        <div class="if-btns">
          <button type="button" class="if-btn" :disabled="busy" @click="pick">{{ busy ? 'Đang xử lý…' : 'Upload' }}</button>
          <button v-if="modelValue" type="button" class="if-btn ghost" @click="clear">Xóa</button>
        </div>
        <span v-if="error" class="if-err">{{ error }}</span>
      </div>
    </div>
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
  </div>
</template>

<style scoped>
.imgfield { display: flex; flex-direction: column; gap: 5px; }
.if-label { font-size: 11.5px; font-weight: 600; color: var(--fg-dim); }
.if-row { display: flex; gap: 10px; align-items: flex-start; }
.if-preview { width: 72px; flex: none; border-radius: 7px; overflow: hidden; border: 1px solid var(--line-2); background: var(--bg-elev-2); display: grid; place-items: center; }
.if-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.if-empty { color: var(--fg-faint); }
.if-controls { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.if-url { appearance: none; width: 100%; font: inherit; font-size: 12.5px; padding: 7px 9px; border-radius: 7px; background: var(--bg-elev-2); border: 1px solid var(--line-2); color: var(--fg); }
.if-url:focus { outline: none; border-color: color-mix(in oklab, var(--accent) 55%, transparent); }
.if-url[readonly] { color: var(--fg-mute); font-style: italic; }
.if-btns { display: flex; gap: 6px; }
.if-btn { appearance: none; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 600; padding: 5px 11px; border-radius: 6px; background: var(--accent); color: var(--accent-fg); border: 1px solid var(--accent); transition: opacity .12s; }
.if-btn:hover:not(:disabled) { opacity: .9; }
.if-btn:disabled { opacity: .5; cursor: default; }
.if-btn.ghost { background: transparent; color: var(--fg-mute); border-color: var(--line-2); }
.if-btn.ghost:hover { color: var(--fg); border-color: var(--line-3); }
.if-err { font-size: 11px; color: var(--danger); }
</style>
