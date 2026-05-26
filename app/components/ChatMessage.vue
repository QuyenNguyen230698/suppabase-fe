<template>
  <div class="msg" :data-role="message.role" :data-frozen="isFrozen ? 'true' : 'false'">
    <!-- Avatar -->
    <div class="msg-avatar" :class="message.role === 'user' ? 'user' : 'ai'">
      <span v-if="message.role === 'user'">{{ initials }}</span>
    </div>

    <!-- Body -->
    <div class="msg-body">
      <div class="msg-meta">
        <span class="name">{{ message.role === 'user' ? 'You' : 'Suppabase' }}</span>
        <span class="time">{{ timeLabel }}</span>
      </div>

      <!-- User: single bubble containing docs chips + image + text -->
      <div v-if="message.role === 'user'" class="msg-content user-bubble">
        <!-- Attached images: render as inline thumbnails (Claude-style). -->
        <div v-if="attachedImages.length" class="msg-images">
          <button v-for="img in attachedImages" :key="img.document_id"
             class="msg-image-link" :title="img.name"
             @click="openPreview(img)">
            <!-- img tag không trigger CORS preflight — dùng public URL trực tiếp -->
            <img :src="img.r2_public_url || docRawUrl(img)" :alt="img.name" class="msg-image-thumb"
                 @error="e => e.target.style.opacity = '0.25'" />
          </button>
        </div>
        <!-- Non-image attachments stay as chips. -->
        <div v-if="attachedNonImages.length" class="msg-docs">
          <button
            v-for="doc in attachedNonImages"
            :key="doc.document_id"
            class="doc-chip"
            :class="{ expired: isDocExpired(doc) }"
            @click="openPreview(doc)"
            :title="isDocExpired(doc) ? `${doc.name} — expired` : `View ${doc.name}`"
          >
            <svg v-if="isDocExpired(doc)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg>
            <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            {{ doc.name }}
            <span v-if="isDocExpired(doc)" class="chip-expired-badge">expired</span>
          </button>
        </div>
        <!-- Image preview -->
        <img v-if="message.imageUrl" :src="message.imageUrl" :alt="message.imageName" class="user-image" />
        <!-- Mixed text + code chips for any fenced ```lang block in the content.
             Keeps long pastes compact and reviewable. -->
        <template v-if="message.content">
          <div class="user-text-wrap" :class="{ collapsed: isLongMsg && !msgExpanded }">
            <template v-for="(part, i) in userParts">
              <p v-if="part.type === 'text'" :key="`t-${i}`" class="user-text-part">{{ part.text }}</p>
              <CodeAttachmentChip
                v-else
                :key="`c-${i}`"
                :attachment="part"
                class="user-code-chip"
              />
            </template>
          </div>
          <button v-if="isLongMsg" class="show-more-btn" @click="msgExpanded = !msgExpanded">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path v-if="msgExpanded" d="m18 15-6-6-6 6"/>
              <path v-else d="m6 9 6 6 6-6"/>
            </svg>
            {{ msgExpanded ? 'Show less' : 'Show more' }}
          </button>
        </template>
      </div>

      <!-- AI: thinking block (collapsible) + rendered markdown -->
      <template v-else>
        <!-- Thinking block -->
        <div v-if="message.thinking" class="thinking-block" :class="{ open: thinkingOpen }">
          <button class="thinking-toggle" @click="thinkingOpen = !thinkingOpen">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a8 8 0 0 1 8 8c0 3-1.5 5.5-4 7l-1 5H9l-1-5C5.5 15.5 4 13 4 10a8 8 0 0 1 8-8z"/>
              <path d="M12 6v4l2 2"/>
            </svg>
            <span>Thinking</span>
            <svg class="chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div class="thinking-body">
            <div class="thinking-content" v-html="renderedThinking"></div>
          </div>
        </div>

        <!-- Streaming pre-content indicator: rotating playful "thinking…" verbs.
             Inlined directly (instead of importing LoadingPulse) to dodge a
             Nuxt auto-import/HMR issue where the external component silently
             failed to register on hot-reload. -->
        <!-- Crossfade between loader and content. mode="out-in" prevents both
             being mounted at once; the 120ms fade hides the hard cut that
             previously felt like a screen blink when the first token landed. -->
        <Transition name="ai-fade" mode="out-in">
          <div v-if="showLoadingPulse" key="loader" class="loading-pulse" aria-live="polite" role="status">
            <!-- 4-point sparkle (Claude Code-style "thinking" mark). Rotates +
                 pulses so the user can see something is actively happening. -->
            <svg class="loading-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"/>
            </svg>
            <span class="loading-label" :class="{ 'fade-out': loadingFading }">{{ loadingLabel }}</span>
          </div>
          <div v-else key="content" class="msg-content ai-content" v-html="streamingContent"></div>
        </Transition>

        <!-- Failure banner with retry affordance -->
        <div v-if="message.error_state" class="msg-error" :class="message.error_state">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div class="msg-error-content">
            <template v-if="message.error_state === 'quota'">
              <div class="msg-error-text">{{ t('chat.errorQuotaTitle') }}{{ quotaResetLabel ? ` ${t('chat.errorQuotaReset', { duration: quotaResetLabel })}` : '' }}</div>
              <div class="msg-error-upsell">{{ t('chat.errorQuotaUpsell') }}</div>
            </template>
            <span v-else class="msg-error-text">
              {{ message.error_state === 'cancelled'  ? t('chat.errorCancelled') :
                 message.error_state === 'permission' ? t('chat.errorPermission') :
                 message.error_state === 'blocked'    ? (message.error_detail || t('chat.errorUnknown', { detail: '' })) :
                 message.error_state === 'network'    ? t('chat.errorNetwork',  { detail: message.error_detail }) :
                 message.error_state === 'upstream'   ? t('chat.errorUpstream', { detail: message.error_detail }) :
                                                        t('chat.errorUnknown',  { detail: message.error_detail || 'unknown' }) }}
            </span>
          </div>
          <button class="msg-error-retry" @click="emit('retry')">{{ t('chat.retry') }}</button>
        </div>
      </template>

      <div class="msg-actions">
        <button @click="copy" title="Copy">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
          {{ copied ? 'Copied' : 'copy' }}
        </button>
        <button v-if="message.role === 'assistant' && isLast && !isStreaming && !message.error_state" @click="emit('retry')" title="Retry">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          retry
        </button>
        <button
          v-if="message.role === 'assistant' && hasLargeCodeBlock"
          @click="emit('open-artifact')"
          title="Open in artifact panel"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          open
        </button>
        <button v-if="message.role === 'assistant' && message.id_persisted" @click="rate(1)" :title="userRating === 1 ? 'Bỏ vote' : 'Tốt'">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" :stroke="userRating === 1 ? 'var(--ok)' : 'currentColor'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          good
        </button>
        <button v-if="message.role === 'assistant' && message.id_persisted" @click="rate(-1)" :title="userRating === -1 ? 'Bỏ vote' : 'Chưa tốt'">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" :stroke="userRating === -1 ? 'var(--danger)' : 'currentColor'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
          bad
        </button>
        <span v-if="message.role === 'assistant' && (message.tokens_in || message.tokens_out)" class="msg-tokens"
              :title="`Input ${message.tokens_in || 0} · Output ${message.tokens_out || 0}`">
          {{ (message.tokens_in || 0) + (message.tokens_out || 0) }} tok
        </span>
        <span v-if="message.role === 'assistant' && message.model" class="msg-model"
              :title="message.fallback_reason ? `via ${message.model} (${message.fallback_reason})` : `via ${message.model}`">
          <svg v-if="message.fallback_reason" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><path d="M21 3v6h-6"/></svg>
          {{ shortModel }}
        </span>
        <span v-if="message.role === 'assistant' && message.neurons != null" class="msg-tokens"
              :title="`Cloudflare neurons used by this turn`">
          {{ formatNeurons(message.neurons) }}n
        </span>
      </div>
    </div>

    <!-- File preview popup -->
    <FilePreviewPopup v-model="previewOpen" :file="previewFile" />
  </div>
</template>

<script setup>
import { marked } from 'marked'
import hljs from 'highlight.js'
import { sanitizeHtml } from '~/composables/useSafeMarkdown.js'
import { makeCodeAttachment } from '~/composables/usePasteCode.js'
// LoadingPulse is auto-imported by Nuxt (components: pathPrefix: false in
// nuxt.config). No manual import needed — explicit import was causing the
// component to silently fail to register on HMR in some cases.

const auth = useAuthStore()
const { t } = useI18n()
const config = useRuntimeConfig()
const props = defineProps({ message: Object, isStreaming: Boolean, isLast: Boolean })
const emit = defineEmits(['retry', 'open-artifact'])

const copied = ref(false)
const thinkingOpen = ref(false)
const previewOpen = ref(false)
const previewFile = ref(null)
const msgExpanded = ref(false)

// Always proxy through backend to avoid R2 CORS restrictions
function docRawUrl(doc) {
  return `${config.public.apiBase}/api/documents/${doc.document_id}/raw`
}

const attachedImages = computed(
  () => (props.message.attachedDocs || []).filter((d) => d.kind === 'image' && (d.r2_public_url || d.document_id))
)
const attachedNonImages = computed(
  () => (props.message.attachedDocs || []).filter((d) => d.kind !== 'image')
)

// "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b" → "deepseek-r1-distill-qwen-32b"
// "qwen3.6:35b" (PEB)                            → "Pro · qwen3.6:35b"
const shortModel = computed(() => {
  const m = props.message.model || ''
  if (!m) return ''
  if (props.message.provider === 'peb' || props.message.fallback_reason) {
    const tail = m.includes('/') ? m.split('/').pop() : m
    return `Pro · ${tail}`
  }
  return m.replace(/^@cf\/[^/]+\//, '')
})

function formatNeurons(n) {
  if (n == null) return '0'
  const num = Number(n)
  if (isNaN(num)) return '0'
  if (num >= 1000) return Math.round(num).toLocaleString()
  if (num >= 10)   return num.toFixed(1)
  return num.toFixed(2)
}

// Split user message into alternating text / code-chip parts. Any ```lang ... ```
// fenced block becomes a CodeAttachmentChip so long pastes don't dominate the
// thread. Inline code (`foo`) stays in the text part.
const userParts = computed(() => {
  const src = props.message.content || ''
  if (props.message.role !== 'user' || !src.includes('```')) {
    return [{ type: 'text', text: src }]
  }
  const parts = []
  const re = /```([\w-]*)\n([\s\S]*?)```/g
  let lastIdx = 0
  let m
  while ((m = re.exec(src)) !== null) {
    if (m.index > lastIdx) {
      const text = src.slice(lastIdx, m.index).trim()
      if (text) parts.push({ type: 'text', text })
    }
    const att = makeCodeAttachment(m[2])
    if (m[1]) att.lang = m[1]
    parts.push({ type: 'code', ...att })
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < src.length) {
    const text = src.slice(lastIdx).trim()
    if (text) parts.push({ type: 'text', text })
  }
  return parts.length ? parts : [{ type: 'text', text: src }]
})
const userTextEl = ref(null)
const isLongMsg = ref(false)

onMounted(() => {
  nextTick(() => {
    if (userTextEl.value) {
      // line-height ~1.7 * 14.5px ≈ 24.65px, 3 lines ≈ 74px
      isLongMsg.value = userTextEl.value.scrollHeight > 74
    }
  })
})

function isDocExpired(doc) {
  if (!doc?.expires_at) return false
  return new Date(doc.expires_at) < new Date()
}

function openPreview(doc) {
  previewFile.value = doc
  previewOpen.value = true
}

// Configure marked with highlight.js
const renderer = new marked.Renderer()

renderer.code = ({ text, lang }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  const escapedLang = language === 'plaintext' ? '' : language
  return `<div class="code-block">
    <div class="code-header">
      <span class="code-lang">${escapedLang}</span>
      <button class="code-copy-btn" onclick="(function(btn){
        const code = btn.closest('.code-block').querySelector('code');
        navigator.clipboard.writeText(code.innerText).then(() => {
          btn.textContent = 'Copied';
          setTimeout(() => btn.textContent = 'Copy', 1500);
        });
      })(this)">Copy</button>
    </div>
    <pre><code class="hljs language-${language}">${highlighted}</code></pre>
  </div>`
}

// Heuristic syntax color for INLINE backticks (`foo`). Markdown doesn't tell
// us the language for inline code, so we sniff common shapes and tag the
// span with a class the stylesheet can color-code (file path, function call,
// type/constant, env var, command, etc). Reader can scan a long answer and
// spot the file paths / type names without staring at a wall of identical grey.
function classifyInlineCode(raw) {
  const t = String(raw).trim()
  if (!t) return 'inline-code'
  // File paths and URLs first — most distinctive shape.
  if (/^(\/|\.\/|\.\.\/|~\/|[A-Za-z]:\\)/.test(t)) return 'inline-code path'
  if (/^https?:\/\//.test(t)) return 'inline-code url'
  // File names with extension: foo.py, README.md, kebab-case.tsx
  if (/^[\w.-]+\.[A-Za-z0-9]{1,8}$/.test(t)) return 'inline-code file'
  // ALL_CAPS_SNAKE → env var / constant
  if (/^[A-Z][A-Z0-9_]{2,}$/.test(t)) return 'inline-code constant'
  // Function call: name(...) or name()
  if (/^[A-Za-z_$][\w$]*\s*\(.*\)$/.test(t)) return 'inline-code function'
  // KEY: value pair (e.g. "Default Storage Class: Standard")
  if (/^[A-Za-z][\w\s-]{0,40}:\s*\S/.test(t) && t.length < 80) return 'inline-code kv'
  // Single short identifier looking like a type/PascalCase → type name
  if (/^[A-Z][A-Za-z0-9]{1,}$/.test(t)) return 'inline-code type'
  // Shell-ish: starts with $ or contains | / >
  if (/^\$\s/.test(t) || /\|\s*\w/.test(t)) return 'inline-code shell'
  return 'inline-code'
}

renderer.codespan = ({ text }) => {
  // marked passes already-HTML-escaped text here, so don't escape again — just
  // wrap with the heuristic class.
  return `<code class="${classifyInlineCode(text)}">${text}</code>`
}

// Heading renderer: prepend a small icon so H1/H2/H3 stand out visually
// without relying solely on font-size. Style applied via .ai-heading-icon CSS.
const HEADING_ICONS = {
  1: '<svg class="ai-heading-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z"/></svg>',
  2: '<svg class="ai-heading-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  3: '<svg class="ai-heading-icon" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>',
}
renderer.heading = function ({ tokens, depth }) {
  // `this.parser` is attached by marked when this renderer fires from inside
  // the parser. parseInline handles bold/code/links within the heading text.
  const inner = this?.parser?.parseInline?.(tokens) ?? (tokens || []).map(t => t.text || '').join('')
  const icon = HEADING_ICONS[depth] || ''
  return `<h${depth} class="ai-h ai-h${depth}">${icon}<span>${inner}</span></h${depth}>`
}

marked.setOptions({ renderer, breaks: true, gfm: true })

// While streaming the latest assistant turn, parsing the FULL content through
// marked + hljs on every keystroke is the single biggest source of flash:
//   - hljs re-tokenises every code block on every chunk
//   - the DOM diff has to repaint every paragraph
//
// Strategy: split content at the last "safe" boundary (a blank line or a
// closing code-fence). Everything BEFORE that point is committed prose —
// parse it normally + memoize. Everything AFTER is the actively-streaming
// tail — render as plain monospace until the next boundary arrives. This
// keeps the heavy parse cost on the rarely-changing prefix and reduces the
// streaming render cost to ~O(tail length).
const _markedCache = { key: '', html: '' }
function findStablePrefix(s) {
  // Prefer: closing fence (```\n) — anything before it is fully parseable.
  const lastFence = s.lastIndexOf('```\n')
  if (lastFence > 0) {
    // Make sure the fence is a CLOSER (even count of ``` before+including it).
    const before = s.slice(0, lastFence + 4)
    const fenceCount = (before.match(/```/g) || []).length
    if (fenceCount % 2 === 0) return lastFence + 4
  }
  // Next preference: last blank line. \n\n means a markdown block ended.
  const lastBlank = s.lastIndexOf('\n\n')
  if (lastBlank > 0) return lastBlank + 2
  return 0
}
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const renderedContent = computed(() => {
  const content = props.message.content
  if (!content) return ''

  // Final / non-streaming case — full parse, no incremental optimisation.
  if (!(props.isStreaming && props.isLast)) {
    return sanitizeHtml(marked(content))
  }

  // Streaming case — split prefix (stable) + tail (in-flight).
  const cut = findStablePrefix(content)
  const prefix = content.slice(0, cut)
  const tail = content.slice(cut)

  // Cache parsed prefix; only re-run marked when the prefix actually grows.
  let prefixHtml
  if (_markedCache.key === prefix) {
    prefixHtml = _markedCache.html
  } else {
    prefixHtml = prefix ? sanitizeHtml(marked(prefix)) : ''
    _markedCache.key = prefix
    _markedCache.html = prefixHtml
  }

  // Tail rendered as plain pre — no syntax highlighting, no markdown.
  // If the tail starts a code fence that hasn't closed yet, switch to a
  // mono "code-streaming" style so the user sees code-like formatting in
  // progress without paying for hljs on every chunk. The fence closes →
  // boundary advances → real .code-block renders on the next parse.
  const isStreamingCode = /(^|\n)```[\w-]*\s*\n/.test(tail) && !/\n```\s*$/.test(tail)
  const tailClass = isStreamingCode ? 'ai-stream-tail streaming-code' : 'ai-stream-tail'
  const tailHtml = tail
    ? `<div class="${tailClass}">${escapeHtml(tail).replace(/\n/g, '<br>')}</div>`
    : ''

  return prefixHtml + tailHtml
})

const hasLargeCodeBlock = computed(() => {
  const c = props.message.content || ''
  const re = /```\w*\n([\s\S]*?)```/g
  let m
  while ((m = re.exec(c)) !== null) {
    if (m[1].split('\n').length >= 12) return true
  }
  return false
})

const renderedThinking = computed(() => {
  if (!props.message.thinking) return ''
  return sanitizeHtml(marked(props.message.thinking))
})

const streamingContent = computed(() => {
  const html = renderedContent.value
  if (props.isStreaming && props.isLast) {
    const caretHtml = '<span class="caret"></span>'
    const lastPClose = html.lastIndexOf('</p>')
    if (lastPClose !== -1) {
      return html.slice(0, lastPClose) + caretHtml + html.slice(lastPClose)
    }
    return html + caretHtml
  }
  return html
})

// Show the rotating-text loader while waiting for the first CONTENT token.
// Thinking-only streams (Qwen3.6 emits a <think> block before any content)
// must still show the loader — otherwise it flashes off the moment the first
// thinking_delta arrives, leaving the user staring at an empty bubble.
// A message is "frozen" when it's not the currently-streaming one. Frozen
// messages get content-visibility:auto so the browser skips layout/paint for
// messages outside the viewport — large enough to matter on long threads.
const isFrozen = computed(() => !(props.isStreaming && props.isLast))

const showLoadingPulse = computed(() =>
  props.isStreaming && props.isLast
  && !props.message.content
  && !props.message.error_state
)

// ── Loading pulse rotation (inlined; was LoadingPulse.vue) ─────────
const LOADING_VERBS_VI = [
  'Đang nghĩ', 'Đang tìm tòi', 'Đang chiêm nghiệm', 'Đang ngẫm nghĩ',
  'Đang lục lọi', 'Đang ghép nối', 'Đang kết nối', 'Đang đào sâu',
  'Đang phân tích', 'Đang tổng hợp', 'Đang khám phá', 'Đang lập luận',
  'Đang sàng lọc', 'Đang chắt lọc', 'Đang nghiền ngẫm', 'Đang xâu chuỗi',
]
const LOADING_VERBS_EN = [
  'Forging', 'Cogitating', 'Computing', 'Pondering', 'Musing', 'Brewing',
  'Crafting', 'Synthesizing', 'Reasoning', 'Connecting dots', 'Pondering deeply',
  'Thinking it through', 'Working it out', 'Putting it together',
]
function pickLocale() {
  if (typeof document === 'undefined') return 'vi'
  const m = document.cookie.split('; ').find(c => c.startsWith('sb_lang='))
  if (m) {
    const v = decodeURIComponent(m.split('=')[1] || '')
    if (v === 'en' || v === 'vi') return v
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : '') || ''
  return nav.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}
const loadingIdx = ref(0)
const loadingFading = ref(false)
let _loadingTimer = null
const loadingVerbs = computed(() => (pickLocale() === 'vi' ? LOADING_VERBS_VI : LOADING_VERBS_EN))
const loadingLabel = computed(() => `${loadingVerbs.value[loadingIdx.value]}…`)
function startLoadingRotation() {
  loadingIdx.value = Math.floor(Math.random() * loadingVerbs.value.length)
  if (_loadingTimer) clearInterval(_loadingTimer)
  _loadingTimer = setInterval(() => {
    loadingFading.value = true
    setTimeout(() => {
      const total = loadingVerbs.value.length
      let n = loadingIdx.value
      if (total > 1) {
        do { n = Math.floor(Math.random() * total) } while (n === loadingIdx.value)
      }
      loadingIdx.value = n
      loadingFading.value = false
    }, 200)
  }, 2000)
}
function stopLoadingRotation() {
  if (_loadingTimer) { clearInterval(_loadingTimer); _loadingTimer = null }
}
watch(showLoadingPulse, (v) => { v ? startLoadingRotation() : stopLoadingRotation() }, { immediate: true })
onBeforeUnmount(() => stopLoadingRotation())

const initials = computed(() => {
  const u = auth.user?.username || 'U'
  return u.slice(0, 2).toUpperCase()
})

// Parse the JSON-serialised body the backend sent on 429 (see useUnifiedChat)
// and turn the time-to-reset into a friendly "Xh Ym" string. Falls back to
// the raw next_full_reset timestamp if seconds_to_full_reset is missing.
const quotaResetLabel = computed(() => {
  if (props.message.error_state !== 'quota') return ''
  let body = {}
  try { body = JSON.parse(props.message.error_detail || '{}') } catch {}
  let secs = body?.seconds_to_full_reset
  if (typeof secs !== 'number' && body?.next_full_reset) {
    secs = Math.max(0, Math.floor((new Date(body.next_full_reset).getTime() - Date.now()) / 1000))
  }
  if (typeof secs !== 'number' || secs <= 0) return ''
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m} phút`
  return '< 1 phút'
})

const timeLabel = computed(() => {
  if (!props.message.created_at) return 'just now'
  return new Date(props.message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

async function copy() {
  await navigator.clipboard.writeText(props.message.content).catch(() => {})
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

const userRating = computed(() => props.message.user_rating ?? null)

async function rate(value) {
  if (!props.message?.id_persisted) return
  const current = userRating.value
  try {
    if (current === value) {
      // Toggle off
      await useApi().apiFetch(`/api/messages/${props.message.id_persisted}/rating`, {
        method: 'DELETE', _skipLoader: true,
      })
      props.message.user_rating = null
    } else {
      await useApi().apiFetch(`/api/messages/${props.message.id_persisted}/rating`, {
        method: 'POST',
        body: { rating: value },
        _skipLoader: true,
      })
      props.message.user_rating = value
    }
  } catch (err) {
    useToast().show(err?.data?.error || 'Rating failed', 'error')
  }
}
</script>

<style scoped>
.msg {
  display: flex;
  gap: 14px;
  animation: msgIn .35s cubic-bezier(.2,.7,.2,1) both;
}
/* Frozen messages (everything except the live-streaming one) opt into
   content-visibility — browser skips layout/paint when off-screen. Save
   intrinsic size so scroll position doesn't jump as the user scrolls.
   The live message stays normal so streaming updates don't fight the
   visibility heuristic. */
.msg[data-frozen="true"] {
  content-visibility: auto;
  contain-intrinsic-size: auto 200px;
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.msg[data-role="user"] { flex-direction: row-reverse; }
.msg[data-role="user"] .msg-body { align-items: flex-end; }
.msg[data-role="user"] .msg-meta { justify-content: flex-end; }
.msg[data-role="user"] .msg-actions { justify-content: flex-end; }

.msg-avatar {
  width: 26px; height: 26px;
  flex-shrink: 0;
  margin-top: 2px;
  border-radius: 50%;
}
.msg-avatar.user {
  background: linear-gradient(135deg, #5a5a5e, #28282b);
  border: 1px solid var(--line-2);
  display: grid; place-items: center;
  font-size: 10.5px; font-weight: 600;
  color: var(--fg-dim);
}
.msg-avatar.ai {
  border-radius: 7px;
  background: radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--accent) 90%, white) 0%, var(--accent) 60%, color-mix(in oklab, var(--accent) 40%, #000) 100%);
  box-shadow: 0 0 12px color-mix(in oklab, var(--accent) 25%, transparent);
  position: relative;
}
.msg-avatar.ai::after {
  content: ""; position: absolute; inset: 7px;
  background: var(--bg); border-radius: 2px;
}

.msg-body {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column;
}
.msg[data-role="user"] .msg-body { flex: 0 1 auto; max-width: 80%; }

.msg-meta {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px;
  color: var(--fg-dim);
  margin-bottom: 6px;
}
.msg-meta .name { font-weight: 500; color: var(--fg); }
.msg-meta .time { font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-faint); }

.msg-content {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--fg);
}

/* Attached docs chips — inside user bubble */
.msg-docs {
  display: flex; flex-wrap: wrap; gap: 5px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.doc-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px 3px 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line-2);
  border-radius: 5px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-mute);
  cursor: pointer;
  transition: color .12s, background .12s, border-color .12s;
}
.doc-chip:hover {
  color: var(--fg);
  background: rgba(255,255,255,0.07);
  border-color: var(--line-2);
}
.doc-chip.expired {
  color: var(--fg-faint);
  border-color: rgba(255,107,107,0.2);
  cursor: pointer;
}
.doc-chip.expired:hover {
  color: #ff9a9a;
  background: rgba(255,107,107,0.06);
  border-color: rgba(255,107,107,0.35);
}
.chip-expired-badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(255,107,107,0.12);
  color: #ff9a9a;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

/* User bubble */
.user-bubble {
  background: var(--bg-elev);
  border: 1px solid var(--line-2);
  padding: 10px 14px;
  border-radius: 16px 16px 4px 16px;
}
.user-bubble p { margin: 0; }

.user-text-wrap { overflow: hidden; }
.user-text-wrap.collapsed {
  max-height: 74px;
  -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
}

.show-more-btn {
  display: inline-flex; align-items: center; gap: 5px;
  margin-top: 6px;
  background: transparent; border: 0;
  color: var(--fg-mute);
  font-size: 12px; font-family: inherit;
  cursor: pointer;
  padding: 2px 0;
  transition: color .12s;
}
.show-more-btn:hover { color: var(--fg); }
/* When only docs without text/image — drop border-bottom of msg-docs */
.user-bubble .msg-docs:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
.user-image {
  display: block;
  max-width: 100%;
  max-height: 280px;
  border-radius: 8px;
  margin-bottom: 8px;
  object-fit: contain;
  border: 1px solid var(--line-2);
}
.msg-images {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-bottom: 8px;
}
.msg-image-link {
  display: block;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line-2);
  background: rgba(0,0,0,0.2);
  transition: transform .15s, border-color .15s;
}
.msg-image-link:hover { transform: scale(1.02); border-color: var(--accent); }
.msg-image-thumb {
  display: block;
  max-width: 180px;
  max-height: 180px;
  object-fit: cover;
}

/* Thinking block */
/* Thinking block — compact pill that sits inline at the top of the message
   instead of a full-width block. Click to expand details below. Compact form
   keeps message height stable so the reply content doesn't jump when the
   model finishes "thinking" and starts emitting real content. */
.thinking-block {
  margin-bottom: 8px;
  display: inline-flex;
  flex-direction: column;
  align-self: flex-start;
  border: 1px solid var(--line-2);
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255,255,255,0.02);
  max-width: 100%;
  transition: border-radius 160ms ease;
}
.thinking-block.open {
  border-radius: 10px;
  align-self: stretch;
}
.thinking-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px 3px 8px;
  background: transparent;
  border: 0;
  color: var(--fg-mute);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  text-align: left;
  transition: color .12s, background .12s;
  white-space: nowrap;
}
.thinking-toggle:hover:not(:disabled) {
  color: var(--fg);
  background: rgba(255,255,255,0.03);
}
.thinking-toggle:disabled { cursor: default; }
.thinking-toggle svg:first-child { color: color-mix(in oklab, var(--accent) 70%, transparent); flex-shrink: 0; }
.thinking-toggle span { flex: 1; }
.chevron {
  transition: transform .2s;
  flex-shrink: 0;
}
.thinking-block.open .chevron { transform: rotate(180deg); }

.thinking-body {
  display: none;
  padding: 10px 14px;
  border-top: 1px solid var(--line-2);
}
.thinking-block.open .thinking-body { display: block; }

.thinking-content {
  font-size: 13px;
  line-height: 1.65;
  color: var(--fg-dim);
  font-style: italic;
}
.thinking-content :deep(p) { margin: 0 0 8px; }
.thinking-content :deep(p:last-child) { margin-bottom: 0; }

/* Pulse animation when thinking is in progress */
.thinking-pulse .thinking-toggle { animation: thinking-fade 1.5s ease-in-out infinite; }
@keyframes thinking-fade {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Crossfade between the loading pulse and the streaming markdown body.
   120ms is short enough to feel snappy but long enough that the first
   token doesn't visually punch through. */
.ai-fade-enter-active,
.ai-fade-leave-active { transition: opacity 120ms ease; }
.ai-fade-enter-from,
.ai-fade-leave-to { opacity: 0; }

/* Pre-content loading indicator — inlined to bypass an HMR auto-import issue
   with the previous external LoadingPulse.vue component. Renders as a single
   middle-dot + rotating gerund verb + ellipsis (Claude Code status-line style). */
.loading-pulse {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--fg-dim, rgba(255, 255, 255, 0.78));
  line-height: 1.4;
  padding: 6px 0;
  min-width: 14ch;
}
.loading-icon {
  color: var(--accent, #c8f06b);
  animation: loading-spin 1.6s linear infinite, loading-pulse-glow 1.6s ease-in-out infinite;
  flex-shrink: 0;
  filter: drop-shadow(0 0 4px color-mix(in oklab, var(--accent, #c8f06b) 40%, transparent));
}
.loading-label {
  transition: opacity 200ms ease;
  opacity: 1;
}
.loading-label.fade-out {
  opacity: 0;
}
@keyframes loading-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes loading-pulse-glow {
  0%, 100% { opacity: 0.65; }
  50%      { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .loading-icon { animation: none; opacity: 0.85; }
  .loading-label { transition: none; }
}

/* Plain-text tail used while a markdown block is still being streamed; once
   the block closes it gets parsed properly and this wrapper disappears. */
.ai-content :deep(.ai-stream-tail) {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.6;
  color: var(--fg);
  margin: 0;
}
/* When the tail is mid-code-block (opening fence seen, closing not yet),
   give it monospace + dim background so it looks "code-shaped" while we
   wait for the real syntax-highlighted block to render on close. */
.ai-content :deep(.ai-stream-tail.streaming-code) {
  font-family: var(--font-mono);
  font-size: 13px;
  background: rgba(0, 0, 0, 0.30);
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 10px 12px;
  color: #cbd5e1;
}

/* AI prose */
.ai-content :deep(p) { margin: 0 0 10px; }
.ai-content :deep(p:last-child) { margin-bottom: 0; }
.ai-content :deep(h1),
.ai-content :deep(h2),
.ai-content :deep(h3) {
  font-weight: 600; margin: 16px 0 6px;
  line-height: 1.3;
}
.ai-content :deep(h1) { font-size: 18px; }
.ai-content :deep(h2) { font-size: 16px; }
.ai-content :deep(h3) { font-size: 14.5px; }
.ai-content :deep(ul),
.ai-content :deep(ol) { margin: 0 0 10px; padding-left: 20px; }
.ai-content :deep(li) { margin-bottom: 4px; }
.ai-content :deep(strong) { font-weight: 600; color: var(--fg); }
.ai-content :deep(em) { font-style: italic; color: var(--fg-dim); }
.ai-content :deep(a) { color: var(--accent); text-decoration: none; }
.ai-content :deep(a:hover) { text-decoration: underline; }
.ai-content :deep(blockquote) {
  border-left: 3px solid var(--line-2);
  margin: 8px 0;
  padding: 4px 12px;
  color: var(--fg-dim);
}

/* ── Inline code: heuristic-classified, color-coded ──
   Base style applies to every `…` span; subclasses tint by detected kind so
   the reader can distinguish file paths from function calls from env vars at
   a glance. Falls back to the neutral grey for anything we couldn't classify. */
.ai-content :deep(code:not(pre code)) {
  font-family: var(--font-mono);
  font-size: 12.5px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 1px 6px;
  color: var(--fg);
  white-space: nowrap;
}
/* File path / URL — blue, the universal "address" color. */
.ai-content :deep(code.inline-code.path),
.ai-content :deep(code.inline-code.url) {
  color: #82aaff;
  background: rgba(130, 170, 255, 0.10);
  border-color: rgba(130, 170, 255, 0.22);
}
/* File name with extension — cyan/teal */
.ai-content :deep(code.inline-code.file) {
  color: #5fc9d4;
  background: rgba(95, 201, 212, 0.10);
  border-color: rgba(95, 201, 212, 0.22);
}
/* ALL_CAPS env var / constant — orange/amber */
.ai-content :deep(code.inline-code.constant) {
  color: #ffb86c;
  background: rgba(255, 184, 108, 0.10);
  border-color: rgba(255, 184, 108, 0.22);
}
/* Function name(...) — green (matches the accent for callable things) */
.ai-content :deep(code.inline-code.function) {
  color: #c8f06b;
  background: rgba(200, 240, 107, 0.08);
  border-color: rgba(200, 240, 107, 0.22);
}
/* PascalCase type — purple */
.ai-content :deep(code.inline-code.type) {
  color: #c792ea;
  background: rgba(199, 146, 234, 0.10);
  border-color: rgba(199, 146, 234, 0.22);
}
/* Key: value pair — kept neutral but slightly highlighted with a left bar */
.ai-content :deep(code.inline-code.kv) {
  color: #e2e2e6;
  background: rgba(255, 255, 255, 0.04);
  border-left: 2px solid var(--accent, #c8f06b);
  border-radius: 4px;
  padding-left: 6px;
  white-space: normal;
}
/* Shell command — magenta */
.ai-content :deep(code.inline-code.shell) {
  color: #ff79c6;
  background: rgba(255, 121, 198, 0.08);
  border-color: rgba(255, 121, 198, 0.22);
}

/* Headings: icon + text, side by side, accent color */
.ai-content :deep(.ai-h) {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-content :deep(.ai-h1) { color: var(--fg); }
.ai-content :deep(.ai-h2) {
  color: var(--fg);
  border-bottom: 1px solid var(--line-2);
  padding-bottom: 4px;
}
.ai-content :deep(.ai-h3) {
  color: var(--fg-dim);
  text-transform: none;
}
.ai-content :deep(.ai-heading-icon) {
  color: var(--accent, #c8f06b);
  flex-shrink: 0;
}
.ai-content :deep(.ai-h1 .ai-heading-icon) { filter: drop-shadow(0 0 6px color-mix(in oklab, var(--accent, #c8f06b) 35%, transparent)); }

/* Code block wrapper */
.ai-content :deep(.code-block) {
  margin: 10px 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--line-2);
  background: rgba(0,0,0,0.35);
}
.ai-content :deep(.code-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid var(--line-2);
}
.ai-content :deep(.code-lang) {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-mute);
  text-transform: lowercase;
}
.ai-content :deep(.code-copy-btn) {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-mute);
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color .12s, background .12s;
}
.ai-content :deep(.code-copy-btn:hover) {
  color: var(--fg);
  background: rgba(255,255,255,0.06);
}
.ai-content :deep(pre) {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
}
.ai-content :deep(pre code) {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.65;
  background: transparent;
  border: 0;
  padding: 0;
  color: inherit;
}

/* hljs theme overrides (dark) */
.ai-content :deep(.hljs) { color: #abb2bf; }
.ai-content :deep(.hljs-keyword) { color: #c678dd; }
.ai-content :deep(.hljs-string) { color: #98c379; }
.ai-content :deep(.hljs-comment) { color: #5c6370; font-style: italic; }
.ai-content :deep(.hljs-number) { color: #d19a66; }
.ai-content :deep(.hljs-function) { color: #61afef; }
.ai-content :deep(.hljs-title) { color: #61afef; }
.ai-content :deep(.hljs-params) { color: #abb2bf; }
.ai-content :deep(.hljs-built_in) { color: #e06c75; }
.ai-content :deep(.hljs-attr) { color: #d19a66; }
.ai-content :deep(.hljs-tag) { color: #e06c75; }
.ai-content :deep(.hljs-name) { color: #e06c75; }
.ai-content :deep(.hljs-type) { color: #e5c07b; }
.ai-content :deep(.hljs-variable) { color: #abb2bf; }
.ai-content :deep(.hljs-literal) { color: #56b6c2; }

.caret {
  display: inline-block;
  width: 7px; height: 1.05em;
  background: var(--accent);
  vertical-align: -2px;
  margin-left: 2px;
  animation: caret 1s steps(2) infinite;
}
@keyframes caret { 50% { opacity: 0; } }

.msg-actions {
  margin-top: 8px;
  display: flex; gap: 2px;
  opacity: 0;
  transition: opacity .15s;
}
.msg:hover .msg-actions { opacity: 1; }
.msg-actions button {
  background: transparent; border: 0;
  color: var(--fg-mute);
  padding: 4px 7px;
  border-radius: 5px;
  font-size: 11px;
  display: flex; align-items: center; gap: 5px;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: color .12s, background .12s;
}
.msg-actions button:hover { color: var(--fg); background: rgba(255,255,255,0.04); }

.msg-tokens {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-faint);
  padding: 4px 7px;
  cursor: default;
}
.msg-model {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-mute);
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  cursor: default;
  max-width: 240px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.msg-model svg { color: var(--warn); flex-shrink: 0; }

.msg-error {
  display: flex; align-items: center; gap: 8px;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  background: rgba(239,68,68,0.06);
  border: 1px solid rgba(239,68,68,0.2);
  color: var(--danger);
}
.msg-error.cancelled {
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.08);
  color: var(--fg-mute);
}
.msg-error.quota {
  /* Less alarming than a hard network error — quota is recoverable + we have an upsell. */
  background: rgba(255, 180, 107, 0.06);
  border-color: rgba(255, 180, 107, 0.25);
  color: var(--warn, #ffb46b);
  align-items: flex-start;
}
.msg-error-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.msg-error-upsell {
  font-size: 11.5px;
  color: var(--fg-mute);
  font-style: italic;
}
.msg-error-text { flex: 1; }
.msg-error-retry {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--fg);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
}
.msg-error-retry:hover { background: rgba(255,255,255,0.1); }

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .msg { gap: 10px; }
  .msg-content { font-size: 14px; }
  .ai-content :deep(pre) { padding: 10px 12px; }
  .msg-avatar { width: 24px; height: 24px; }
  /* Slightly narrower user bubble max on tablet */
  .msg[data-role="user"] .msg-body { max-width: 85%; }
}

@media (max-width: 768px) {
  /* Message row layout */
  .msg { gap: 8px; }
  .msg-avatar { width: 22px; height: 22px; font-size: 9px; }

  /* User bubbles go full-width so they don't crowd on narrow screens */
  .msg[data-role="user"] .msg-body { max-width: 100%; flex: 1; }

  /* Keep user on right side but allow full width */
  .msg[data-role="user"] { align-items: flex-end; }

  /* Tighter bubble padding */
  .user-bubble { padding: 8px 10px; border-radius: 12px 12px 4px 12px; }

  /* Code blocks: prevent horizontal overflow, enable scroll */
  .ai-content :deep(.code-block) { margin: 8px 0; border-radius: 8px; }
  .ai-content :deep(pre) {
    padding: 10px 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .ai-content :deep(pre code) { font-size: 12px; }

  /* Action bar: always visible on mobile (no hover), wrap if needed */
  .msg-actions {
    opacity: 1;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }
  .msg-actions button {
    padding: 6px 8px;
    font-size: 12px;
    min-height: 32px; /* bigger tap target */
  }
  /* Push token/model info to new line on small screens */
  .msg-tokens, .msg-model { margin-left: 0; }

  /* Thinking block full-width on mobile */
  .thinking-block { align-self: stretch; }
  .thinking-toggle { padding: 6px 10px 6px 8px; }

  /* Heading sizes */
  .ai-content :deep(h1) { font-size: 16px; }
  .ai-content :deep(h2) { font-size: 14px; }
  .ai-content :deep(h3) { font-size: 13px; }

  /* Error banner: stack retry button below text */
  .msg-error { flex-wrap: wrap; }
  .msg-error-retry { width: 100%; text-align: center; margin-top: 4px; padding: 6px; }

  /* Hide secondary metadata on mobile */
  .msg-tokens, .msg-model { display: none; }

  /* Image thumb sizes for mobile */
  .msg-image-thumb { max-width: 140px; max-height: 140px; }
}
</style>
