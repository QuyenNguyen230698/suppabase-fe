<template>
  <div class="chat-app">
    <!-- Mobile backdrop -->
    <div class="chat-mobile-backdrop" :class="{ visible: mobileSidebarOpen }" @click="mobileSidebarOpen = false"></div>

    <!-- Sidebar v2 -->
    <ChatSidebarV2
      :conversations="chatStore.conversations"
      :active-id="chatStore.activeConversationId"
      :class="{ 'mobile-sidebar-open': mobileSidebarOpen }"
      @new-conversation="newConversation(); mobileSidebarOpen = false"
      @select-conversation="(id) => { goConversation(id); mobileSidebarOpen = false }"
      @conversation-action="onConversationAction"
    />

    <!-- Main -->
    <div class="main">
      <!-- Topbar -->
      <div class="topbar">
        <!-- Mobile sidebar toggle -->
        <button class="chat-mobile-menu-btn" @click="mobileSidebarOpen = !mobileSidebarOpen" aria-label="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div class="topbar-title">
          <h1 v-if="!editingTitle" @dblclick="startEditTitle">{{ activeTitle }}</h1>
          <input
            v-else
            ref="titleInput"
            v-model="titleDraft"
            class="topbar-title-input"
            @keydown.enter="commitTitle"
            @keydown.escape="cancelEditTitle"
            @blur="commitTitle"
          />
        </div>
        <div class="topbar-actions">
          <!-- Pro Plan (PEB) — unlimited, no neurons accounting -->
          <span v-if="currentSource === 'pro'" class="pro-badge" title="Pro Plan · unlimited">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4z"/></svg>
            Pro · unlimited
          </span>

          <!-- Context window + rolling-24h neurons meter (Cloudflare only) -->
          <ContextMeter
            v-else-if="currentModel"
            :tokens="(lastUsage?.prompt_tokens || 0) + (lastUsage?.completion_tokens || 0)"
            :ctx-window="currentCtxWindow"
            :neurons-used="daily.used"
            :neurons-limit="daily.limit"
            :is-over-quota="daily.is_over_quota"
            :seconds-to-partial-reset="daily.seconds_to_partial_reset"
            :seconds-to-full-reset="daily.seconds_to_full_reset"
            :next-partial-reset-at="daily.next_partial_reset_at"
            :next-full-reset-at="daily.next_full_reset_at"
          />
          <span class="topbar-status">
            <span class="status-dot" :class="{ streaming: chatStore.isStreaming }"></span>
            {{ chatStore.isStreaming ? t('chat.generating') : chatStore.activeConversationId ? t('chat.active') : t('chat.newConversation') }}
          </span>
        </div>
      </div>

      <!-- Body: thread + (optional) artifact panel -->
      <div class="body-split">
        <!-- Thread. `data-switching` is flipped briefly while we swap from
             one conversation to another so the existing messages fade out
             before the new ones appear — avoids the blink where the old
             thread vanishes for ~1 frame before the new one paints. -->
        <div ref="messagesEl" class="thread" :data-switching="convSwitching ? 'true' : 'false'">
          <div class="thread-inner">
            <!-- Empty state -->
            <div v-if="!chatStore.messages.length" class="empty">
              <div class="empty-glow"></div>
              <h2>{{ t('chat.goodToSee') }}<br /><em>{{ firstName }}</em></h2>
              <p class="empty-sub">Select a model and start chatting. Attach documents for extra context.</p>
              <div class="suggestions">
                <button class="suggestion" v-for="s in suggestions" :key="s.text" @click="fillSuggestion(s.text)">
                  <span class="suggestion-cat">{{ s.cat }}</span>
                  {{ s.text }}
                </button>
              </div>
            </div>

            <!-- Render every message, including the empty assistant placeholder
                 that exists while we wait for the first SSE chunk — the
                 placeholder shows the rotating "Đang nghĩ…" loader inside
                 ChatMessage itself. Earlier this row was hidden by v-show so
                 a separate typing-row could take over; that typing-row has
                 been removed, so the v-show condition is gone too. -->
            <ChatMessage
              v-for="(msg, idx) in chatStore.messages"
              :key="msg.id || idx"
              :message="msg"
              :is-streaming="chatStore.isStreaming"
              :is-last="idx === chatStore.messages.length - 1"
              @retry="retryLastMessage"
              @open-artifact="openArtifactFromMessage(msg)"
            />

          </div>

          <!-- Floating "Jump to latest" — appears when the user has scrolled
               up while a reply is still streaming, so they can resume
               following without forcing the camera to chase them. -->
          <button v-if="showJumpToLatest" class="jump-to-latest" @click="jumpToLatest" :title="t('chat.jumpToLatest') || 'Jump to latest'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>
            </svg>
          </button>
        </div>

        <!-- Artifact panel -->
        <ArtifactPanel v-model="artifactOpen" :artifact="artifact" />
      </div>

      <!-- Share dialog -->
      <ShareDialog
        v-model="shareOpen"
        :conversation-id="shareConvId"
        :existing-token="shareTokenExisting"
        :existing-expiry="shareExpiryExisting"
        @changed="onShareChanged"
      />

      <!-- Move to project dialog -->
      <MoveToProjectDialog
        v-model="movingProjectOpen"
        :conversation-id="chatStore.activeConversationId"
        :current-project-id="currentConvProjectId"
        @moved="onMovedToProject"
      />

      <!-- Tags dialog -->
      <TagsDialog
        v-model="tagsDialogOpen"
        :conversation-id="tagsDialogConvId"
        :initial-tags="tagsDialogConvTags"
        @changed="onTagsChanged"
      />

      <!-- Composer -->
      <div class="composer-wrap"
           @dragover.prevent="dragOver = true"
           @dragleave.prevent="dragOver = false"
           @drop.prevent="onDrop">
        <div v-if="dragOver" class="composer-drop-hint">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Drop code files to attach as snippets
        </div>
        <div class="composer" :class="{ focused: composerFocused }">
          <!-- Slash suggestions -->
          <div v-if="slashSuggestions" class="slash-menu">
            <button
              v-for="(c, i) in slashSuggestions"
              :key="c.cmd"
              class="slash-item"
              :class="{ active: i === slashIndex }"
              @mousedown.prevent="applySlash(c)"
              @mouseover="slashIndex = i"
            >
              <span class="slash-cmd">{{ c.cmd }}</span>
              <span class="slash-hint">{{ c.hint }}</span>
            </button>
          </div>

          <!-- Pending image -->
          <div v-if="pendingImage" class="composer-attached">
            <div class="chip chip-image">
              <img :src="pendingImage.previewUrl" class="chip-img-thumb" :alt="pendingImage.file.name" />
              {{ pendingImage.file.name }}
              <button @click="clearPendingImage" :title="t('chat.removeAttachment')">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <!-- Paste-to-attachment suggestion banner -->
          <div v-if="pasteSuggestion" class="paste-suggest">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span class="paste-suggest-text">
              Detected <strong>{{ pasteSuggestion.lang }}</strong> code · {{ pasteSuggestion.lines }} lines.
              Convert to attachment for a cleaner composer?
            </span>
            <button class="paste-suggest-yes" @click="acceptPasteSuggestion">Convert</button>
            <button class="paste-suggest-no" @click="dismissPasteSuggestion" :title="t('common.dismiss') || 'Dismiss'">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Pasted code attachments -->
          <div v-if="codeAttachments.length" class="composer-attached">
            <CodeAttachmentChip
              v-for="att in codeAttachments"
              :key="att.id"
              :attachment="att"
              @remove="removeCodeAttachment(att.id)"
            />
          </div>

          <!-- Attached docs/images (single unified chip surface) -->
          <div v-if="chatStore.attachedDocuments.length" class="composer-attached">
            <div v-for="doc in chatStore.attachedDocuments" :key="doc.document_id"
                 class="chip" :class="{ 'chip-image': doc.kind === 'image' }">
              <img v-if="doc.kind === 'image' && (doc.r2_public_url || doc.document_id)"
                   :src="doc.r2_public_url || `${$config.public.apiBase}/api/documents/${doc.document_id}/raw`"
                   :alt="doc.name" class="chip-img-thumb"
                   @error="e => e.target.style.display = 'none'" />
              <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              {{ doc.name }}
              <span class="chip-status" :class="doc.status">{{ doc.status }}</span>
              <button @click="removeAttachedDoc(doc.document_id)" :title="t('chat.removeAttachment')">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <textarea
            ref="textareaEl"
            v-model="input"
            @keydown.enter.exact.prevent="onEnter"
            @keydown.enter.shift.exact="input += '\n'"
            @keydown.tab.prevent="onTab"
            @keydown.down.prevent="onArrowDown"
            @keydown.up.prevent="onArrowUp"
            @keydown.escape="closeSlash"
            @focus="composerFocused = true"
            @blur="composerFocused = false"
            @input="onInput"
            @paste="onPaste"
            rows="1"
            :placeholder="t('chat.send') + '… (paste code / use / for commands)'"
            :disabled="chatStore.isStreaming"
          ></textarea>

          <div v-if="uploadError" class="upload-error">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ uploadError }}
            <button class="upload-error-close" @click="uploadError = ''">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="composer-bar">
            <!-- Unified Attach: images, PDFs, office docs, code & text files all
                 go through one button → /api/upload → R2 storage. -->
            <input ref="fileInput" type="file" multiple class="file-input"
                   accept=".txt,.md,.docx,.xlsx,.csv,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.json,.yaml,.yml,.xml,.html,.css,.scss,.js,.ts,.tsx,.jsx,.vue,.py,.go,.rs,.java,.kt,.swift,.c,.cc,.cpp,.h,.hpp,.cs,.php,.sh,.bash,.zsh,.sql,.toml,.ini,.env,.dart,.lua,.r"
                   @change="handleFileChange" />

            <button v-if="can('chat', 'upload')" class="composer-tool"
                    @click="fileInput?.click()" :disabled="uploading || chatStore.attachedDocuments.length >= MAX_FILES"
                    :title="chatStore.attachedDocuments.length >= MAX_FILES ? `Max ${MAX_FILES} files` : (t('chat.attach') || 'Attach files')">
              <svg v-if="uploading" class="upload-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>

            <!-- Model selector -->
            <ModelSelector v-model="selectedModel" :models="modelOptions" />

            <!-- Agent template picker -->
            <AgentPicker v-model="selectedAgentId" :disabled="chatStore.isStreaming" />

            <span v-if="input.length >= CHAR_WARN" class="char-counter" :class="{ danger: input.length >= MAX_CHARS }">
              {{ input.length.toLocaleString() }} / {{ MAX_CHARS.toLocaleString() }}
            </span>
            <span class="composer-hint">{{ t('chat.sendHint') }}</span>

            <!-- Single button that morphs between send + stop. Using v-if to
                 swap two buttons caused a perceptible relayout flash every
                 turn (the disabled/enabled visual styles + width animations
                 fired at the same time as isStreaming flipped). One node +
                 class swap removes the mount/unmount, transitions stay on
                 background/color only. -->
            <button
              class="send-btn"
              :class="{ stop: chatStore.isStreaming }"
              @click="chatStore.isStreaming ? cancelStream() : send()"
              :disabled="!chatStore.isStreaming && ((!input.trim() && !pendingImage && !codeAttachments.length) || !selectedModel || input.length > MAX_CHARS)"
              :title="chatStore.isStreaming ? t('chat.stop') : t('chat.send')">
              <svg v-if="chatStore.isStreaming" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { looksLikeCode, makeCodeAttachment, wrapAsFenced } from '~/composables/usePasteCode.js'

definePageMeta({ layout: false })

const { apiFetch } = useApi()
const chatStore = useChatStore()
const auth = useAuthStore()
const { can } = usePermission()
const { sendMessage: unifiedSend, sendVisionMessage: unifiedVision, cancelStream } = useUnifiedChat()
const { uploadFile } = useUpload()
const { t } = useI18n()
const { ask: askConfirm } = useConfirm()
const { show: showToast } = useToast()
const route = useRoute()
const router = useRouter()
const slash = useSlashCommands()
const { daily } = useDailyNeurons()

const mobileSidebarOpen = ref(false)

const input = ref('')
const models = ref([])
const selectedModel = ref('')
const selectedAgentId = ref(null)
const messagesEl = ref(null)
const textareaEl = ref(null)
const fileInput = ref(null)
const imageInput = ref(null)
const titleInput = ref(null)
const composerFocused = ref(false)
const uploading = ref(false)
const uploadError = ref('')
const pendingImage = ref(null)
const codeAttachments = ref([])
const dragOver = ref(false)

async function onDrop(e) {
  dragOver.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (!files.length) return
  // Route everything through the unified Attach pipeline — same code path as
  // clicking the paperclip button or selecting files via dialog.
  await uploadFiles(files)
}
// When a code-like paste lands in the textarea we don't hijack it — the user
// always gets their text. Instead we surface a banner suggesting "convert to
// attachment" so the composer doesn't balloon while keeping paste predictable.
const pasteSuggestion = ref(null)   // { text, lang, lines } | null

function onPaste(e) {
  const text = e.clipboardData?.getData('text/plain') || ''
  if (!text) return
  if (!looksLikeCode(text)) {
    pasteSuggestion.value = null
    return
  }
  // Let the paste flow into the textarea normally, but offer a one-click
  // conversion to a compact attachment chip. The banner auto-clears once the
  // user starts typing or sends.
  const att = makeCodeAttachment(text)
  pasteSuggestion.value = { text, lang: att.lang, lines: att.lines }
}

function acceptPasteSuggestion() {
  const s = pasteSuggestion.value
  if (!s) return
  if (codeAttachments.value.length >= 5) {
    uploadError.value = 'Max 5 code snippets per message'
    return
  }
  // Strip the pasted text from the textarea — chip carries it from here.
  if (input.value.includes(s.text)) {
    input.value = input.value.replace(s.text, '').trim()
    nextTick(() => autoResize())
  }
  codeAttachments.value.push(makeCodeAttachment(s.text))
  pasteSuggestion.value = null
}

function dismissPasteSuggestion() {
  pasteSuggestion.value = null
}

function removeCodeAttachment(id) {
  codeAttachments.value = codeAttachments.value.filter(a => a.id !== id)
}

function buildPromptWithAttachments(text) {
  if (!codeAttachments.value.length) return text
  const blocks = codeAttachments.value.map(wrapAsFenced).join('\n\n')
  return text ? `${text}\n\n${blocks}` : blocks
}

function clearCodeAttachments() {
  codeAttachments.value = []
}
const editingTitle = ref(false)
const titleDraft = ref('')

const MAX_FILES = 5
const MAX_CHARS = 12000
const CHAR_WARN = Math.floor(MAX_CHARS * 0.8)

// ── PEB pseudo-model selector entry ─────────────────────────
const PEB_MODEL_VALUE = '__peb__'
const modelOptions = computed(() => {
  const list = models.value.map(m => ({ ...m }))
  if (can('pro_plan', 'view')) {
    list.push({ name: PEB_MODEL_VALUE, label: 'Pro Plan (PEB qwen3.6:35b)', default: false, kind: 'pro' })
  }
  return list
})

const currentSource = computed(() => selectedModel.value === PEB_MODEL_VALUE ? 'pro' : 'chat')
const currentModel  = computed(() => currentSource.value === 'pro' ? 'qwen3.6:35b' : selectedModel.value)
const currentCtxWindow = computed(() => {
  if (currentSource.value === 'pro') return 32000
  const m = models.value.find(x => x.name === selectedModel.value)
  return m?.context_length || 4096
})

const lastUsage = computed(() => {
  // While a stream is in flight, hide the previous turn's token count — the
  // current usage isn't known until the SSE 'usage' event arrives at the end.
  if (chatStore.isStreaming) return { prompt_tokens: 0, completion_tokens: 0 }
  const last = chatStore.messages[chatStore.messages.length - 1]
  if (last?.role !== 'assistant') return null
  if (last.tokens_in == null && last.tokens_out == null) return null
  return { prompt_tokens: last.tokens_in || 0, completion_tokens: last.tokens_out || 0 }
})

const firstName = computed(() => {
  const u = auth.user?.username || 'there'
  return u.split(/[-_\s]/)[0]
})

const activeTitle = computed(() => {
  if (!chatStore.activeConversationId) return t('chat.newConversation')
  const c = chatStore.conversations.find(c => c.id === chatStore.activeConversationId)
  return c?.title || t('chat.newConversation')
})

const suggestions = [
  { cat: 'Write',   text: 'Draft a project proposal for a new feature' },
  { cat: 'Code',    text: 'Explain this code and suggest improvements' },
  { cat: 'Analyse', text: 'Summarise the key points from this document' },
  { cat: 'Plan',    text: 'Create a 7-day learning plan for a new topic' },
]

function fillSuggestion(text) {
  input.value = text
  nextTick(() => {
    textareaEl.value?.focus()
    autoResize()
    // Auto-send: one-click suggestion → straight into the conversation, like
    // ChatGPT/Claude. User can edit by typing before clicking another button.
    if (selectedModel.value && !chatStore.isStreaming) send()
  })
}

// ── Boot ─────────────────────────────────────────────────────
onMounted(async () => {
  try {
    models.value = await apiFetch('/api/models', { _skipLoader: true })
    if (models.value.length) {
      const stored = localStorage.getItem('sb_preferred_model')
      const found = stored && models.value.find(m => m.name === stored)
      selectedModel.value = (found?.name) || models.value.find(m => m.default)?.name || models.value[0].name
    }
  } catch {}

  // Deep-link via ?model=peb → preselect Pro Plan if the user has access.
  // Must run after the local models list resolves so the watcher below
  // doesn't immediately overwrite it with sb_preferred_model.
  if (route.query.model === 'peb' && can('pro_plan', 'view')) {
    selectedModel.value = PEB_MODEL_VALUE
  }

  await loadConversationList()

  // Deep-link: /c/:id
  if (route.params.id) {
    await loadConversation(route.params.id)
  }
})

// React to query change while staying on /c (e.g. switching menu items)
watch(() => route.query.model, (v) => {
  if (v === 'peb' && can('pro_plan', 'view')) {
    selectedModel.value = PEB_MODEL_VALUE
  }
})

watch(selectedModel, (v) => {
  if (v && v !== PEB_MODEL_VALUE) localStorage.setItem('sb_preferred_model', v)
})

watch(() => route.params.id, async (id) => {
  if (!id && chatStore.activeConversationId) {
    chatStore.setActiveConversation(null, [])
    return
  }
  if (id && id !== chatStore.activeConversationId) await loadConversation(id)
})

// ── Conversation loading ─────────────────────────────────────
async function loadConversationList() {
  try {
    const data = await apiFetch('/api/conversations?limit=200', { _skipLoader: true })
    chatStore.setConversations(data.items || [])
  } catch {}
}

// Briefly true while we tear down one conversation and mount another, so the
// thread can fade out + fade back in instead of disappearing for a frame.
const convSwitching = ref(false)

async function loadConversation(id) {
  // Choose endpoint by source from list
  const conv = chatStore.conversations.find(c => c.id === id)
  const src = conv?.source === 'pro' ? 'pro' : 'chat'
  const endpoint = src === 'pro' ? `/api/chat/peb/conversations/${id}` : `/api/chat/conversations/${id}`

  // Fade old thread out before swapping messages. Skip if there's nothing
  // to fade (initial load) to avoid an unnecessary 80ms delay.
  const hadMessages = chatStore.messages.length > 0
  if (hadMessages) {
    convSwitching.value = true
    await new Promise(r => setTimeout(r, 80))
  }
  try {
    const data = await apiFetch(endpoint, { _skipLoader: true })
    chatStore.setActiveConversation(id, data.messages)
    if (data.model && currentSource.value !== 'pro') selectedModel.value = data.model
    if (conv?.source === 'pro') selectedModel.value = PEB_MODEL_VALUE
    scrollToBottom()
  } catch {
  } finally {
    convSwitching.value = false
  }
}

function goConversation(id) {
  if (id === chatStore.activeConversationId) return
  router.push(`/c/${id}`)
}

function newConversation() {
  chatStore.setActiveConversation(null, [])
  chatStore.clearAttachments()
  if (route.params.id) router.push('/c')
}

async function onConversationAction({ id, action, conv }) {
  if (action?.type === 'rename') {
    return await patchConv(id, { title: action.value })
  }
  switch (action?.type || action) {
    case 'pin':     await patchConv(id, { pinned:   !conv?.pinned   }); break
    case 'star':    await patchConv(id, { starred:  !conv?.starred  }); break
    case 'archive': await patchConv(id, { archived: !conv?.archived }); break
    case 'share':   openShareDialog(id, conv); break
    case 'move':    openMoveDialog(id, conv); break
    case 'tags':    openTagsDialog(id, conv); break
    case 'delete':  await deleteConv(id, conv); break
  }
}

async function patchConv(id, patch) {
  try {
    const updated = await apiFetch(`/api/conversations/${id}`, {
      method: 'PATCH', body: patch, _skipLoader: true,
    })
    // Merge into list
    const idx = chatStore.conversations.findIndex(c => c.id === id)
    if (idx !== -1) chatStore.conversations[idx] = { ...chatStore.conversations[idx], ...updated }
  } catch (e) {
    showToast(e?.data?.error || 'Update failed', 'error')
  }
}

// ── Share dialog state ──────────────────────────────────────
const shareOpen = ref(false)
const shareConvId = ref(null)
const shareTokenExisting = ref(null)
const shareExpiryExisting = ref(null)

function openShareDialog(id, conv) {
  shareConvId.value = id
  shareTokenExisting.value  = conv?.share_token || null
  shareExpiryExisting.value = conv?.share_expires_at || null
  shareOpen.value = true
}

function onShareChanged({ token, expires_at }) {
  const idx = chatStore.conversations.findIndex(c => c.id === shareConvId.value)
  if (idx !== -1) {
    chatStore.conversations[idx] = {
      ...chatStore.conversations[idx],
      share_token: token,
      share_expires_at: expires_at,
    }
  }
}

// ── Move-to-project dialog state ────────────────────────────
const movingProjectOpen = ref(false)
const moveConvId = ref(null)
const moveCurrentProjectId = ref(null)
const currentConvProjectId = computed(() => moveConvId.value ? moveCurrentProjectId.value : null)

function openMoveDialog(id, conv) {
  moveConvId.value = id
  moveCurrentProjectId.value = conv?.project_id || null
  movingProjectOpen.value = true
}

async function onMovedToProject({ projectId }) {
  const idx = chatStore.conversations.findIndex(c => c.id === moveConvId.value)
  if (idx !== -1) {
    chatStore.conversations[idx] = { ...chatStore.conversations[idx], project_id: projectId }
  }
}

// ── Tags dialog state ───────────────────────────────────────
const tagsDialogOpen     = ref(false)
const tagsDialogConvId   = ref(null)
const tagsDialogConvTags = ref([])

function openTagsDialog(id, conv) {
  tagsDialogConvId.value   = id
  tagsDialogConvTags.value = conv?.tags || []
  tagsDialogOpen.value     = true
}

function onTagsChanged({ type, tag }) {
  const idx = chatStore.conversations.findIndex(c => c.id === tagsDialogConvId.value)
  if (idx === -1) return
  const conv = { ...chatStore.conversations[idx] }
  const list = [...(conv.tags || [])]
  if (type === 'attached') {
    if (!list.find(t => t.id === tag.id)) list.push({ id: tag.id, name: tag.name, color: tag.color })
  } else if (type === 'detached' || type === 'deleted') {
    const i = list.findIndex(t => t.id === tag.id)
    if (i !== -1) list.splice(i, 1)
  }
  conv.tags = list
  chatStore.conversations[idx] = conv
}

async function deleteConv(id, conv) {
  const ok = await askConfirm({
    title: t('chat.deleteConversation') + '?',
    message: conv?.title || '',
    confirmLabel: t('common.delete'),
    variant: 'danger',
  })
  if (!ok) return
  const src = conv?.source === 'pro' ? 'pro' : 'chat'
  const endpoint = src === 'pro' ? `/api/chat/peb/conversations/${id}` : `/api/chat/conversations/${id}`
  await apiFetch(endpoint, { method: 'DELETE', _skipLoader: true }).catch(() => {})
  await loadConversationList()
  if (chatStore.activeConversationId === id) newConversation()
}

// ── Inline title edit ───────────────────────────────────────
function startEditTitle() {
  if (!chatStore.activeConversationId) return
  titleDraft.value = activeTitle.value
  editingTitle.value = true
  nextTick(() => titleInput.value?.focus())
}

function cancelEditTitle() { editingTitle.value = false }

async function commitTitle() {
  if (!editingTitle.value) return
  const v = titleDraft.value.trim()
  editingTitle.value = false
  if (!v || v === activeTitle.value || !chatStore.activeConversationId) return
  await patchConv(chatStore.activeConversationId, { title: v })
}

// ── Sending ─────────────────────────────────────────────────
async function send() {
  if (!selectedModel.value || chatStore.isStreaming) return

  const prevConvId = chatStore.activeConversationId

  if (pendingImage.value) {
    const { file } = pendingImage.value
    const prompt = buildPromptWithAttachments(input.value.trim()) || t('chat.describeImage')
    input.value = ''
    if (textareaEl.value) { textareaEl.value.value = ''; textareaEl.value.style.height = 'auto' }
    clearPendingImage()
    chatStore.clearAttachments()
    clearCodeAttachments()
    nextTick(() => autoResize())
    const newId = await unifiedVision({
      imageFile: file, prompt,
      model: currentModel.value,
      source: currentSource.value,
      conversationId: prevConvId,
      agentTemplateId: selectedAgentId.value,
    })
    if (newId && newId !== prevConvId) { await loadConversationList(); router.replace(`/c/${newId}`) }
    scrollToBottom()
    return
  }

  const hasText = !!input.value.trim()
  const hasCode = codeAttachments.value.length > 0
  if (!hasText && !hasCode) return
  if (input.value.length > MAX_CHARS) return
  const processing = chatStore.attachedDocuments.some(d => d.status === 'processing')
  if (processing) {
    showToast('A document is still being indexed. Please wait until it shows "ready" before sending.', 'info', 3500)
    return
  }

  // Soft-check: if last assistant turn already used > 90% of the model's context
  // window, warn before sending — the next turn will likely truncate older messages.
  const used = (lastUsage.value?.prompt_tokens || 0) + (lastUsage.value?.completion_tokens || 0)
  if (used > 0 && currentCtxWindow.value && used / currentCtxWindow.value > 0.9) {
    showToast(
      `Context window almost full (${used.toLocaleString()} / ${currentCtxWindow.value.toLocaleString()} tokens). Older history may be truncated.`,
      'warn', 3500,
    )
  }

  const text = buildPromptWithAttachments(input.value.trim())
  input.value = ''
  clearCodeAttachments()
  pasteSuggestion.value = null
  if (textareaEl.value) { textareaEl.value.value = ''; textareaEl.value.style.height = 'auto'; textareaEl.value.focus() }

  const newId = await unifiedSend({
    content: text,
    model: currentModel.value,
    source: currentSource.value,
    conversationId: prevConvId,
    agentTemplateId: selectedAgentId.value,
  })
  if (newId && newId !== prevConvId) { await loadConversationList(); router.replace(`/c/${newId}`) }
  scrollToBottom()
}

async function retryLastMessage() {
  const msgs = chatStore.messages
  const lastUser = [...msgs].reverse().find(m => m.role === 'user')
  if (!lastUser || chatStore.isStreaming) return
  if (msgs[msgs.length - 1]?.role === 'assistant') msgs.pop()
  const newId = await unifiedSend({
    content: lastUser.content,
    model: currentModel.value,
    source: currentSource.value,
    conversationId: chatStore.activeConversationId,
    agentTemplateId: selectedAgentId.value,
  })
  if (newId && newId !== chatStore.activeConversationId) await loadConversationList()
  scrollToBottom()
}

// ── Slash commands ──────────────────────────────────────────
const slashSuggestions = ref(null)
const slashIndex = ref(0)

function onInput() {
  autoResize()
  const list = slash.match(input.value)
  if (list) {
    slashSuggestions.value = list
    if (slashIndex.value >= list.length) slashIndex.value = 0
  } else {
    slashSuggestions.value = null
  }
}

function onEnter(e) {
  if (slashSuggestions.value && slashSuggestions.value.length) {
    e.preventDefault()
    applySlash(slashSuggestions.value[slashIndex.value])
    return
  }
  // try parsing slash command on its own — but skip prompt-template commands,
  // they're meant to be expanded then sent as a normal prompt.
  const parsed = slash.parse(input.value.trim())
  if (parsed) {
    const def = slash.list.find(c => c.cmd === parsed.cmd)
    if (def?.kind !== 'prompt') { runSlash(parsed); return }
  }
  send()
}

// Tab inside the composer: when a slash suggestion menu is open, expand the
// highlighted command; when input is exactly a known prompt command (e.g.
// `/explain`) expand its template. Falls back to default Tab navigation if
// nothing matches.
function onTab(e) {
  if (slashSuggestions.value?.length) {
    applySlash(slashSuggestions.value[slashIndex.value])
    return
  }
  const trimmed = input.value.trim()
  if (trimmed.startsWith('/') && !/\s/.test(trimmed)) {
    const def = slash.list.find(c => c.cmd === trimmed)
    if (def?.kind === 'prompt') {
      applySlash(def)
      return
    }
  }
  // No slash context: insert a literal Tab so user can indent code in composer.
  const el = e.target
  const s = el.selectionStart, eEnd = el.selectionEnd
  input.value = input.value.slice(0, s) + '  ' + input.value.slice(eEnd)
  nextTick(() => { el.selectionStart = el.selectionEnd = s + 2 })
}

function onArrowDown() {
  if (slashSuggestions.value?.length) {
    slashIndex.value = (slashIndex.value + 1) % slashSuggestions.value.length
  }
}
function onArrowUp() {
  if (slashSuggestions.value?.length) {
    slashIndex.value = (slashIndex.value - 1 + slashSuggestions.value.length) % slashSuggestions.value.length
  }
}
function closeSlash() { slashSuggestions.value = null }
function applySlash(c) {
  // Prompt-templates: expand into the textarea so the user can edit before sending.
  // The user's pasted code attachments will be appended on send.
  if (c.kind === 'prompt' && c.template) {
    input.value = c.template + '\n'
  } else {
    input.value = c.cmd + ' '
  }
  slashSuggestions.value = null
  nextTick(() => {
    textareaEl.value?.focus()
    autoResize()
  })
}

async function runSlash({ cmd, arg }) {
  input.value = ''
  if (textareaEl.value) { textareaEl.value.value = ''; textareaEl.value.style.height = 'auto' }

  const convId = chatStore.activeConversationId
  switch (cmd) {
    case '/new':
      newConversation()
      break
    case '/clear':
      // Clear composer + every attachment kind (paste suggestions, code chips,
      // pending image, attached docs).
      clearCodeAttachments()
      clearPendingImage()
      chatStore.clearAttachments()
      pasteSuggestion.value = null
      uploadError.value = ''
      break
    case '/model':
      if (arg) {
        const m = models.value.find(x => x.name === arg)
        if (m) { selectedModel.value = m.name; showToast(`Model → ${arg}`, 'success') }
        else   showToast(`Unknown model: ${arg}`, 'warning')
      }
      break
    case '/title':
      if (convId && arg) await patchConv(convId, { title: arg })
      break
    case '/pin':
      if (convId) {
        const conv = chatStore.conversations.find(c => c.id === convId)
        await patchConv(convId, { pinned: !conv?.pinned })
      }
      break
    case '/star':
      if (convId) {
        const conv = chatStore.conversations.find(c => c.id === convId)
        await patchConv(convId, { starred: !conv?.starred })
      }
      break
    case '/archive':
      if (convId) {
        await patchConv(convId, { archived: true })
        await loadConversationList()
        newConversation()
      }
      break
    case '/share':
      if (convId) {
        const conv = chatStore.conversations.find(c => c.id === convId)
        openShareDialog(convId, conv)
      }
      break
    case '/export':
      if (convId) exportConversation(arg === 'json' ? 'json' : 'md')
      break
    case '/move':
      if (convId) {
        const conv = chatStore.conversations.find(c => c.id === convId)
        openMoveDialog(convId, conv)
      }
      break
    case '/tags':
      if (convId) {
        const conv = chatStore.conversations.find(c => c.id === convId)
        openTagsDialog(convId, conv)
      }
      break
  }
}

function exportConversation(format = 'md') {
  const title = activeTitle.value
  const safeName = (title || 'conversation').replace(/\W+/g, '-').toLowerCase()
  let content, mime, ext
  if (format === 'json') {
    content = JSON.stringify({
      title,
      conversation_id: chatStore.activeConversationId,
      exported_at: new Date().toISOString(),
      messages: chatStore.messages
        .filter(m => m.content)
        .map(m => ({
          role: m.role, content: m.content,
          ...(m.reasoning && { reasoning: m.reasoning }),
          ...(m.model && { model: m.model }),
          ...(m.tokens_in != null && { tokens_in: m.tokens_in }),
          ...(m.tokens_out != null && { tokens_out: m.tokens_out }),
        })),
    }, null, 2)
    mime = 'application/json'
    ext = 'json'
  } else {
    const lines = [`# ${title}\n`]
    for (const m of chatStore.messages) {
      if (!m.content) continue
      lines.push(`## ${m.role}`)
      lines.push(m.content)
      lines.push('')
    }
    content = lines.join('\n')
    mime = 'text/markdown'
    ext = 'md'
  }
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Files / vision ──────────────────────────────────────────
function handleImageSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (pendingImage.value?.previewUrl) URL.revokeObjectURL(pendingImage.value.previewUrl)
  pendingImage.value = { file, previewUrl: URL.createObjectURL(file) }
  if (imageInput.value) imageInput.value.value = ''
}
function clearPendingImage() {
  if (pendingImage.value?.previewUrl) URL.revokeObjectURL(pendingImage.value.previewUrl)
  pendingImage.value = null
}

async function handleFileChange(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  await uploadFiles(files)
  if (fileInput.value) fileInput.value.value = ''
}

async function uploadFiles(files) {
  uploadError.value = ''
  uploading.value = true
  try {
    for (const file of files) {
      if (chatStore.attachedDocuments.length >= MAX_FILES) {
        uploadError.value = `Maximum ${MAX_FILES} files per message`
        setTimeout(() => { uploadError.value = '' }, 4000)
        break
      }
      try {
        await uploadFile(file)
      } catch (err) {
        uploadError.value = err.message || `Upload of "${file.name}" failed`
        setTimeout(() => { uploadError.value = '' }, 4000)
      }
    }
  } finally {
    uploading.value = false
  }
}

// Remove attachment: also tell the backend so the R2 object is freed.
async function removeAttachedDoc(docId) {
  chatStore.removeDocument(docId)
  try {
    await apiFetch(`/api/documents/${docId}`, { method: 'DELETE', _skipLoader: true })
  } catch { /* best-effort */ }
}

function autoResize() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  // Cap composer at ~50% of viewport so long pastes stay usable but the thread
  // above doesn't disappear entirely. Min stays at one line (CSS handles it).
  const cap = Math.max(220, Math.floor(window.innerHeight * 0.5))
  el.style.height = Math.min(el.scrollHeight, cap) + 'px'
}

// Sticky auto-scroll: only follow the bottom when the user IS at the bottom
// (within ~120px). Once they scroll up to read, we stop chasing the stream
// and show a floating "↓ Jump to latest" button so they can re-anchor when
// ready. Matches the UX in Claude.ai / ChatGPT — keeps the page calm while
// reading older replies and prevents the camera-shake feeling on every chunk.
const STICKY_THRESHOLD_PX = 120
const isAtBottom = ref(true)
const showJumpToLatest = ref(false)

function recomputeStick() {
  const el = messagesEl.value
  if (!el) return
  const gap = el.scrollHeight - el.scrollTop - el.clientHeight
  isAtBottom.value = gap <= STICKY_THRESHOLD_PX
  showJumpToLatest.value = !isAtBottom.value && chatStore.isStreaming
}

function scrollToBottom(force = false) {
  nextTick(() => {
    const el = messagesEl.value
    if (!el) return
    // If the user has scrolled up, respect that — don't yank them back unless
    // force=true (used when explicitly clicking "jump to latest").
    if (!force && !isAtBottom.value) return
    el.scrollTop = el.scrollHeight
  })
}

function jumpToLatest() {
  isAtBottom.value = true
  showJumpToLatest.value = false
  scrollToBottom(true)
}

onMounted(() => {
  const el = messagesEl.value
  if (el) el.addEventListener('scroll', recomputeStick, { passive: true })
})
onBeforeUnmount(() => {
  const el = messagesEl.value
  if (el) el.removeEventListener('scroll', recomputeStick)
})

// New message — start fresh at the bottom (user just sent something) so we
// reset stickiness.
watch(() => chatStore.messages.length, () => {
  isAtBottom.value = true
  scrollToBottom(true)
})
// Stream finished — gently nudge to bottom IF the user is still anchored there.
watch(() => chatStore.isStreaming, v => {
  if (!v) {
    showJumpToLatest.value = false
    scrollToBottom(false)
  }
})
// During streaming, the assistant message's content grows but messages.length
// doesn't change — watch the last message's content length and auto-follow
// when sticky. Coalesced via requestAnimationFrame so the watcher doesn't
// fire 30×/sec while text streams in.
let _scrollFollowFrame = null
watch(
  () => {
    const last = chatStore.messages[chatStore.messages.length - 1]
    return last?.role === 'assistant' ? (last.content?.length || 0) : 0
  },
  () => {
    if (!isAtBottom.value) return
    if (_scrollFollowFrame != null) return
    _scrollFollowFrame = requestAnimationFrame(() => {
      _scrollFollowFrame = null
      const el = messagesEl.value
      if (el && isAtBottom.value) el.scrollTop = el.scrollHeight
    })
  }
)

// ── Artifact panel ──────────────────────────────────────────
const artifactOpen = ref(false)
const artifact = ref(null)

function openArtifactFromMessage(msg) {
  // Pick first large code block (≥ 12 lines) from msg.content
  const re = /```(\w+)?\n([\s\S]*?)```/g
  let m, picked = null
  while ((m = re.exec(msg.content)) !== null) {
    const body = m[2]
    if (body.split('\n').length >= 12) { picked = { lang: m[1] || '', content: body }; break }
  }
  if (!picked) {
    // fallback: open longest code block of any size
    let best = null
    const re2 = /```(\w+)?\n([\s\S]*?)```/g
    while ((m = re2.exec(msg.content)) !== null) {
      if (!best || m[2].length > best.content.length) best = { lang: m[1] || '', content: m[2] }
    }
    picked = best
  }
  if (!picked) return
  artifact.value = { title: picked.lang ? `${picked.lang} artifact` : 'Code artifact', ...picked }
  artifactOpen.value = true
}

// ── Keyboard shortcuts ───────────────────────────────────────
useShortcuts({
  'mod+k':  () => newConversation(),
  'mod+b':  () => { /* sidebar toggle handled inside sidebar; placeholder */ },
  'mod+e':  () => { if (chatStore.activeConversationId) exportConversation() },
})
</script>

<style scoped>
.chat-app { display: flex; height: 100vh; background: var(--bg); overflow: hidden; }

.main {
  flex: 1; display: flex; flex-direction: column;
  min-width: 0; min-height: 0;
  position: relative;
}

.topbar {
  display: flex; align-items: center;
  height: 50px;
  padding: 0 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.topbar-title { flex: 1; min-width: 0; }
.topbar-title h1 {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 400;
  letter-spacing: 0;
  margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: var(--fg);
  cursor: text;
}
.topbar-title-input {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--line-3);
  border-radius: 6px;
  padding: 5px 10px;
  font-family: var(--font-serif);
  font-size: 17px;
  color: var(--fg);
  outline: 0;
}
.topbar-actions {
  display: flex; align-items: center; gap: 12px;
  flex-shrink: 0;
}
.topbar-status {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--fg-mute);
  font-family: var(--font-mono);
}
.pro-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(126,231,135,0.08);
  color: var(--ok);
  border: 1px solid rgba(126,231,135,0.22);
}
.status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--fg-faint);
}
.status-dot.streaming {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }

/* Body split: thread + artifact panel */
.body-split {
  flex: 1; min-height: 0;
  display: flex;
  overflow: hidden;
}

.thread {
  flex: 1; min-width: 0;
  overflow-y: auto;
  /* Removed `scroll-behavior: smooth` — when stacked on top of programmatic
     scrollTop assignments during streaming it caused visible "drag" easing
     that looked like the page was being yanked. We now do precise instant
     positioning + sticky bottom detection in JS. */
  position: relative;
  transition: opacity 80ms ease;
}
/* While the page swaps from one conversation to another, fade out so the
   tear-down isn't a hard blink. The 80ms timeout in loadConversation() pairs
   with this duration. */
.thread[data-switching="true"] { opacity: 0; }

/* Floating "Jump to latest" button — appears while streaming if user
   scrolled up. Positioned inside .thread (relative) so it follows the
   scroll viewport, not the document. */
.jump-to-latest {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1px solid var(--line-2);
  background: var(--bg-2, #15151a);
  color: var(--fg);
  display: grid; place-items: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.45);
  z-index: 10;
  transition: background 120ms, transform 120ms;
}
.jump-to-latest:hover {
  background: rgba(255,255,255,0.08);
  transform: translateX(-50%) translateY(-2px);
}
.thread-inner {
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 24px 0;
}

/* Empty state */
.empty {
  position: relative;
  text-align: center;
  padding: 64px 20px 24px;
}
.empty-glow {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 60%);
  pointer-events: none;
  filter: blur(40px);
}
.empty h2 {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 400;
  margin: 0 0 8px;
  color: var(--fg);
  position: relative;
}
.empty h2 em { color: var(--accent); font-style: italic; }
.empty-sub {
  color: var(--fg-dim);
  font-size: 13px;
  margin: 0 0 28px;
  position: relative;
}

.suggestions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  max-width: 540px;
  margin: 0 auto;
  position: relative;
}
.suggestion {
  text-align: left;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 12px 14px;
  color: var(--fg-dim);
  font-size: 12.5px;
  line-height: 1.45;
  cursor: pointer;
  transition: background .12s, border-color .12s, color .12s;
}
.suggestion:hover { background: rgba(255,255,255,0.05); border-color: var(--line-2); color: var(--fg); }
.suggestion-cat {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 4px;
}

/* Legacy typing indicator CSS removed — LoadingPulse component handles it now. */

/* Composer */
.composer-wrap {
  padding: 0 24px 18px;
  flex-shrink: 0;
  position: relative;
}
.composer-drop-hint {
  position: absolute;
  inset: 0 24px 18px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  background: rgba(126,231,135,0.08);
  border: 1.5px dashed rgba(126,231,135,0.4);
  border-radius: 14px;
  color: var(--ok);
  font-size: 13px;
  font-family: var(--font-mono);
  pointer-events: none;
  z-index: 20;
  backdrop-filter: blur(2px);
}
.composer {
  max-width: 760px;
  margin: 0 auto;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 14px;
  transition: border-color .15s;
  position: relative;
}
.composer.focused { border-color: var(--line-3); }

/* Slash menu */
.slash-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0; right: 0;
  background: #18181b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 4px;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6);
  z-index: 50;
}
.slash-item {
  display: flex; align-items: baseline; gap: 12px;
  width: 100%;
  background: transparent; border: 0;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--fg);
}
.slash-item:hover, .slash-item.active { background: rgba(255,255,255,0.07); }
.slash-cmd {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--accent);
  flex-shrink: 0;
}
.slash-hint {
  color: var(--fg-mute);
  font-size: 11.5px;
}

/* Attached chips */
.composer-attached {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 10px 14px 0;
}
.paste-suggest {
  display: flex; align-items: center; gap: 8px;
  margin: 10px 14px 0;
  padding: 7px 9px 7px 11px;
  background: rgba(126,231,135,0.06);
  border: 1px solid rgba(126,231,135,0.18);
  color: var(--fg-dim);
  font-size: 11.5px;
  border-radius: 8px;
}
.paste-suggest > svg { color: var(--accent); flex-shrink: 0; }
.paste-suggest-text { flex: 1; min-width: 0; }
.paste-suggest-text strong { color: var(--fg); font-family: var(--font-mono); font-weight: 600; }
.paste-suggest-yes {
  background: rgba(126,231,135,0.12);
  border: 1px solid rgba(126,231,135,0.3);
  color: var(--ok);
  border-radius: 6px;
  padding: 3px 9px;
  font-size: 11px; font-weight: 600;
  cursor: pointer;
}
.paste-suggest-yes:hover { background: rgba(126,231,135,0.2); }
.paste-suggest-no {
  background: transparent; border: none;
  color: var(--fg-mute);
  cursor: pointer; padding: 4px; border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
}
.paste-suggest-no:hover { color: var(--fg); background: rgba(255,255,255,0.05); }
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 8px 4px 8px;
  font-size: 11px;
  color: var(--fg-dim);
}
.chip-image { padding: 3px 8px 3px 3px; }
.chip-img-thumb {
  width: 22px; height: 22px;
  object-fit: cover;
  border-radius: 4px;
}
.chip > button {
  background: transparent; border: 0;
  color: var(--fg-mute);
  cursor: pointer;
  width: 14px; height: 14px;
  border-radius: 3px;
  display: grid; place-items: center;
}
.chip > button:hover { color: var(--fg); }
.chip-status {
  font-family: var(--font-mono); font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.chip-status.processing { color: var(--warn); }
.chip-status.ready { color: var(--ok); }
.chip-status.error { color: var(--danger); }

textarea {
  width: 100%;
  background: transparent;
  border: 0; outline: 0;
  padding: 14px 14px 6px;
  color: var(--fg);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.55;
  resize: none;
  max-height: 220px;
}
textarea::placeholder { color: var(--fg-mute); }

.upload-error {
  display: flex; align-items: center; gap: 8px;
  margin: 0 14px;
  padding: 7px 10px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 7px;
  color: #fca5a5;
  font-size: 11.5px;
}
.upload-error-close {
  background: transparent; border: 0; color: inherit;
  margin-left: auto;
  cursor: pointer;
  width: 16px; height: 16px;
  display: grid; place-items: center;
}

.composer-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px 8px;
}
.composer-tool {
  background: transparent; border: 0;
  color: var(--fg-mute);
  width: 30px; height: 30px;
  border-radius: 7px;
  display: grid; place-items: center;
  cursor: pointer;
  transition: color .12s, background .12s;
  flex-shrink: 0;
}
.composer-tool:hover { color: var(--fg); background: rgba(255,255,255,0.05); }
.composer-tool:disabled { opacity: 0.4; cursor: not-allowed; }
.composer-tool.tool-active { color: var(--accent); }
.upload-spinner { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.file-input { display: none; }

.char-counter {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-mute);
}
.char-counter.danger { color: var(--danger); }
.composer-hint {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-faint);
  flex: 1;
  text-align: right;
}

.send-btn {
  background: var(--accent);
  color: var(--accent-fg);
  border: 0;
  width: 32px; height: 32px;
  border-radius: 8px;
  display: grid; place-items: center;
  cursor: pointer;
  transition: opacity .12s;
}
.send-btn:hover { opacity: 0.9; }
.send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.send-btn.stop {
  background: var(--danger);
  color: white;
}

/* ── Mobile sidebar toggle ─────────────────────────── */
.chat-mobile-menu-btn {
  display: none;
  background: transparent;
  border: 0;
  color: var(--fg-mute);
  width: 32px; height: 32px;
  border-radius: 7px;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color .12s, background .12s;
  margin-right: 4px;
}
.chat-mobile-menu-btn:hover { color: var(--fg); background: rgba(255,255,255,0.06); }

/* Mobile overlay backdrop */
.chat-mobile-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 5;
  opacity: 0;
  pointer-events: none;
  transition: opacity .25s;
}

/* ── Tablet (≤ 1024px) ─────────────────────────────── */
@media (max-width: 1024px) {
  .topbar-actions .topbar-status { display: none; }
  .composer-hint { display: none; }
}

/* ── Mobile (≤ 768px) ──────────────────────────────── */
@media (max-width: 768px) {
  .chat-mobile-menu-btn { display: grid; }
  .chat-mobile-backdrop { display: block; }
  .chat-mobile-backdrop.visible { opacity: 1; pointer-events: auto; }

  /* Chat sidebar overlays on mobile */
  :deep(.sidebar) {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    z-index: 10;
    transform: translateX(-100%);
    transition: transform .25s cubic-bezier(.4,0,.2,1), width .25s cubic-bezier(.4,0,.2,1);
    width: 260px !important;
  }
  :deep(.sidebar.mobile-sidebar-open) {
    transform: translateX(0);
  }

  .topbar { padding: 0 12px; height: 44px; }
  .topbar-title h1 { font-size: 14px; }
  .topbar-actions { gap: 6px; }

  .composer-wrap { padding: 0 10px 12px; }
  .thread-inner { padding: 16px 12px 0; }

  .suggestions { grid-template-columns: 1fr; }
  .empty h2 { font-size: 24px; }
}
</style>
