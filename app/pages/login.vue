<template>
  <div class="shell">
    <AppLoader :show="loaderVisible" message="Signing in…" />

    <!-- Film grain -->
    <div class="grain" aria-hidden="true"></div>

    <!-- LEFT: form -->
    <section class="form-side">
      <div class="top-row">
        <div class="brand-mark"></div>
        <div class="brand-name">Suppabase</div>
      </div>

      <div class="form-wrap">
        <form class="form" @submit.prevent="handleLogin" autocomplete="on" novalidate>
          <div class="kicker">
            <span class="dot"></span>
            Local workspace
          </div>
          <h1 class="title">Welcome <em>back</em></h1>
          <p class="subtitle">Sign in with your local credentials to continue to your Suppabase workspace.</p>

          <!-- Username -->
          <div class="field">
            <div class="label-row">
              <label for="username">Username</label>
            </div>
            <div class="inp-wrap" :class="{ invalid: fieldError === 'username' }">
              <span class="icn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
              </span>
              <input
                id="username"
                v-model="form.username"
                type="text"
                autocomplete="username"
                placeholder="admin-suppabase"
                :disabled="loading"
                @input="clearError"
                autofocus
              />
            </div>
          </div>

          <!-- Password -->
          <div class="field">
            <div class="label-row">
              <label for="password">Password</label>
            </div>
            <div class="inp-wrap" :class="{ invalid: fieldError === 'password' }">
              <span class="icn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg>
              </span>
              <input
                id="password"
                v-model="form.password"
                type="password"
                autocomplete="current-password"
                placeholder="••••••••"
                :disabled="loading"
                @input="clearError"
                @keydown="detectCaps"
                @keyup="detectCaps"
                @blur="capsOn = false"
              />
            </div>
            <div v-if="capsOn" class="caps-hint">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              Caps Lock is on
            </div>
          </div>

          <!-- Remember me -->
          <label class="remember">
            <input type="checkbox" v-model="rememberMe" class="remember-chk" />
            <span class="remember-box" :class="{ checked: rememberMe }">
              <svg v-if="rememberMe" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>
            </span>
            <span class="remember-lbl">Remember me</span>
          </label>

          <!-- Error -->
          <div v-if="error" class="err-banner">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 17h.01"/></svg>
            {{ error }}
          </div>

          <!-- Submit -->
          <button type="submit" class="submit" :disabled="loading || !form.username || !form.password">
            <span v-if="loading" class="spin"></span>
            <span class="lbl">{{ loading ? 'Signing in…' : 'Sign in' }}</span>
            <svg v-if="!loading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>

          <div class="divider">local auth</div>

          <!-- Info note -->
          <div class="local-note">
            <span class="note-ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1 3 5v6c0 5 3.5 9 9 11 5.5-2 9-6 9-11V5l-9-4z"/></svg>
            </span>
            <div>
              This workspace authenticates against the local user store. Contact your admin to provision an account.
            </div>
          </div>

          <div class="legal">
            <span>Suppabase · local build</span>
            <span class="spacer"></span>
            <span>deepseek-r1:7b · qwen3:14b</span>
          </div>
        </form>
      </div>
    </section>

    <!-- RIGHT: art -->
    <aside class="art-side" aria-hidden="true">
      <div class="art-inner">
        <span class="art-tag">Suppabase · workspace</span>

        <div class="art-quote">
          <div class="q-mark">"</div>
          <div class="q">A quiet place to <em>think</em> with your AI — and a clean place to <em>ship</em> with it.</div>
          <div class="attr">— Suppabase, 2026</div>
        </div>

        <div class="status-card">
          <span class="s-dot"></span>
          <div class="s-meta">
            <div class="s-nm">Ollama running · localhost:11434</div>
            <div class="s-sub">deepseek-r1:7b · qwen3:14b</div>
          </div>
          <span class="s-pill">local</span>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const auth = useAuthStore()
const { t, tError } = useI18n()
const form = reactive({ username: '', password: '' })
const loading = ref(false)
const loaderVisible = ref(false)
const error = ref('')
const fieldError = ref('')
const capsOn = ref(false)
const rememberMe = ref(false)

onMounted(() => {
  const saved = localStorage.getItem('nocturne_remember')
  if (saved) {
    form.username = saved
    rememberMe.value = true
  }
})

function clearError() {
  error.value = ''
  fieldError.value = ''
}

function detectCaps(e) {
  capsOn.value = e.getModifierState?.('CapsLock') ?? false
}

async function handleLogin() {
  error.value = ''
  fieldError.value = ''

  if (!form.username.trim()) {
    fieldError.value = 'username'
    error.value = t('auth.username') + ' ' + t('common.no').toLowerCase()
    return
  }
  if (!form.password) {
    fieldError.value = 'password'
    error.value = t('auth.password') + ' ' + t('common.no').toLowerCase()
    return
  }

  loading.value = true
  try {
    await auth.login(form.username.trim(), form.password)
    if (rememberMe.value) {
      localStorage.setItem('nocturne_remember', form.username.trim())
    } else {
      localStorage.removeItem('nocturne_remember')
    }
    // Pre-warm permissions/modules/roles so the next page renders the full
    // sidebar/menu on first paint instead of showing only public entries.
    await Promise.all([
      auth.fetchPermissions(),
      auth.fetchModules(),
      auth.fetchRoles(),
    ])
    loaderVisible.value = true
    useToast().show(t('auth.signedIn'), 'success')
    await new Promise(r => setTimeout(r, 800))
    navigateTo('/c')
  } catch (err) {
    loaderVisible.value = false
    error.value = tError(err, t('errors.ERR_INVALID_CREDENTIALS'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Shell ─────────────────────────────────────── */
.shell {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  min-height: 100vh;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.55;
  position: relative;
  overflow: hidden;
}

.grain {
  position: fixed; inset: 0;
  pointer-events: none; z-index: 1000;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.55;
  mix-blend-mode: overlay;
}

/* ── Form side ─────────────────────────────────── */
.form-side {
  display: flex; flex-direction: column;
  padding: 28px 40px;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.top-row {
  display: flex; align-items: center; gap: 10px;
}
.brand-mark {
  width: 22px; height: 22px;
  border-radius: 5px;
  background: conic-gradient(from 210deg, var(--accent), color-mix(in oklab, var(--accent) 40%, #fff) 40%, var(--accent) 80%, var(--accent));
  box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.4), 0 0 12px color-mix(in oklab, var(--accent) 28%, transparent);
  position: relative; flex-shrink: 0;
}
.brand-mark::after {
  content: ""; position: absolute; inset: 6px;
  background: var(--bg); border-radius: 1.5px;
}
.brand-name {
  font-family: var(--font-serif);
  font-size: 20px; letter-spacing: 0.005em; line-height: 1;
}

.form-wrap {
  flex: 1; display: grid; place-items: center; padding: 20px 0;
}
.form { width: 100%; max-width: 380px; }

.kicker {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-mono);
  font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--fg-mute); margin-bottom: 18px;
}
.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

.title {
  font-family: var(--font-serif);
  font-size: 44px; line-height: 1.05; font-weight: 400;
  letter-spacing: -0.01em; margin: 0 0 8px;
}
.title em { color: var(--accent); font-style: italic; }
.subtitle {
  color: var(--fg-dim); font-size: 14px;
  margin: 0 0 32px; max-width: 340px;
}

/* Fields */
.field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }
.label-row { display: flex; align-items: center; gap: 10px; }
.label-row label {
  font-family: var(--font-mono);
  font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--fg-mute);
}

.inp-wrap {
  display: flex; align-items: center;
  background: var(--bg-elev);
  border: 1px solid var(--line-2);
  border-radius: 9px; height: 42px;
  transition: border-color .14s, background .14s, box-shadow .14s;
}
.inp-wrap:focus-within {
  border-color: color-mix(in oklab, var(--accent) 50%, transparent);
  background: var(--bg-elev-2);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 12%, transparent);
}
.inp-wrap.invalid {
  border-color: color-mix(in oklab, var(--danger) 60%, transparent);
  background: color-mix(in oklab, var(--danger) 5%, var(--bg-elev));
}
.inp-wrap.invalid .icn { color: var(--danger); }

.icn {
  width: 38px; display: grid; place-items: center;
  color: var(--fg-mute); flex-shrink: 0;
}
.inp-wrap input {
  flex: 1; min-width: 0; border: 0; outline: none;
  background: transparent; color: var(--fg);
  font-size: 14px; font-family: inherit;
  padding: 0 12px 0 0;
}
.inp-wrap input::placeholder { color: var(--fg-faint); }
.inp-wrap input:disabled { opacity: 0.5; }

.reveal-btn {
  appearance: none; background: transparent; border: 0;
  color: var(--fg-mute); padding: 0 12px; height: 100%;
  display: grid; place-items: center; cursor: pointer;
  transition: color .12s;
}
.reveal-btn:hover { color: var(--fg); }

.caps-hint {
  display: flex; align-items: center; gap: 6px;
  font-family: var(--font-mono);
  font-size: 10.5px; color: var(--warn);
}

/* Remember me */
.remember {
  display: inline-flex; align-items: center; gap: 9px;
  cursor: pointer; user-select: none;
  margin-bottom: 16px;
}
.remember-chk { display: none; }
.remember-box {
  width: 16px; height: 16px; border-radius: 4px;
  border: 1px solid var(--line-2);
  background: var(--bg-elev);
  display: grid; place-items: center;
  flex-shrink: 0;
  transition: border-color .13s, background .13s;
  color: var(--accent-fg);
}
.remember:hover .remember-box { border-color: color-mix(in oklab, var(--accent) 50%, transparent); }
.remember-box.checked {
  background: var(--accent);
  border-color: var(--accent);
}
.remember-lbl {
  font-family: var(--font-mono);
  font-size: 11px; color: var(--fg-mute);
  transition: color .13s;
}
.remember:hover .remember-lbl { color: var(--fg); }

/* Error */
.err-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  background: color-mix(in oklab, var(--danger) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--danger) 30%, transparent);
  border-radius: 8px;
  color: var(--danger);
  font-size: 12.5px;
  margin-bottom: 14px;
  animation: shake .3s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(3px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}

/* Submit */
.submit {
  appearance: none; border: 0;
  width: 100%; height: 44px; border-radius: 10px;
  background: var(--accent); color: var(--accent-fg);
  font-weight: 500; font-size: 14px; font-family: inherit;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer;
  transition: background .14s, transform .12s, opacity .15s;
  margin-top: 4px;
}
.submit:hover { background: color-mix(in oklab, var(--accent) 92%, white); }
.submit:active { transform: translateY(1px); }
.submit:disabled {
  background: var(--line); color: var(--fg-mute);
  cursor: not-allowed; transform: none;
}
.spin {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid color-mix(in oklab, var(--accent-fg) 30%, transparent); border-top-color: var(--accent-fg);
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Divider */
.divider {
  display: flex; align-items: center; gap: 12px;
  margin: 22px 0;
  color: var(--fg-mute);
  font-family: var(--font-mono);
  font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;
}
.divider::before, .divider::after {
  content: ""; flex: 1; height: 1px;
  background: var(--line);
}

/* Local note */
.local-note {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px;
  border: 1px dashed var(--line-2);
  border-radius: 10px;
  background: var(--line);
  color: var(--fg-dim);
  font-size: 12.5px; line-height: 1.5;
}
.note-ic { color: var(--accent); margin-top: 1px; flex-shrink: 0; }

/* Legal */
.legal {
  margin-top: 28px;
  display: flex; align-items: center; gap: 16px;
  color: var(--fg-faint);
  font-family: var(--font-mono);
  font-size: 10.5px;
}
.spacer { flex: 1; }

/* ── Art side ──────────────────────────────────── */
.art-side {
  position: relative;
  background:
    radial-gradient(80% 60% at 100% 0%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%),
    radial-gradient(60% 60% at 0% 100%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 70%),
    var(--bg-elev);
  border-left: 1px solid var(--line);
  overflow: hidden;
  display: flex; flex-direction: column;
  padding: 40px;
}
.art-side::before {
  content: "";
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 80%);
}
.art-side::after {
  content: "";
  position: absolute;
  top: 30%; left: 50%; width: 60%; aspect-ratio: 1;
  transform: translate(-50%, -40%);
  background: radial-gradient(closest-side, color-mix(in oklab, var(--accent) 24%, transparent), transparent 70%);
  filter: blur(50px);
}

.art-inner {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; height: 100%;
}
.art-tag {
  align-self: flex-start;
  font-family: var(--font-mono);
  font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--fg-dim);
  padding: 4px 10px;
  border: 1px solid var(--line-2); border-radius: 999px;
  background: var(--line);
}

.art-quote { margin: auto 0; max-width: 460px; }
.q-mark {
  font-family: var(--font-serif);
  font-style: italic; color: var(--accent);
  font-size: 80px; line-height: 1; margin-bottom: -18px; opacity: 0.8;
}
.q {
  font-family: var(--font-serif);
  font-size: 38px; line-height: 1.18;
  letter-spacing: -0.01em; color: var(--fg);
}
.q em { font-style: italic; color: var(--accent); }
.attr {
  margin-top: 22px;
  font-family: var(--font-mono);
  font-size: 11.5px; color: var(--fg-mute);
  letter-spacing: 0.04em;
  display: flex; align-items: center; gap: 10px;
}
.attr::before { content: ""; width: 22px; height: 1px; background: var(--line-2); }

/* Status card */
.status-card {
  margin-top: auto;
  padding: 14px 16px;
  background: color-mix(in oklab, var(--bg-elev) 80%, transparent);
  border: 1px solid var(--line-2);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  display: flex; align-items: center; gap: 14px;
}
.s-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 10px color-mix(in oklab, var(--ok) 60%, transparent);
  flex-shrink: 0;
}
.s-meta { flex: 1; min-width: 0; }
.s-nm { font-size: 13px; color: var(--fg); }
.s-sub {
  font-family: var(--font-mono);
  font-size: 11px; color: var(--fg-mute); margin-top: 2px;
}
.s-pill {
  font-family: var(--font-mono);
  font-size: 10.5px; color: var(--fg-dim);
  padding: 4px 9px;
  border: 1px solid var(--line-2); border-radius: 999px;
}

/* ── Responsive ────────────────────────────────── */
@media (max-width: 920px) {
  .shell { grid-template-columns: 1fr; overflow: auto; }
  .art-side { display: none; }
  .form-side { padding: 24px; min-height: 100vh; }
  .title { font-size: 36px; }
}

@media (max-width: 1024px) {
  .form-side { padding: 24px 32px; }
  .title { font-size: 38px; }
  .art-side { padding: 28px; }
  .q { font-size: 30px; }
}

@media (max-width: 768px) {
  .shell { grid-template-columns: 1fr; overflow: auto; }
  .art-side { display: none; }
  .form-side { padding: 20px 18px; min-height: 100vh; }
  .title { font-size: 32px; }
  .subtitle { font-size: 13px; margin-bottom: 24px; }
  .inp-wrap { height: 46px; }
  .submit { height: 46px; font-size: 15px; }
  .legal { flex-direction: column; gap: 4px; font-size: 10px; }
  .spacer { display: none; }
}
</style>
