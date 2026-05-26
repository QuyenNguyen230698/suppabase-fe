<template>
  <div class="error-shell">
    <div class="grain" aria-hidden="true"></div>

    <div class="error-card">
      <!-- Animated icon -->
      <div class="icon-wrap" :class="iconClass">
        <svg v-if="is404" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          <path d="M8 11h6M11 8v6" opacity="0.4"/>
        </svg>
        <svg v-else-if="is403" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        <svg v-else-if="isNetwork" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 6s4-2 11-2 11 2 11 2"/><path d="M5 10s3-1.5 7-1.5 7 1.5 7 1.5"/><path d="M9 14s1.5-1 3-1 3 1 3 1"/>
          <line x1="2" y1="2" x2="22" y2="22" stroke-width="1.6"/>
        </svg>
        <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/>
        </svg>
      </div>

      <!-- Code badge -->
      <div class="code-badge" :class="badgeClass">
        {{ error?.statusCode ?? '—' }}
      </div>

      <h1 class="error-title">{{ title }}</h1>
      <p class="error-desc">{{ description }}</p>

      <!-- Detail (dev hint) -->
      <div v-if="error?.message && error.message !== title" class="error-detail">
        <span class="detail-label">Detail</span>
        <span class="detail-msg">{{ error.message }}</span>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="btn-primary" @click="handleHome">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Go home
        </button>
        <button class="btn-ghost" @click="handleClearError">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
          Try again
        </button>
        <button class="btn-ghost" @click="copyReport">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          {{ reportCopied ? 'Copied' : 'Copy details' }}
        </button>
      </div>
    </div>

    <!-- Ambient glow -->
    <div class="glow" :class="glowClass" aria-hidden="true"></div>
  </div>
</template>

<script setup>
const props = defineProps({
  error: Object,
})

const statusCode = computed(() => props.error?.statusCode ?? 500)

const is404     = computed(() => statusCode.value === 404)
const is403     = computed(() => statusCode.value === 403 || statusCode.value === 401)
const isNetwork = computed(() => statusCode.value === 0 || props.error?.message?.toLowerCase().includes('network'))
const isServer  = computed(() => statusCode.value >= 500)

const title = computed(() => {
  if (is404.value)     return 'Page not found'
  if (is403.value)     return 'Access denied'
  if (isNetwork.value) return 'No connection'
  if (isServer.value)  return 'Something went wrong'
  return 'Unexpected error'
})

const description = computed(() => {
  if (is404.value)     return "The page you're looking for doesn't exist or has been moved."
  if (is403.value)     return "You don't have permission to access this resource."
  if (isNetwork.value) return 'Unable to reach the server. Check your connection and try again.'
  if (isServer.value)  return 'An internal error occurred on the server. Please try again later.'
  return 'An unexpected error occurred. Please try again or contact support.'
})

const iconClass = computed(() => ({
  'icon-warn':   isServer.value || isNetwork.value,
  'icon-danger': is403.value,
  'icon-muted':  is404.value,
}))

const badgeClass = computed(() => ({
  'badge-danger': is403.value || isServer.value,
  'badge-warn':   isNetwork.value,
  'badge-muted':  is404.value,
}))

const glowClass = computed(() => ({
  'glow-danger': is403.value || isServer.value,
  'glow-accent': is404.value,
  'glow-warn':   isNetwork.value,
}))

function handleClearError() {
  clearError({ redirect: '/' })
}

function handleHome() {
  clearError({ redirect: '/' })
}

const reportCopied = ref(false)
async function copyReport() {
  const report = [
    `Status: ${props.error?.statusCode ?? '?'}`,
    `Message: ${props.error?.message ?? '-'}`,
    `URL: ${typeof window !== 'undefined' ? window.location.href : '-'}`,
    `Time: ${new Date().toISOString()}`,
    `UA: ${typeof navigator !== 'undefined' ? navigator.userAgent : '-'}`,
    props.error?.stack ? `\nStack:\n${props.error.stack}` : '',
  ].join('\n')
  try {
    await navigator.clipboard.writeText(report)
    reportCopied.value = true
    setTimeout(() => { reportCopied.value = false }, 1500)
  } catch {}
}

// When back/forward lands on a page using the default layout, make sure
// the nuxt error state is cleared so the error layout doesn't sit on top
// of the default layout (which causes broken-looking UI).
if (typeof window !== 'undefined') {
  const onPop = () => clearError({ redirect: window.location.pathname + window.location.search })
  onMounted(()        => window.addEventListener('popstate', onPop))
  onBeforeUnmount(()  => window.removeEventListener('popstate', onPop))
}
</script>

<style scoped>
.error-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg, #0b0b0c);
  font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
  position: relative;
  overflow: hidden;
  padding: 24px;
}

/* Film grain */
.grain {
  position: fixed;
  inset: -50%;
  width: 200%;
  height: 200%;
  pointer-events: none;
  opacity: 0.028;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  animation: grain-shift 8s steps(10) infinite;
}
@keyframes grain-shift {
  0%,100% { transform: translate(0,0); }
  10%      { transform: translate(-2%,-3%); }
  20%      { transform: translate(3%,2%); }
  30%      { transform: translate(-1%,4%); }
  40%      { transform: translate(4%,-1%); }
  50%      { transform: translate(-3%,1%); }
  60%      { transform: translate(2%,3%); }
  70%      { transform: translate(-4%,-2%); }
  80%      { transform: translate(1%,-4%); }
  90%      { transform: translate(-2%,2%); }
}

/* Card */
.error-card {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
  max-width: 420px;
  width: 100%;
  background: var(--bg-elev, #131316);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 40px 36px 32px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
}

/* Icon */
.icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  display: grid;
  place-items: center;
  margin-bottom: 20px;
  color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.03);
}
.icon-wrap.icon-danger { color: var(--danger, #ff6b6b); border-color: rgba(255,107,107,0.2); background: rgba(255,107,107,0.06); }
.icon-wrap.icon-warn   { color: var(--warn, #ffcb6b);   border-color: rgba(255,203,107,0.2); background: rgba(255,203,107,0.06); }
.icon-wrap.icon-muted  { color: rgba(255,255,255,0.25); }

/* Code badge */
.code-badge {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.3);
  margin-bottom: 14px;
  font-family: var(--font-mono, ui-monospace, monospace);
}
.code-badge.badge-danger { color: var(--danger, #ff6b6b); border-color: rgba(255,107,107,0.25); background: rgba(255,107,107,0.08); }
.code-badge.badge-warn   { color: var(--warn, #ffcb6b);   border-color: rgba(255,203,107,0.25); background: rgba(255,203,107,0.08); }
.code-badge.badge-muted  { color: rgba(255,255,255,0.28); }

/* Title & desc */
.error-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--fg, #ededec);
  margin: 0 0 10px;
}
.error-desc {
  font-size: 13px;
  color: var(--fg-dim, rgba(237,237,236,0.62));
  line-height: 1.65;
  margin: 0 0 20px;
}

/* Detail */
.error-detail {
  width: 100%;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 20px;
  text-align: left;
}
.detail-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.25);
  white-space: nowrap;
  margin-top: 1px;
  flex-shrink: 0;
}
.detail-msg {
  font-size: 11px;
  font-family: var(--font-mono, ui-monospace, monospace);
  color: rgba(255,255,255,0.35);
  word-break: break-all;
  line-height: 1.6;
}

/* Actions */
.actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 18px;
  background: var(--accent, #d8ff5b);
  color: #0b0b0c;
  border: 0;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .15s, transform .15s;
  font-family: inherit;
}
.btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 16px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .12s, color .12s, border-color .12s;
  font-family: inherit;
}
.btn-ghost:hover { background: rgba(255,255,255,0.09); color: var(--fg, #ededec); border-color: rgba(255,255,255,0.15); }

/* Ambient glow */
.glow {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.07;
  pointer-events: none;
  z-index: 0;
}
.glow-danger { background: var(--danger, #ff6b6b); }
.glow-accent { background: var(--accent, #d8ff5b); }
.glow-warn   { background: var(--warn, #ffcb6b); }

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .error-card { padding: 32px 28px 26px; }
  .error-title { font-size: 20px; }
}

@media (max-width: 768px) {
  .error-shell { padding: 16px; align-items: flex-end; }
  .error-card {
    padding: 28px 20px 24px;
    border-radius: 16px;
    max-width: 100%;
  }
  .icon-wrap { width: 52px; height: 52px; border-radius: 13px; margin-bottom: 14px; }
  .error-title { font-size: 18px; }
  .error-desc  { font-size: 12.5px; }

  /* Stack action buttons vertically on mobile */
  .actions {
    flex-direction: column;
    width: 100%;
    gap: 8px;
    margin-top: 8px;
  }
  .btn-primary,
  .btn-ghost {
    width: 100%;
    justify-content: center;
    height: 44px; /* bigger tap target */
    font-size: 14px;
  }
  /* Reduce glow size on mobile */
  .glow { width: 300px; height: 300px; }
}
</style>
