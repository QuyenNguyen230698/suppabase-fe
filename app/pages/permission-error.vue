<template>
  <div class="perm-shell">
    <div class="grain" aria-hidden="true"></div>

    <div class="perm-card">
      <!-- Lock icon -->
      <div class="lock-wrap">
        <div class="lock-ring lock-ring-1" aria-hidden="true"></div>
        <div class="lock-ring lock-ring-2" aria-hidden="true"></div>
        <svg class="lock-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/>
        </svg>
      </div>

      <!-- Badge -->
      <div class="err-badge">403 · Forbidden</div>

      <h1 class="perm-title">Access denied</h1>
      <p class="perm-desc">
        You don't have the required permissions to view
        <template v-if="targetPage">
          <span class="target-page">{{ targetPage }}</span>.
        </template>
        <template v-else>this page.</template>
        Contact your administrator if you believe this is a mistake.
      </p>

      <!-- Info rows -->
      <div class="info-grid">
        <div class="info-row" v-if="auth.user?.username">
          <span class="info-key">Signed in as</span>
          <span class="info-val">{{ auth.user.username }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Role</span>
          <span class="info-val role-badge" :class="roleClass">{{ roleLabel }}</span>
        </div>
        <div class="info-row" v-if="targetPage">
          <span class="info-key">Tried to access</span>
          <span class="info-val mono">{{ targetPage }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="btn-primary" @click="goHome">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Go home
        </button>
        <button class="btn-ghost" @click="goBack">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Go back
        </button>
        <button class="btn-ghost btn-logout" @click="confirmLogout">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Switch account
        </button>
      </div>
    </div>

    <!-- Ambient glow -->
    <div class="glow" aria-hidden="true"></div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { confirmLogout } = useLogout()

const targetPage = computed(() => {
  const from = route.query.from
  return typeof from === 'string' && from ? from : null
})

const roleLabel = computed(() => {
  const role = auth.user?.role
  if (!role) return 'Unknown'
  const r = (auth.roles ?? []).find(x => x.name === role)
  return r?.display_name || role
})

const roleClass = computed(() => ({
  'role-admin':  auth.isAdmin,
  'role-member': !auth.isAdmin,
}))

function goHome() {
  router.push(auth.isLoggedIn ? '/c' : '/login')
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    goHome()
  }
}
</script>

<style scoped>
.perm-shell {
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
.perm-card {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 440px;
  width: 100%;
  background: var(--bg-elev, #131316);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 44px 36px 36px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
}

/* Lock icon with rings */
.lock-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  margin-bottom: 22px;
  flex-shrink: 0;
}
.lock-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 107, 107, 0.15);
  animation: ring-pulse 3s ease-in-out infinite;
}
.lock-ring-1 { inset: 0; animation-delay: 0s; }
.lock-ring-2 { inset: -10px; opacity: 0.5; animation-delay: 0.8s; }
@keyframes ring-pulse {
  0%, 100% { opacity: 0.15; transform: scale(1); }
  50%       { opacity: 0.35; transform: scale(1.04); }
}
.lock-icon {
  position: relative;
  z-index: 1;
  color: var(--danger, #ff6b6b);
  filter: drop-shadow(0 0 8px rgba(255,107,107,0.35));
}

/* Badge */
.err-badge {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 3px 11px;
  border-radius: 999px;
  border: 1px solid rgba(255,107,107,0.25);
  background: rgba(255,107,107,0.08);
  color: var(--danger, #ff6b6b);
  margin-bottom: 16px;
  font-family: var(--font-mono, ui-monospace, monospace);
}

/* Title & desc */
.perm-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--fg, #ededec);
  margin: 0 0 12px;
}
.perm-desc {
  font-size: 13px;
  color: var(--fg-dim, rgba(237,237,236,0.62));
  line-height: 1.7;
  margin: 0 0 24px;
}
.target-page {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  color: var(--fg, #ededec);
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 1px 6px;
  border-radius: 5px;
}

/* Info grid */
.info-grid {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.info-row:last-child { border-bottom: 0; }
.info-key {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
}
.info-val {
  font-size: 12px;
  font-weight: 600;
  color: var(--fg, #ededec);
}
.info-val.mono {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-weight: 400;
  font-size: 11px;
  color: rgba(255,255,255,0.5);
}
.role-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
}
.role-badge.role-admin  { background: rgba(216,255,91,0.1); color: var(--accent, #d8ff5b); border: 1px solid rgba(216,255,91,0.2); }
.role-badge.role-member { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.08); }

/* Actions */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
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
.btn-primary:hover  { opacity: 0.88; transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 14px;
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
.btn-logout:hover { background: rgba(255,107,107,0.08); color: var(--danger, #ff6b6b); border-color: rgba(255,107,107,0.2); }

/* Ambient glow */
.glow {
  position: absolute;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background: var(--danger, #ff6b6b);
  filter: blur(130px);
  opacity: 0.055;
  pointer-events: none;
  z-index: 0;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .perm-card { padding: 36px 28px 28px; }
  .perm-title { font-size: 22px; }
}

@media (max-width: 768px) {
  .perm-shell { padding: 16px; }
  .perm-card { padding: 28px 18px 22px; border-radius: 16px; }
  .lock-wrap { width: 60px; height: 60px; margin-bottom: 16px; }
  .perm-title { font-size: 20px; }
  .perm-desc { font-size: 12.5px; }
  .info-row { flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px 12px; }
  .actions { flex-direction: column; align-items: stretch; gap: 8px; }
  .btn-primary,
  .btn-ghost { width: 100%; justify-content: center; height: 44px; font-size: 14px; }
}
</style>
