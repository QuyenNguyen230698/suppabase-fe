<template>
  <div class="share-shell">
    <header class="share-head">
      <div class="brand-mark"></div>
      <h1 v-if="conv">{{ conv.title }}</h1>
      <span v-if="conv" class="share-meta">
        Shared read-only · {{ formatDate(conv.created_at) }}
      </span>
    </header>

    <main class="share-main">
      <div v-if="loading" class="share-state">Loading…</div>
      <div v-else-if="error" class="share-state error">
        <p>{{ error }}</p>
        <a href="/" class="share-back">Go home</a>
      </div>
      <div v-else-if="conv" class="share-thread">
        <div v-for="m in conv.messages" :key="m.id" class="share-msg" :data-role="m.role">
          <div class="share-msg-role">{{ m.role }}</div>
          <div class="share-msg-content" v-html="render(m.content)"></div>
        </div>
      </div>
    </main>

    <footer class="share-foot">
      Powered by Suppabase
    </footer>
  </div>
</template>

<script setup>
import { marked } from 'marked'
import hljs from 'highlight.js'
import { sanitizeHtml } from '~/composables/useSafeMarkdown.js'

definePageMeta({ layout: false })

const route = useRoute()
const config = useRuntimeConfig()

const conv    = ref(null)
const loading = ref(true)
const error   = ref('')

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
}
marked.setOptions({ renderer, breaks: true, gfm: true })

function render(text) { return text ? sanitizeHtml(marked(text)) : '' }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(async () => {
  try {
    const data = await $fetch(`${config.public.apiBase}/api/public/share/${route.params.token}`)
    conv.value = data
  } catch (e) {
    error.value = e?.data?.error || 'This share link is invalid or has expired.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.share-shell {
  min-height: 100vh;
  display: flex; flex-direction: column;
  background: var(--bg);
  color: var(--fg);
}
.share-head {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 28px;
  border-bottom: 1px solid var(--line);
}
.brand-mark {
  width: 22px; height: 22px;
  border-radius: 5px;
  background: conic-gradient(from 210deg, var(--accent), color-mix(in oklab, var(--accent) 40%, #fff) 40%, var(--accent) 80%, var(--accent));
  position: relative;
  flex-shrink: 0;
}
.brand-mark::after {
  content: ""; position: absolute; inset: 5.5px;
  background: var(--bg); border-radius: 1.5px;
}
.share-head h1 {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 400;
  margin: 0;
  flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.share-meta {
  font-size: 11.5px;
  color: var(--fg-mute);
  font-family: var(--font-mono);
}

.share-main {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: stretch;
}
.share-thread {
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 28px 64px;
  display: flex; flex-direction: column; gap: 28px;
}
.share-msg-role {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--fg-mute);
  margin-bottom: 6px;
}
.share-msg[data-role="assistant"] .share-msg-role { color: var(--accent); }
.share-msg-content {
  font-size: 14.5px; line-height: 1.7;
  color: var(--fg);
}
:deep(.share-msg-content pre) {
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px 14px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13px;
}

.share-state {
  margin: 80px auto;
  text-align: center;
  color: var(--fg-mute);
}
.share-state.error { color: var(--danger); }
.share-back {
  display: inline-block;
  margin-top: 16px;
  color: var(--accent);
  text-decoration: none;
}

.share-foot {
  border-top: 1px solid var(--line);
  padding: 12px 28px;
  font-size: 11px;
  color: var(--fg-faint);
  font-family: var(--font-mono);
  text-align: center;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .share-head { padding: 14px 20px; }
  .share-thread { padding: 24px 20px 48px; }
}

@media (max-width: 768px) {
  .share-head {
    padding: 12px 14px;
    gap: 10px;
    flex-wrap: wrap;
  }
  .share-head h1 { font-size: 16px; }
  .share-meta { width: 100%; font-size: 10.5px; }
  .share-thread { padding: 16px 14px 40px; gap: 20px; }
  .share-msg-content { font-size: 13.5px; }
  .share-foot { padding: 10px 14px; }
}
</style>
