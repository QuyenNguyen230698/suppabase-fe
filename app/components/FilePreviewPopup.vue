<template>
  <Teleport to="body">
    <div v-if="modelValue" class="popup-backdrop" @click.self="close">
      <div class="popup">
        <div class="popup-header">
          <div class="popup-title">
            <component :is="fileIcon.svg" class="popup-title-icon" />
            <span>{{ file?.name }}</span>
            <span class="popup-kind-badge" :class="`kind-${file?.kind || 'document'}`">{{ kindLabel }}</span>
            <span class="popup-type">{{ fileTypeLabel }}</span>
          </div>
          <div class="popup-header-actions">
            <a
              v-if="file?.document_id"
              :href="`${apiBase}/api/documents/${file.document_id}/raw`"
              :download="file.name"
              class="popup-dl-btn"
              title="Download file"
              @click.prevent="downloadFile"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
            <button class="popup-close" @click="close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div class="popup-body">
          <!-- Expired -->
          <div v-if="isExpired" class="preview-state">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><path d="m4.9 4.9 14.2 14.2" stroke-width="1.5"/>
            </svg>
            <p class="state-title" style="color:#ff9a9a">File no longer available</p>
            <p class="state-sub"><strong>{{ file?.name }}</strong> was removed on {{ expiredAt }}</p>
            <p class="state-note">Attached files are stored for up to <strong>7 days</strong> after upload.</p>
          </div>

          <!-- Loading -->
          <div v-else-if="loading" class="preview-state">
            <div class="spinner" />
            <p class="state-sub">Loading preview…</p>
          </div>

          <!-- Fetch error -->
          <div v-else-if="fetchError" class="preview-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4;color:#ff9a9a"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p class="state-title" style="color:#ff9a9a">Failed to load preview</p>
            <p class="state-sub">{{ fetchError }}</p>
          </div>

          <!-- Image -->
          <div v-else-if="isImage" class="preview-center">
            <img v-if="blobUrl" :src="blobUrl" :alt="file?.name" class="preview-image" />
            <div v-else class="preview-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:.35"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              <p class="state-sub">Could not render image</p>
            </div>
          </div>

          <!-- PDF -->
          <div v-else-if="isPdf" class="preview-fill">
            <iframe v-if="blobUrl" :src="blobUrl" class="preview-iframe" />
            <div v-else class="preview-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:.35"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p class="state-sub">Could not render PDF</p>
            </div>
          </div>

          <!-- Text / Markdown / Code -->
          <div v-else-if="isText || isCode" class="preview-code">
            <div class="preview-code-bar">
              <span class="code-lang">{{ codeLang }}</span>
              <span class="code-lines">{{ lineCount }} lines</span>
            </div>
            <pre class="preview-pre"><code>{{ textContent || '(empty file)' }}</code></pre>
          </div>

          <!-- CSV -->
          <div v-else-if="isCsv" class="preview-csv">
            <table v-if="csvRows.length">
              <thead>
                <tr><th v-for="(h, i) in csvRows[0]" :key="i">{{ h }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in csvRows.slice(1, 201)" :key="ri">
                  <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="csvRows.length > 201" class="csv-truncated">Showing first 200 rows of {{ csvRows.length - 1 }}</p>
          </div>

          <!-- Office (docx / xlsx) — no inline preview -->
          <div v-else-if="isOffice" class="preview-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" style="opacity:.35">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            <p class="state-title">Preview not available for {{ fileTypeLabel }}</p>
            <p class="state-sub">Download the file to open it in the appropriate app.</p>
            <button class="dl-btn-large" @click="downloadFile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download {{ file?.name }}
            </button>
          </div>

          <!-- Fallback unsupported -->
          <div v-else class="preview-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.35"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p class="state-title">No preview for <strong>{{ fileTypeLabel }}</strong></p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
  file: Object,
  // file shape: { name, type, kind, document_id, expires_at?, r2_public_url? }
})
const emit = defineEmits(['update:modelValue'])

const config = useRuntimeConfig()
const auth = useAuthStore()
const apiBase = config.public.apiBase

// ── Type detection ────────────────────────────────────────────────────────────

const mimeType = computed(() => {
  const t = props.file?.type || ''
  if (t) return t
  const ext = (props.file?.name || '').split('.').pop().toLowerCase()
  const MAP = {
    txt: 'text/plain', md: 'text/markdown', mdx: 'text/markdown',
    csv: 'text/csv', html: 'text/html', css: 'text/css', xml: 'text/xml',
    json: 'application/json', js: 'application/javascript',
    ts: 'application/typescript', yaml: 'application/x-yaml',
    yml: 'application/x-yaml', sh: 'application/x-sh',
    py: 'application/x-python', sql: 'application/x-sql',
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return MAP[ext] || ''
})

const kind = computed(() => props.file?.kind || '')

const isImage   = computed(() => kind.value === 'image'    || mimeType.value.startsWith('image/'))
const isPdf     = computed(() => kind.value === 'pdf'      || mimeType.value === 'application/pdf')
const isCsv     = computed(() => mimeType.value === 'text/csv' || (props.file?.name || '').toLowerCase().endsWith('.csv'))
const isCode    = computed(() => kind.value === 'code')
const isText    = computed(() => kind.value === 'text'     || (!isCode.value && !isCsv.value && (mimeType.value.startsWith('text/') || TEXT_MIMES.has(mimeType.value))))
const isOffice  = computed(() => kind.value === 'document' || OFFICE_MIMES.has(mimeType.value))

const TEXT_MIMES = new Set([
  'application/json', 'application/xml', 'application/javascript',
  'application/typescript', 'application/x-yaml', 'application/x-sh',
  'application/x-python', 'application/x-sql',
])
const OFFICE_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])

const needsTextFetch  = computed(() => isText.value || isCode.value || isCsv.value)
const needsBinaryFetch = computed(() => isImage.value || isPdf.value)

// ── Labels & icons ────────────────────────────────────────────────────────────

const fileTypeLabel = computed(() => (props.file?.name || '').split('.').pop().toUpperCase() || 'FILE')

const kindLabel = computed(() => {
  const k = kind.value
  if (k === 'image')    return 'Image'
  if (k === 'pdf')      return 'PDF'
  if (k === 'document') return 'Document'
  if (k === 'code')     return 'Code'
  if (k === 'text')     return 'Text'
  return 'File'
})

const codeLang = computed(() => {
  const ext = (props.file?.name || '').split('.').pop().toLowerCase()
  const MAP = {
    js: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
    vue: 'Vue', py: 'Python', go: 'Go', rs: 'Rust', java: 'Java',
    kt: 'Kotlin', swift: 'Swift', c: 'C', cpp: 'C++', cs: 'C#',
    php: 'PHP', sh: 'Shell', sql: 'SQL', json: 'JSON', yaml: 'YAML',
    yml: 'YAML', toml: 'TOML', html: 'HTML', css: 'CSS', scss: 'SCSS',
    md: 'Markdown', mdx: 'MDX', xml: 'XML', lua: 'Lua', rb: 'Ruby',
    dart: 'Dart', r: 'R', scala: 'Scala',
  }
  return MAP[ext] || ext.toUpperCase() || 'Text'
})

const fileIcon = computed(() => {
  if (isImage.value)  return { svg: 'span' } // placeholder — using inline SVG in template
  if (isPdf.value)    return { svg: 'span' }
  if (isCode.value)   return { svg: 'span' }
  return { svg: 'span' }
})

// ── Expiry ────────────────────────────────────────────────────────────────────

const isExpired = computed(() => {
  if (!props.file?.expires_at) return false
  return new Date(props.file.expires_at) < new Date()
})

const expiredAt = computed(() => {
  if (!props.file?.expires_at) return ''
  return new Date(props.file.expires_at).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
})

// ── State ─────────────────────────────────────────────────────────────────────

const textContent = ref('')
const blobUrl     = ref('')
const loading     = ref(false)
const fetchError  = ref('')

const lineCount = computed(() => textContent.value ? textContent.value.split('\n').length : 0)

const csvRows = computed(() => {
  if (!textContent.value) return []
  return textContent.value.split('\n').filter(Boolean).map(line => {
    // Simple CSV parse — handles quoted fields
    const result = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { result.push(cur); cur = '' }
      else cur += ch
    }
    result.push(cur)
    return result
  })
})

// ── Fetch logic ───────────────────────────────────────────────────────────────

watch(() => [props.modelValue, props.file], async ([open]) => {
  if (blobUrl.value) { URL.revokeObjectURL(blobUrl.value); blobUrl.value = '' }
  textContent.value = ''
  fetchError.value = ''

  if (!open || !props.file || isExpired.value) return

  const docId  = props.file.document_id
  const headers = { Authorization: `Bearer ${auth.getToken()}` }

  if (needsTextFetch.value && docId) {
    loading.value = true
    try {
      const res = await fetch(`${apiBase}/api/documents/${docId}/content`, { headers })
      if (res.ok) {
        textContent.value = await res.text()
      } else {
        const j = await res.json().catch(() => ({}))
        fetchError.value = j.error || `Server error ${res.status}`
      }
    } catch (e) {
      fetchError.value = e.message || 'Network error'
    } finally {
      loading.value = false
    }
  } else if (needsBinaryFetch.value && docId) {
    loading.value = true
    try {
      const res = await fetch(`${apiBase}/api/documents/${docId}/raw`, { headers })
      if (res.ok) {
        const blob = await res.blob()
        blobUrl.value = URL.createObjectURL(blob)
      } else {
        const j = await res.json().catch(() => ({}))
        fetchError.value = j.error || `Server error ${res.status}`
      }
    } catch (e) {
      fetchError.value = e.message || 'Network error'
    } finally {
      loading.value = false
    }
  }
}, { immediate: false })

onUnmounted(() => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})

// ── Download ──────────────────────────────────────────────────────────────────

async function downloadFile() {
  if (!props.file?.document_id) return
  const headers = { Authorization: `Bearer ${auth.getToken()}` }
  try {
    const res = await fetch(`${apiBase}/api/documents/${props.file.document_id}/raw`, { headers })
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = props.file.name || 'download'
    a.click()
    URL.revokeObjectURL(url)
  } catch { /* silent */ }
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

function close() { emit('update:modelValue', false) }

onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
function onKey(e) { if (e.key === 'Escape') close() }
</script>

<style scoped>
.popup-backdrop {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn .15s ease;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.popup {
  background: var(--bg-elev);
  border: 1px solid var(--line-2);
  border-radius: 14px;
  width: min(900px, 94vw);
  max-height: 88vh;
  display: flex; flex-direction: column;
  box-shadow: 0 28px 90px rgba(0,0,0,0.65);
  animation: slideUp .18s cubic-bezier(.2,.7,.2,1);
  overflow: hidden;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(14px) scale(.98) }
  to   { opacity: 1; transform: none }
}

/* Header */
.popup-header {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.popup-title {
  display: flex; align-items: center; gap: 7px;
  flex: 1; min-width: 0;
}
.popup-title > span:first-of-type {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--fg);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 340px;
}
.popup-title-icon { color: var(--fg-mute); flex-shrink: 0; }
.popup-kind-badge {
  font-size: 10px; font-weight: 600; letter-spacing: .3px;
  padding: 1px 7px; border-radius: 4px; flex-shrink: 0;
  font-family: var(--font-mono);
}
.kind-image    { background: rgba(99,179,237,.12); color: #63b3ed; border: 1px solid rgba(99,179,237,.25); }
.kind-pdf      { background: rgba(252,129,74,.12);  color: #fc814a; border: 1px solid rgba(252,129,74,.25); }
.kind-code     { background: rgba(154,230,180,.12); color: #9ae6b4; border: 1px solid rgba(154,230,180,.25); }
.kind-text     { background: rgba(197,165,228,.12); color: #c5a5e4; border: 1px solid rgba(197,165,228,.25); }
.kind-document { background: rgba(246,224,94,.12);  color: #f6e05e; border: 1px solid rgba(246,224,94,.25); }
.kind-file     { background: rgba(160,174,192,.1);  color: #a0aec0; border: 1px solid rgba(160,174,192,.2); }

.popup-type {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-mute);
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--line-2);
  border-radius: 4px;
  padding: 1px 6px;
  flex-shrink: 0;
}
.popup-header-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.popup-dl-btn {
  display: grid; place-items: center;
  width: 28px; height: 28px; border-radius: 7px;
  color: var(--fg-mute); text-decoration: none;
  transition: color .12s, background .12s;
}
.popup-dl-btn:hover { color: var(--fg); background: rgba(255,255,255,0.06); }
.popup-close {
  background: transparent; border: 0;
  color: var(--fg-mute); cursor: pointer;
  width: 28px; height: 28px; border-radius: 7px;
  display: grid; place-items: center;
  transition: color .12s, background .12s;
}
.popup-close:hover { color: var(--fg); background: rgba(255,255,255,0.06); }

/* Body */
.popup-body {
  flex: 1; min-height: 0;
  overflow: auto;
  display: flex; flex-direction: column;
}

/* State screens (loading, error, expired, unsupported) */
.preview-state {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 60px 40px; text-align: center;
}
.state-title { font-size: 14px; font-weight: 500; color: var(--fg-dim); margin: 0; }
.state-sub   { font-size: 13px; color: var(--fg-mute); margin: 0; }
.state-sub strong { color: var(--fg); }
.state-note  { font-size: 12px; color: var(--fg-mute); font-family: var(--font-mono); margin: 0; }
.state-note strong { color: var(--fg-dim); }

/* Spinner */
.spinner {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,.08);
  border-top-color: rgba(255,255,255,.4);
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

/* Image */
.preview-center {
  flex: 1; display: flex; align-items: center; justify-content: center;
}
.preview-image {
  max-width: 100%; max-height: calc(88vh - 60px);
  object-fit: contain; padding: 20px; display: block;
}

/* PDF */
.preview-fill { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.preview-iframe { width: 100%; flex: 1; min-height: 520px; background: #fff; border: 0; }

/* Code / Text */
.preview-code { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.preview-code-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 16px;
  background: rgba(255,255,255,.03);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.code-lang { font-family: var(--font-mono); font-size: 11px; color: var(--fg-dim); }
.code-lines { font-family: var(--font-mono); font-size: 11px; color: var(--fg-mute); }
.preview-pre {
  flex: 1; overflow: auto; margin: 0;
  padding: 18px 20px;
  font-family: var(--font-mono); font-size: 12.5px; line-height: 1.7;
  color: var(--fg-dim);
  white-space: pre; tab-size: 2;
}
.preview-pre code { background: transparent; }

/* CSV table */
.preview-csv { flex: 1; overflow: auto; }
.preview-csv table {
  width: 100%; border-collapse: collapse;
  font-family: var(--font-mono); font-size: 12px;
}
.preview-csv th {
  position: sticky; top: 0;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--line);
  padding: 8px 12px; text-align: left;
  color: var(--fg-dim); font-weight: 600; white-space: nowrap;
}
.preview-csv td {
  padding: 6px 12px;
  border-bottom: 1px solid rgba(255,255,255,.04);
  color: var(--fg-mute);
  max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.preview-csv tr:hover td { background: rgba(255,255,255,.025); }
.csv-truncated {
  padding: 10px 16px; font-size: 11px; font-family: var(--font-mono);
  color: var(--fg-mute); text-align: center;
  border-top: 1px solid var(--line);
}

/* Download button (office files) */
.dl-btn-large {
  display: inline-flex; align-items: center; gap: 7px;
  margin-top: 4px;
  padding: 8px 18px; border-radius: 8px;
  background: rgba(255,255,255,.07); border: 1px solid var(--line-2);
  color: var(--fg-dim); font-size: 13px; cursor: pointer;
  transition: background .12s, color .12s;
}
.dl-btn-large:hover { background: rgba(255,255,255,.12); color: var(--fg); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .popup { width: min(720px, 96vw); }
}

@media (max-width: 768px) {
  .popup {
    width: 100%;
    max-height: 92vh;
    border-radius: 12px 12px 0 0;
    align-self: flex-end;
  }
  .popup-backdrop { align-items: flex-end; }
  .popup-header { padding: 9px 10px; }
  .popup-title > span:first-of-type { max-width: 180px; font-size: 11.5px; }
  .popup-type { display: none; }
  .preview-state { padding: 40px 20px; }
  .preview-pre { padding: 12px 14px; font-size: 11.5px; }
  .preview-iframe { min-height: 300px; }
  .preview-csv th, .preview-csv td { padding: 6px 8px; font-size: 11px; }
}
</style>
