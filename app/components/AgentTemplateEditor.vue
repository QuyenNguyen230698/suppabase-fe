<template>
  <div class="editor-root" v-if="!loading">

    <!-- Head -->
    <div class="ed-head">
      <div class="ed-avatar" v-html="iconSvg(form.icon)"></div>
      <div class="ed-title-block">
        <div class="ed-name">{{ isNew ? 'New template' : form.name || 'Untitled' }}</div>
        <div class="ed-slug">{{ form.slug || 'slug…' }}</div>
      </div>
      <span v-if="!isNew && form.is_default" class="status-badge default lg">
        <span class="badge-dot"></span>default
      </span>
      <button class="close-btn" @click="emit('close')" title="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="ed-tabs">
      <button v-for="tab in TABS" :key="tab.id" class="ed-tab" :class="{ on: activeTab === tab.id }" @click="activeTab = tab.id">
        {{ tab.label }}
        <span v-if="tab.count != null" class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Body -->
    <div class="ed-body">

      <!-- BASIC -->
      <section v-show="activeTab === 'basic'" class="ed-pane">
        <div class="ed-grid-2">
          <div>
            <label class="lbl">Name *</label>
            <DsInput v-model="form.name" placeholder="Trợ lý phổ thông" />
          </div>
          <div>
            <label class="lbl">Slug *</label>
            <DsInput v-model="form.slug" placeholder="general-assistant" :disabled="!isNew" />
            <div class="hint">a-z, 0-9, dash · 2-64 chars · không đổi sau khi tạo</div>
          </div>
          <div>
            <label class="lbl">Category</label>
            <select v-model="form.category" class="select">
              <option value="general">general</option>
              <option value="document">document</option>
              <option value="writing">writing</option>
              <option value="coding">coding</option>
            </select>
          </div>
          <div>
            <label class="lbl">Icon</label>
            <select v-model="form.icon" class="select">
              <option value="sparkles">sparkles</option>
              <option value="file-text">file-text</option>
              <option value="pen-tool">pen-tool</option>
              <option value="code">code</option>
              <option value="bot">bot</option>
            </select>
          </div>
          <div class="span-2">
            <label class="lbl">Description</label>
            <DsInput v-model="form.description" placeholder="Mô tả ngắn về vai trò" />
          </div>
          <div>
            <label class="lbl">Visibility</label>
            <select v-model="form.visibility" class="select" :disabled="!isSuperAdmin && form.visibility === 'global'">
              <option v-if="isSuperAdmin" value="global">global (mọi org)</option>
              <option value="org">org</option>
              <option value="private">private</option>
            </select>
          </div>
          <div>
            <label class="lbl">Locale</label>
            <select v-model="form.locale" class="select">
              <option value="vi">vi</option>
              <option value="en">en</option>
            </select>
          </div>
        </div>
      </section>

      <!-- PROMPT -->
      <section v-show="activeTab === 'prompt'" class="ed-pane">
        <label class="lbl">System prompt *</label>
        <div class="hint">Persona / cách trả lời. Được tiêm trước user message.</div>
        <textarea v-model="form.system_prompt" class="ta" rows="12" placeholder="Bạn là trợ lý…"></textarea>

        <div class="preview-block">
          <div class="section-label">Preview prompt</div>
          <pre class="preview">{{ previewPrompt }}</pre>
        </div>
      </section>

      <!-- RULES -->
      <section v-show="activeTab === 'rules'" class="ed-pane">
        <div class="hint">
          <b>soft</b>: tiêm vào prompt · <b>block_regex</b>: chặn bằng pattern (tab Patterns) · <b>block_llm</b>: dùng LLM check (toggle Advanced)
        </div>
        <div v-for="(r, i) in form.rules" :key="i" class="rule-row">
          <select v-model="r.severity" class="select sev">
            <option value="soft">soft</option>
            <option value="block_regex">block_regex</option>
            <option value="block_llm">block_llm</option>
          </select>
          <input v-model="r.text" class="ds-raw" placeholder="Nội dung rule" />
          <button class="x" @click="removeRule(i)" title="Xoá">×</button>
        </div>
        <DsButton size="sm" variant="ghost" @click="addRule">+ Thêm rule</DsButton>
      </section>

      <!-- PATTERNS (L1 regex) -->
      <section v-show="activeTab === 'patterns'" class="ed-pane">
        <div class="hint">
          Layer-1 regex chặn nhanh. Tiếng Việt nên dùng <code>(?:^|[^\p{L}])</code> thay <code>\b</code> + flag <code>iu</code>.
        </div>
        <div v-for="(p, i) in form.block_patterns" :key="i" class="rule-row">
          <input v-model="p.pattern" class="ds-raw mono flex-2" placeholder="(?:^|[^\\p{L}])(từ_xấu)" />
          <input v-model="p.flags" class="ds-raw mono w-flags" placeholder="iu" />
          <input v-model="p.message" class="ds-raw flex-1" placeholder="Thông báo khi block" />
          <button class="x" @click="removePattern(i)" title="Xoá">×</button>
        </div>
        <DsButton size="sm" variant="ghost" @click="addPattern">+ Thêm pattern</DsButton>
      </section>

      <!-- TOOLS -->
      <section v-show="activeTab === 'tools'" class="ed-pane">
        <div class="hint">
          Tools mà agent này được phép gọi. Khi user hỏi câu phù hợp, model sẽ tự chọn tool và lấy kết quả về.
        </div>
        <div class="tool-grid">
          <label v-for="t in AVAILABLE_TOOLS" :key="t.id" class="tool-opt" :class="{ on: form.allowed_tools.includes(t.id) }">
            <input type="checkbox" :checked="form.allowed_tools.includes(t.id)" @change="toggleTool(t.id)" />
            <div>
              <div class="r-name">{{ t.name }}</div>
              <div class="r-desc">{{ t.desc }}</div>
              <code class="tool-id">{{ t.id }}</code>
            </div>
          </label>
        </div>
      </section>

      <!-- QUALITY -->
      <section v-show="activeTab === 'quality'" class="ed-pane">
        <div v-if="qualityLoading" class="hint">Đang tải…</div>
        <template v-else-if="quality">
          <div class="meta-grid">
            <div class="meta-cell">
              <div class="meta-key">Total ratings</div>
              <div class="meta-val mono">{{ quality.summary?.ratings_total ?? 0 }}</div>
            </div>
            <div class="meta-cell">
              <div class="meta-key">Positive %</div>
              <div class="meta-val mono">{{ quality.summary?.positive_pct ?? '—' }}%</div>
            </div>
            <div class="meta-cell">
              <div class="meta-key">Up / Down</div>
              <div class="meta-val mono">
                <span style="color: var(--ok)">{{ quality.summary?.up_count ?? 0 }}</span> /
                <span style="color: var(--danger)">{{ quality.summary?.down_count ?? 0 }}</span>
              </div>
            </div>
            <div class="meta-cell">
              <div class="meta-key">Avg rating</div>
              <div class="meta-val mono">{{ quality.summary?.avg_rating ?? '—' }}</div>
            </div>
          </div>

          <div v-if="quality.reason_breakdown?.length">
            <div class="section-label">Negative reasons</div>
            <div class="reason-bars">
              <div v-for="r in quality.reason_breakdown" :key="r.reason || 'none'" class="reason-bar">
                <span class="reason-label">{{ r.reason || '(no reason)' }}</span>
                <span class="reason-count">{{ r.n }}</span>
              </div>
            </div>
          </div>

          <div v-if="quality.recent_negatives?.length">
            <div class="section-label">Recent negative feedback</div>
            <div class="neg-list">
              <div v-for="n in quality.recent_negatives" :key="n.message_id" class="neg-row">
                <div class="neg-head">
                  <span class="neg-user">{{ n.username }}</span>
                  <span class="neg-reason" v-if="n.reason">· {{ n.reason }}</span>
                  <span class="neg-time">{{ formatRelative(n.created_at) }}</span>
                </div>
                <div class="neg-content">{{ truncate(n.content, 200) }}</div>
                <div v-if="n.comment" class="neg-comment">💬 {{ n.comment }}</div>
              </div>
            </div>
          </div>

          <div v-if="!quality.summary && !quality.recent_negatives?.length" class="hint">
            Chưa có rating nào cho agent này.
          </div>
        </template>
      </section>

      <!-- ADVANCED -->
      <section v-show="activeTab === 'advanced'" class="ed-pane">
        <div class="ed-grid-2">
          <div>
            <label class="lbl">Temperature ({{ form.temperature }})</label>
            <input type="range" min="0" max="2" step="0.05" v-model.number="form.temperature" class="range" />
          </div>
          <div>
            <label class="lbl">Max tokens</label>
            <DsInput v-model.number="form.max_tokens" type="number" />
          </div>
          <div class="span-2">
            <label class="check-row">
              <input type="checkbox" v-model="form.block_llm_check" />
              <span>Bật LLM safety check (L2 — Llama-Guard, chậm ~500ms nhưng bắt được paraphrase)</span>
            </label>
          </div>
          <div class="span-2">
            <label class="check-row">
              <input type="checkbox" v-model="form.is_active" />
              <span>Active (uncheck = ẩn khỏi danh sách user)</span>
            </label>
          </div>
          <div class="span-2">
            <label class="lbl">Fallback response (khi vi phạm rule)</label>
            <textarea v-model="form.fallback_response" class="ta" rows="3"
              placeholder="Mình không thể hỗ trợ yêu cầu này…"></textarea>
          </div>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <div class="ed-footer">
      <div class="footer-left">
        <DsButton v-if="!isNew && !form.is_default && isSuperAdmin" variant="ghost" size="sm" @click="onSetDefault">
          Set as default
        </DsButton>
        <DsButton v-if="!isNew" variant="ghost-danger" size="sm" @click="onDelete">
          Delete
        </DsButton>
      </div>
      <div class="footer-right">
        <DsButton variant="ghost" size="sm" @click="emit('close')">Cancel</DsButton>
        <DsButton variant="primary" size="sm" :disabled="saving || !form.name || !form.system_prompt" @click="save">
          {{ saving ? 'Saving…' : (isNew ? 'Create' : 'Save changes') }}
        </DsButton>
      </div>
    </div>
  </div>
  <div v-else class="loading-state">Đang tải…</div>
</template>

<script setup>
const props = defineProps({
  templateId: { type: String, default: null },
  isNew:      { type: Boolean, default: false },
})
const emit = defineEmits(['saved', 'deleted', 'close'])

const { apiFetch } = useApi()
const { show: showToast } = useToast()
const { ask: confirmAsk } = useConfirm()
const auth = useAuthStore()

const isSuperAdmin = computed(() => auth.isSuperAdmin)

const TABS = computed(() => {
  const base = [
    { id: 'basic',    label: 'Basic' },
    { id: 'prompt',   label: 'System Prompt' },
    { id: 'rules',    label: 'Rules', count: form.value.rules.length || null },
    { id: 'patterns', label: 'Block Patterns', count: form.value.block_patterns.length || null },
    { id: 'tools',    label: 'Tools', count: form.value.allowed_tools.length || null },
    { id: 'advanced', label: 'Advanced' },
  ]
  if (!props.isNew) base.push({ id: 'quality', label: 'Quality' })
  return base
})

const AVAILABLE_TOOLS = [
  { id: 'search_documents', name: 'Search Documents', desc: 'Cho phép agent tìm trong tài liệu user đã upload (RAG).' },
  { id: 'get_current_time', name: 'Get Current Time', desc: 'Trả về thời gian hiện tại + timezone.' },
  { id: 'calculator',       name: 'Calculator',       desc: 'Đánh giá biểu thức toán an toàn (không eval).' },
]

const activeTab = ref('basic')
const loading = ref(true)
const saving = ref(false)

const form = ref({
  name: '', slug: '', description: '',
  icon: 'bot', category: 'general',
  system_prompt: '',
  rules: [], block_patterns: [],
  allowed_tools: [],
  block_llm_check: false,
  fallback_response: '',
  locale: 'vi',
  temperature: 0.7,
  max_tokens: 4096,
  is_active: true,
  is_default: false,
  visibility: 'org',
})

const previewPrompt = computed(() => {
  let s = (form.value.system_prompt || '').trim()
  const rules = form.value.rules.filter(r => r.text)
  if (rules.length) {
    s += '\n\n## Quy tắc bắt buộc khi trả lời:\n'
    s += rules.map((r, i) => `${i + 1}. ${r.text}`).join('\n')
  }
  return s || '(empty)'
})

async function load() {
  loading.value = true
  activeTab.value = 'basic'
  try {
    if (props.isNew) {
      form.value = {
        name: '', slug: '', description: '',
        icon: 'bot', category: 'general',
        system_prompt: '',
        rules: [], block_patterns: [],
        allowed_tools: [],
        block_llm_check: false,
        fallback_response: '',
        locale: 'vi',
        temperature: 0.7, max_tokens: 4096,
        is_active: true, is_default: false,
        visibility: isSuperAdmin.value ? 'global' : 'org',
      }
    } else {
      const data = await apiFetch(`/api/admin/agent-templates/${props.templateId}`, { _skipLoader: true })
      form.value = {
        ...form.value,
        ...data,
        rules: Array.isArray(data.rules) ? data.rules : [],
        block_patterns: Array.isArray(data.block_patterns) ? data.block_patterns : [],
        allowed_tools: Array.isArray(data.allowed_tools) ? data.allowed_tools : [],
        fallback_response: data.fallback_response || '',
        temperature: Number(data.temperature ?? 0.7),
      }
    }
  } catch (e) {
    showToast(e?.data?.error || 'Failed to load', 'error')
    emit('close')
  } finally {
    loading.value = false
  }
}

// Quality tab data
const quality = ref(null)
const qualityLoading = ref(false)

async function loadQuality() {
  if (props.isNew || !props.templateId) return
  qualityLoading.value = true
  try {
    quality.value = await apiFetch(`/api/admin/ratings/agents/${props.templateId}?days=30`, { _skipLoader: true })
  } catch (e) {
    quality.value = null
  } finally {
    qualityLoading.value = false
  }
}
watch(activeTab, (t) => { if (t === 'quality') loadQuality() })

function truncate(s, n) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}
function formatRelative(d) {
  if (!d) return ''
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
}

function toggleTool(id) {
  const i = form.value.allowed_tools.indexOf(id)
  if (i >= 0) form.value.allowed_tools.splice(i, 1)
  else form.value.allowed_tools.push(id)
}
function addRule()    { form.value.rules.push({ id: `r${Date.now()}`, text: '', severity: 'soft' }) }
function removeRule(i){ form.value.rules.splice(i, 1) }
function addPattern() { form.value.block_patterns.push({ pattern: '', flags: 'iu', message: '' }) }
function removePattern(i) { form.value.block_patterns.splice(i, 1) }

async function save() {
  saving.value = true
  try {
    const payload = { ...form.value }
    payload.rules = payload.rules.filter(r => r.text)
    payload.block_patterns = payload.block_patterns.filter(p => p.pattern)
    delete payload.id
    delete payload.created_at; delete payload.updated_at
    delete payload.created_by; delete payload.usage_count
    delete payload.is_default

    if (props.isNew) {
      delete payload.is_active
      const res = await apiFetch('/api/admin/agent-templates', { method: 'POST', body: payload, _skipLoader: true })
      showToast('Created', 'success')
      emit('saved', { id: res.id })
    } else {
      const res = await apiFetch(`/api/admin/agent-templates/${props.templateId}`, {
        method: 'PATCH', body: payload, _skipLoader: true,
      })
      showToast('Saved', 'success')
      emit('saved', { id: res.id })
    }
  } catch (e) {
    showToast(e?.data?.error || 'Save failed', 'error')
  } finally {
    saving.value = false
  }
}

async function onSetDefault() {
  const ok = await confirmAsk({
    title: 'Đặt làm default?',
    message: 'Template này sẽ áp dụng cho mọi conversation mới nếu user không chọn agent khác.',
    confirmLabel: 'Set default',
  })
  if (!ok) return
  try {
    await apiFetch(`/api/admin/agent-templates/${props.templateId}/set-default`, { method: 'POST', _skipLoader: true })
    showToast('Set as default', 'success')
    form.value.is_default = true
    emit('saved', { id: props.templateId })
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  }
}

async function onDelete() {
  const ok = await confirmAsk({
    title: 'Xoá template?',
    message: 'Template sẽ bị ẩn khỏi danh sách. Conversation cũ vẫn giữ liên kết.',
    confirmLabel: 'Delete', variant: 'danger',
  })
  if (!ok) return
  try {
    await apiFetch(`/api/admin/agent-templates/${props.templateId}`, { method: 'DELETE', _skipLoader: true })
    showToast('Deleted', 'success')
    emit('deleted')
  } catch (e) {
    showToast(e?.data?.error || 'Delete failed', 'error')
  }
}

const ICONS = {
  sparkles:    '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  'pen-tool':  '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
  code:        '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  bot:         '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/>',
}
function iconSvg(name) {
  const body = ICONS[name] || ICONS.bot
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
}

watch(() => [props.templateId, props.isNew], () => load(), { immediate: true })

onMounted(() => {
  console.log('[AgentTemplateEditor] mounted', { templateId: props.templateId, isNew: props.isNew })
})
</script>

<style scoped>
.editor-root { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.loading-state { padding: 40px; text-align: center; color: var(--fg-mute); font-size: 12px; }

/* Head */
.ed-head {
  display: flex; align-items: center; gap: 11px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.ed-avatar {
  width: 36px; height: 36px; border-radius: 10px;
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  color: var(--accent);
  display: grid; place-items: center; flex-shrink: 0;
}
.ed-title-block { flex: 1; min-width: 0; }
.ed-name { font-size: 13px; font-weight: 700; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ed-slug { font-size: 10px; font-family: var(--font-mono); color: var(--fg-mute); }

.status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  background: var(--line); color: var(--fg-mute);
  border: 1px solid var(--line-2);
}
.status-badge.default {
  background: color-mix(in oklab, var(--ok) 10%, transparent);
  color: var(--ok); border-color: color-mix(in oklab, var(--ok) 25%, transparent);
}
.status-badge.lg { font-size: 10px; padding: 3px 9px; }
.badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

.close-btn {
  background: transparent; border: 0; color: var(--fg-mute);
  width: 28px; height: 28px; border-radius: 6px;
  display: grid; place-items: center; cursor: pointer;
  transition: color .12s, background .12s;
}
.close-btn:hover { color: var(--fg); background: var(--line); }

/* Tabs */
.ed-tabs {
  display: flex; gap: 2px;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
  background: var(--bg-elev);
  flex-shrink: 0;
  overflow-x: auto;
}
.ed-tab {
  appearance: none;
  background: transparent; border: 0;
  color: var(--fg-mute);
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.04em; text-transform: uppercase;
  padding: 12px 14px;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  display: flex; align-items: center; gap: 6px;
  transition: color .12s;
}
.ed-tab:hover { color: var(--fg); }
.ed-tab.on { color: var(--accent); }
.ed-tab.on::after {
  content: ""; position: absolute;
  left: 8px; right: 8px; bottom: 0;
  height: 2px; border-radius: 2px 2px 0 0;
  background: var(--accent);
}
.tab-count {
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  color: var(--accent);
  padding: 1px 6px; border-radius: 999px;
  font-size: 10px; font-weight: 700;
}

/* Body */
.ed-body {
  flex: 1; min-height: 0;
  overflow-y: auto;
  padding: 16px;
}
.ed-pane { display: flex; flex-direction: column; gap: 12px; }

.ed-grid-2 {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.span-2 { grid-column: 1 / -1; }

.lbl {
  display: block;
  font-size: 10px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--fg-mute); margin-bottom: 5px;
}
.hint { color: var(--fg-mute); font-size: 11px; margin: 0 0 8px; line-height: 1.5; }
.hint code {
  font-family: var(--font-mono); font-size: 0.92em;
  background: var(--bg); padding: 1px 5px; border-radius: 3px;
}

.select, .ds-raw {
  width: 100%;
  background: var(--bg); border: 1px solid var(--line);
  color: var(--fg);
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 12px; font-family: var(--font-sans);
  transition: border-color .12s;
}
.ds-raw.mono { font-family: var(--font-mono); font-size: 11px; }
.select:focus, .ds-raw:focus { outline: 1px solid var(--accent); border-color: var(--accent); }
.select:disabled, .ds-raw:disabled { opacity: 0.5; cursor: not-allowed; }

.ta {
  width: 100%;
  background: var(--bg); border: 1px solid var(--line);
  color: var(--fg);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px; font-family: var(--font-mono);
  line-height: 1.55; resize: vertical;
  transition: border-color .12s;
}
.ta:focus { outline: 1px solid var(--accent); border-color: var(--accent); }

.range { width: 100%; accent-color: var(--accent); }

.rule-row {
  display: flex; gap: 8px; align-items: center; margin-bottom: 8px;
}
.rule-row .sev { width: 130px; flex-shrink: 0; }
.rule-row .ds-raw { flex: 1; }
.rule-row .flex-1 { flex: 1; }
.rule-row .flex-2 { flex: 2; }
.rule-row .w-flags { width: 64px; flex-shrink: 0; flex: 0; }
.x {
  background: transparent; border: 1px solid var(--line); color: var(--fg-mute);
  width: 28px; height: 30px; border-radius: 6px;
  cursor: pointer; font-size: 14px;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.x:hover { color: var(--danger); border-color: var(--danger); }

.tool-grid {
  display: grid; grid-template-columns: 1fr; gap: 8px;
}
.tool-opt {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 14px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color .12s, background .12s;
}
.tool-opt:hover { border-color: var(--line-2); }
.tool-opt.on {
  border-color: color-mix(in oklab, var(--accent) 35%, transparent);
  background: color-mix(in oklab, var(--accent) 6%, transparent);
}
.tool-opt input { margin-top: 3px; accent-color: var(--accent); }
.r-name { font-size: 12.5px; font-weight: 700; color: var(--fg); }
.r-desc { font-size: 11.5px; color: var(--fg-mute); margin-top: 3px; line-height: 1.45; }
.tool-id {
  display: inline-block; margin-top: 5px;
  font-family: var(--font-mono); font-size: 10.5px;
  background: var(--bg-elev); color: var(--fg-mute);
  padding: 1px 6px; border-radius: 3px;
}

.check-row {
  display: flex; gap: 8px; align-items: center;
  font-size: 12px; color: var(--fg-dim);
  cursor: pointer;
}

.meta-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  padding: 12px; background: var(--bg);
  border: 1px solid var(--line); border-radius: 8px;
  margin-bottom: 14px;
}
.meta-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.meta-key {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--fg-mute);
}
.meta-val { font-size: 12px; color: var(--fg-dim); }
.meta-val.mono { font-family: var(--font-mono); }

.section-label {
  font-size: 10px; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--fg-mute); margin: 14px 0 8px;
}

.reason-bars { display: flex; flex-direction: column; gap: 6px; }
.reason-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 12px;
  background: var(--bg); border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 11.5px;
}
.reason-label { color: var(--fg); }
.reason-count {
  font-family: var(--font-mono); font-weight: 700;
  color: var(--danger);
}

.neg-list { display: flex; flex-direction: column; gap: 8px; }
.neg-row {
  border: 1px solid var(--line);
  border-left: 3px solid var(--danger);
  border-radius: 6px;
  padding: 10px 12px;
  background: var(--bg);
}
.neg-head {
  display: flex; gap: 8px; align-items: center;
  font-size: 10.5px; color: var(--fg-mute);
  margin-bottom: 6px;
}
.neg-user { font-weight: 700; color: var(--fg-dim); }
.neg-reason { color: var(--danger); }
.neg-time { margin-left: auto; font-family: var(--font-mono); }
.neg-content {
  font-size: 11.5px; color: var(--fg-dim); line-height: 1.5;
  font-family: var(--font-mono);
}
.neg-comment {
  margin-top: 6px; font-size: 11.5px; color: var(--fg-mute);
  padding-left: 8px; border-left: 2px solid var(--line);
}

.preview-block { margin-top: 14px; }
.section-label {
  font-size: 10px; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--fg-mute);
  margin-bottom: 6px;
}
.preview {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 12px;
  font-family: var(--font-mono);
  font-size: 11px; line-height: 1.6;
  color: var(--fg-dim);
  white-space: pre-wrap;
  max-height: 280px; overflow-y: auto;
  margin: 0;
}

/* Footer */
.ed-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  background: var(--line);
  flex-shrink: 0;
  gap: 8px;
}
.footer-left, .footer-right { display: flex; gap: 8px; }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .ed-body { padding: 12px; }
  .ed-grid-2 { gap: 10px; }
  .meta-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .ed-head { padding: 10px 12px; gap: 8px; }
  .ed-name { font-size: 12px; }
  .status-badge.lg { display: none; }

  .ed-tabs { padding: 0 8px; }
  .ed-tab { padding: 10px 10px; font-size: 10px; }

  .ed-body { padding: 10px; }
  .ed-grid-2 { grid-template-columns: 1fr; }
  .span-2 { grid-column: 1; }

  .rule-row { flex-wrap: wrap; }
  .rule-row .sev { width: 100%; }
  .rule-row .w-flags { width: 80px; }

  .meta-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 10px; }

  .reason-grid { grid-template-columns: 1fr; }

  .ed-footer { padding: 10px 12px; }
  .footer-left, .footer-right { gap: 6px; }
}
</style>
