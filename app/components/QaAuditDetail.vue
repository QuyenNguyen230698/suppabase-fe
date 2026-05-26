<template>
  <div class="detail-root">

    <!-- Head -->
    <div class="ed-head">
      <div class="user-avatar">{{ initials(row.username) }}</div>
      <div class="ed-title-block">
        <div class="ed-name">{{ row.username || '—' }}</div>
        <div class="ed-meta">{{ row.email || '—' }} · {{ row.agent_name || 'no agent' }}</div>
      </div>
      <span v-if="row.flagged" class="status-badge flagged lg">
        <span class="badge-dot"></span>{{ row.flag_reason || 'flagged' }}
      </span>
      <button class="close-btn" @click="$emit('close')" title="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="ed-tabs">
      <button class="ed-tab" :class="{ on: tab === 'pair' }" @click="tab = 'pair'">Q&amp;A pair</button>
      <button class="ed-tab" :class="{ on: tab === 'thread' }" @click="openThread">Full thread</button>
      <button class="ed-tab" :class="{ on: tab === 'flag' }" @click="tab = 'flag'">Flag &amp; note</button>
    </div>

    <!-- Body -->
    <div class="ed-body">

      <!-- PAIR -->
      <section v-show="tab === 'pair'" class="pane">
        <div class="meta-grid">
          <div class="meta-cell">
            <div class="meta-key">Asked at</div>
            <div class="meta-val mono">{{ formatDate(row.asked_at) }}</div>
          </div>
          <div class="meta-cell">
            <div class="meta-key">Model</div>
            <div class="meta-val mono">{{ row.answer_model || '—' }}</div>
          </div>
          <div class="meta-cell">
            <div class="meta-key">Tokens out</div>
            <div class="meta-val mono">{{ row.answer_tokens ?? '—' }}</div>
          </div>
          <div class="meta-cell">
            <div class="meta-key">Latency</div>
            <div class="meta-val mono">{{ latency }}</div>
          </div>
        </div>

        <div class="qa-block">
          <div class="qa-label"><span class="qa-tag">Q</span> Question</div>
          <pre class="qa-text">{{ row.question }}</pre>
        </div>

        <div class="qa-block">
          <div class="qa-label"><span class="qa-tag a">A</span> Answer</div>
          <pre class="qa-text">{{ row.answer || '(no response)' }}</pre>
        </div>
      </section>

      <!-- THREAD -->
      <section v-show="tab === 'thread'" class="pane thread">
        <div v-if="threadLoading" class="empty-sub">Đang tải thread…</div>
        <div v-else-if="!threadMessages.length" class="empty-sub">No messages.</div>
        <div v-else class="thread-list">
          <div v-for="m in threadMessages" :key="m.id" class="thread-msg" :class="m.role">
            <div class="thread-head">
              <span class="role-tag" :class="m.role">{{ m.role }}</span>
              <span class="thread-time">{{ formatDate(m.created_at) }}</span>
              <span v-if="m.model" class="thread-model mono">{{ m.model }}</span>
              <span v-if="m.flagged" class="status-badge flagged" style="margin-left:auto">
                <span class="badge-dot"></span>{{ m.flag_reason || 'flagged' }}
              </span>
            </div>
            <pre class="thread-content">{{ m.content }}</pre>
          </div>
        </div>
      </section>

      <!-- FLAG -->
      <section v-show="tab === 'flag'" class="pane">
        <label class="lbl">Reason</label>
        <div class="reason-grid">
          <label v-for="r in REASONS" :key="r.id" class="reason-opt" :class="{ on: flagForm.reason === r.id }">
            <input type="radio" v-model="flagForm.reason" :value="r.id" />
            <div>
              <div class="r-name">{{ r.label }}</div>
              <div class="r-desc">{{ r.desc }}</div>
            </div>
          </label>
        </div>

        <label class="lbl">Note (tuỳ chọn)</label>
        <textarea v-model="flagForm.note" class="ta" rows="4" placeholder="Ghi chú nội bộ về việc flag…"></textarea>
      </section>
    </div>

    <!-- Footer -->
    <div class="ed-footer">
      <div class="footer-left">
        <button v-if="row.flagged" class="footer-btn ghost-danger" @click="onUnflag" :disabled="busy">
          Unflag
        </button>
      </div>
      <div class="footer-right">
        <button v-if="tab === 'flag'" class="footer-btn primary" :disabled="!flagForm.reason || busy" @click="onFlag">
          {{ busy ? 'Saving…' : (row.flagged ? 'Update flag' : 'Set flag') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  row: { type: Object, required: true },
})
const emit = defineEmits(['close', 'flagged'])

const { apiFetch } = useApi()
const { show: showToast } = useToast()
const { ask: confirmAsk } = useConfirm()

const REASONS = [
  { id: 'unsafe',      label: 'Unsafe',      desc: 'Nội dung độc hại, vi phạm chính sách' },
  { id: 'low_quality', label: 'Low quality', desc: 'Trả lời lan man, sai, bịa' },
  { id: 'pii_leak',    label: 'PII leak',    desc: 'Lộ thông tin cá nhân nhạy cảm' },
  { id: 'off_topic',   label: 'Off-topic',   desc: 'Lạc đề so với agent persona' },
  { id: 'other',       label: 'Other',       desc: 'Khác — ghi rõ ở note' },
]

const tab = ref('pair')
const busy = ref(false)
const threadLoading = ref(false)
const threadMessages = ref([])

const flagForm = reactive({
  reason: props.row?.flag_reason || '',
  note:   props.row?.note || '',
})

const latency = computed(() => {
  if (!props.row?.asked_at || !props.row?.answered_at) return '—'
  const ms = new Date(props.row.answered_at).getTime() - new Date(props.row.asked_at).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
})

async function openThread() {
  tab.value = 'thread'
  if (threadMessages.value.length) return
  threadLoading.value = true
  try {
    const r = await apiFetch(`/api/admin/qa-audit/conversation/${props.row.conversation_id}`, { _skipLoader: true })
    threadMessages.value = r.messages || []
  } catch (e) {
    showToast(e?.data?.error || 'Failed to load thread', 'error')
  } finally {
    threadLoading.value = false
  }
}

async function onFlag() {
  if (!flagForm.reason) return
  busy.value = true
  try {
    await apiFetch(`/api/admin/qa-audit/${props.row.user_message_id}/flag`, {
      method: 'POST',
      body: { reason: flagForm.reason, note: flagForm.note || null },
      _skipLoader: true,
    })
    showToast('Flagged', 'success')
    emit('flagged', {
      user_message_id: props.row.user_message_id,
      flagged: true,
      flag_reason: flagForm.reason,
      note: flagForm.note,
    })
  } catch (e) {
    showToast(e?.data?.error || 'Failed to flag', 'error')
  } finally {
    busy.value = false
  }
}

async function onUnflag() {
  const ok = await confirmAsk({
    title: 'Bỏ flag?',
    message: 'Sẽ xoá review note kèm theo.',
    variant: 'danger', confirmLabel: 'Unflag',
  })
  if (!ok) return
  busy.value = true
  try {
    await apiFetch(`/api/admin/qa-audit/${props.row.user_message_id}/flag`, { method: 'DELETE', _skipLoader: true })
    showToast('Unflagged', 'success')
    flagForm.reason = ''; flagForm.note = ''
    emit('flagged', {
      user_message_id: props.row.user_message_id,
      flagged: false, flag_reason: null, note: null,
    })
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  } finally {
    busy.value = false
  }
}

function initials(s) {
  if (!s) return '?'
  return s.slice(0, 2).toUpperCase()
}
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}
</script>

<style scoped>
.detail-root { display: flex; flex-direction: column; min-height: 0; flex: 1; }

.ed-head {
  display: flex; align-items: center; gap: 11px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.user-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #3b3b42, #1c1c22);
  color: var(--fg);
  display: grid; place-items: center;
  font-size: 11px; font-weight: 800;
  flex-shrink: 0;
}
.ed-title-block { flex: 1; min-width: 0; }
.ed-name { font-size: 13px; font-weight: 700; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ed-meta { font-size: 10px; font-family: var(--font-mono); color: var(--fg-mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  background: var(--line); color: var(--fg-mute);
  border: 1px solid var(--line-2);
}
.status-badge.flagged {
  background: color-mix(in oklab, var(--danger) 10%, transparent);
  color: var(--danger);
  border-color: color-mix(in oklab, var(--danger) 25%, transparent);
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

.ed-tabs {
  display: flex; gap: 2px;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
  background: var(--bg-elev);
  flex-shrink: 0;
  overflow-x: auto;
}
.ed-tab {
  background: transparent; border: 0;
  color: var(--fg-mute);
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.04em; text-transform: uppercase;
  padding: 12px 14px; cursor: pointer;
  position: relative; white-space: nowrap;
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

.ed-body {
  flex: 1; min-height: 0;
  overflow-y: auto;
  padding: 16px;
}
.pane { display: flex; flex-direction: column; gap: 14px; }

.meta-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  padding: 12px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.meta-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.meta-key {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--fg-mute);
}
.meta-val { font-size: 12px; color: var(--fg-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta-val.mono { font-family: var(--font-mono); }

.qa-block { display: flex; flex-direction: column; gap: 6px; }
.qa-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--fg-mute);
}
.qa-tag {
  flex-shrink: 0;
  display: inline-grid; place-items: center;
  width: 18px; height: 18px; border-radius: 4px;
  font-size: 10px; font-weight: 800;
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  color: var(--accent);
}
.qa-tag.a {
  background: color-mix(in oklab, var(--info, #38bdf8) 12%, transparent);
  color: var(--info, #38bdf8);
}
.qa-text {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  font-family: var(--font-mono);
  font-size: 11.5px; line-height: 1.6;
  color: var(--fg-dim);
  white-space: pre-wrap;
  margin: 0;
  max-height: 320px;
  overflow-y: auto;
}

/* Thread */
.pane.thread { padding: 0; gap: 0; }
.thread-list { display: flex; flex-direction: column; gap: 10px; }
.thread-msg {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--bg);
}
.thread-msg.user { border-left: 3px solid var(--accent); }
.thread-msg.assistant { border-left: 3px solid var(--info, #38bdf8); }
.thread-head {
  display: flex; align-items: center; gap: 10px;
  font-size: 10px; color: var(--fg-mute);
  margin-bottom: 6px;
}
.role-tag {
  font-size: 9px; font-weight: 800; letter-spacing: 0.05em;
  padding: 1px 6px; border-radius: 4px;
  text-transform: uppercase;
}
.role-tag.user { background: color-mix(in oklab, var(--accent) 14%, transparent); color: var(--accent); }
.role-tag.assistant { background: color-mix(in oklab, var(--info, #38bdf8) 14%, transparent); color: var(--info, #38bdf8); }
.role-tag.system { background: var(--line); color: var(--fg-mute); }
.thread-time { font-family: var(--font-mono); }
.thread-model { font-family: var(--font-mono); color: var(--fg-faint); }
.thread-content {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11.5px; line-height: 1.55;
  color: var(--fg-dim);
  white-space: pre-wrap;
}

.empty-sub { padding: 24px; text-align: center; color: var(--fg-mute); font-size: 12px; }

/* Flag form */
.lbl {
  display: block;
  font-size: 10px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--fg-mute); margin-bottom: 8px;
}
.reason-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  margin-bottom: 14px;
}
.reason-opt {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 10px 12px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color .12s, background .12s;
}
.reason-opt:hover { border-color: var(--line-2); }
.reason-opt.on {
  border-color: color-mix(in oklab, var(--accent) 35%, transparent);
  background: color-mix(in oklab, var(--accent) 6%, transparent);
}
.reason-opt input { margin-top: 3px; accent-color: var(--accent); }
.r-name { font-size: 12px; font-weight: 700; color: var(--fg); }
.r-desc { font-size: 11px; color: var(--fg-mute); margin-top: 2px; }

.ta {
  width: 100%;
  background: var(--bg); border: 1px solid var(--line);
  color: var(--fg); border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px; font-family: var(--font-sans);
  line-height: 1.5; resize: vertical;
}
.ta:focus { outline: 1px solid var(--accent); border-color: var(--accent); }

.ed-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  background: var(--line);
  flex-shrink: 0; gap: 8px;
}
.footer-left, .footer-right { display: flex; gap: 8px; }

.footer-btn {
  appearance: none;
  background: var(--bg-elev); border: 1px solid var(--line-2);
  color: var(--fg); border-radius: 6px;
  padding: 6px 12px;
  font-size: 11.5px; font-weight: 600;
  cursor: pointer;
  transition: border-color .12s, background .12s, color .12s;
}
.footer-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.footer-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.footer-btn.primary {
  background: var(--accent); border-color: var(--accent); color: var(--accent-fg, #000);
}
.footer-btn.primary:hover:not(:disabled) { filter: brightness(1.1); }
.footer-btn.ghost-danger { border-color: color-mix(in oklab, var(--danger) 40%, transparent); color: var(--danger); }
.footer-btn.ghost-danger:hover:not(:disabled) { background: color-mix(in oklab, var(--danger) 10%, transparent); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .meta-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .ed-head { padding: 10px 12px; gap: 8px; }
  .ed-name { font-size: 12px; }
  .ed-meta { display: none; }
  .status-badge.lg { display: none; }

  .ed-tabs { padding: 0 8px; }
  .ed-tab { padding: 10px 10px; font-size: 10px; }

  .ed-body { padding: 10px; }
  .meta-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 10px; }

  .reason-grid { grid-template-columns: 1fr; }

  .ed-footer { padding: 10px 12px; }
}
</style>
