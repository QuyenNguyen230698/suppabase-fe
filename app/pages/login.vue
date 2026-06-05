<template>
  <div class="shell">
    <AppLoader :show="loaderVisible" message="Signing in…" />
    <div class="grain" aria-hidden="true"></div>

    <!-- LEFT: intro -->
    <aside class="art-side">
      <div class="art-inner">
        <div class="brand-row">
          <span class="brand-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>
          </span>
          <span class="brand-name">Suppabase</span>
        </div>

        <h1 class="art-title">{{ t('auth.heroTitle') }}</h1>
        <p class="art-sub">{{ t('auth.heroSub') }}</p>

        <div class="art-foot">© {{ year }} Suppabase</div>
      </div>
    </aside>

    <!-- RIGHT: auth -->
    <section class="form-side">
      <div class="form-wrap">
        <div class="pane-stage" :style="{ height: stageHeight }">
          <Transition name="pane" mode="out-in" @enter="measure" @after-leave="measure">

            <!-- ══════ EMAIL OTP ══════ -->
            <div v-if="mode === 'otp'" key="otp" ref="paneEl" class="pane">
              <!-- Step: email -->
              <template v-if="otpStep === 'email'">
                <h2 class="head">{{ t('auth.signIn') }}</h2>
                <p class="head-sub">{{ t('auth.useEmail') }}</p>

                <div class="field">
                  <label class="lbl" for="otp-email">{{ t('auth.email') }}</label>
                  <div class="inp-wrap" :class="{ invalid: fieldError === 'email' }">
                    <span class="icn">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                    </span>
                    <input id="otp-email" v-model="otpEmail" type="email" autocomplete="email"
                           :placeholder="t('auth.emailPlaceholder')" :disabled="loading"
                           @input="clearError" @keydown.enter.prevent="onSendOtp" autofocus />
                  </div>
                </div>

                <div v-if="error" class="err-banner">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 17h.01"/></svg>
                  {{ error }}
                </div>

                <button type="button" class="submit" :disabled="loading || !otpEmail" @click="onSendOtp">
                  <span v-if="loading" class="spin"></span>
                  <span class="lbl-btn">{{ loading ? t('auth.verifying') : t('auth.sendCode') }}</span>
                  <svg v-if="!loading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>

                <p class="help">{{ t('auth.helpdesk') }}</p>
                <button type="button" class="switch-link" @click="toggleMode">{{ t('auth.switchToPassword') }}</button>
              </template>

              <!-- Step: 6-digit code -->
              <template v-else>
                <h2 class="head">{{ t('auth.enterCode') }}</h2>
                <p class="head-sub">{{ t('auth.codeSentTo', { email: otpEmail }) }}</p>

                <div class="otp-boxes" :class="{ invalid: fieldError === 'code' }">
                  <input v-for="i in 6" :key="i"
                         :ref="el => otpRefs[i - 1] = el"
                         class="otp-box"
                         inputmode="numeric" autocomplete="one-time-code" maxlength="1"
                         :value="otpDigits[i - 1]" :disabled="loading"
                         @input="onDigitInput(i - 1, $event)"
                         @keydown="onDigitKey(i - 1, $event)"
                         @paste="onDigitPaste" />
                </div>

                <div v-if="error" class="err-banner">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 17h.01"/></svg>
                  {{ error }}
                </div>

                <button type="button" class="submit" :disabled="loading || otpCode.length !== 6" @click="verifyOtpCode">
                  <span v-if="loading" class="spin"></span>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4z"/></svg>
                  <span class="lbl-btn">{{ loading ? t('auth.verifying') : t('auth.signIn') }}</span>
                </button>

                <div class="otp-actions">
                  <button type="button" class="link-btn" @click="resetOtp">← {{ t('auth.changeEmail') }}</button>
                  <button type="button" class="link-btn muted" :disabled="resendIn > 0 || loading" @click="onSendOtp">
                    {{ resendIn > 0 ? t('auth.resendIn', { s: resendIn }) : t('auth.resendCode') }}
                  </button>
                </div>

                <p class="help">{{ t('auth.helpdesk') }}</p>
              </template>
            </div>

            <!-- ══════ PASSWORD ══════ -->
            <div v-else key="password" ref="paneEl" class="pane">
              <h2 class="head">{{ t('auth.signIn') }}</h2>
              <p class="head-sub">{{ t('auth.usePassword') }}</p>

              <div class="field">
                <label class="lbl" for="username">{{ t('auth.username') }}</label>
                <div class="inp-wrap" :class="{ invalid: fieldError === 'username' }">
                  <span class="icn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                  </span>
                  <input id="username" v-model="form.username" type="text" autocomplete="username"
                         placeholder="admin-suppabase" :disabled="loading" @input="clearError" />
                </div>
              </div>

              <div class="field">
                <label class="lbl" for="password">{{ t('auth.password') }}</label>
                <div class="inp-wrap" :class="{ invalid: fieldError === 'password' }">
                  <span class="icn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg>
                  </span>
                  <input id="password" v-model="form.password" type="password" autocomplete="current-password"
                         placeholder="••••••••" :disabled="loading"
                         @input="clearError" @keydown="detectCaps" @keyup="detectCaps" @blur="capsOn = false"
                         @keydown.enter.prevent="handleLogin" />
                </div>
                <div v-if="capsOn" class="caps-hint">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  Caps Lock is on
                </div>
              </div>

              <label class="remember">
                <input type="checkbox" v-model="rememberMe" class="remember-chk" />
                <span class="remember-box" :class="{ checked: rememberMe }">
                  <svg v-if="rememberMe" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                </span>
                <span class="remember-lbl">{{ t('auth.rememberMe') }}</span>
              </label>

              <div v-if="error" class="err-banner">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 17h.01"/></svg>
                {{ error }}
              </div>

              <button type="button" class="submit" :disabled="loading || !form.username || !form.password" @click="handleLogin">
                <span v-if="loading" class="spin"></span>
                <span class="lbl-btn">{{ loading ? 'Signing in…' : t('auth.signIn') }}</span>
                <svg v-if="!loading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>

              <button type="button" class="guest-link" @click="useGuest">{{ t('auth.useGuest') }}</button>
              <button type="button" class="switch-link" @click="toggleMode">{{ t('auth.switchToOtp') }}</button>
            </div>

          </Transition>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const auth = useAuthStore()
const { t, tError } = useI18n()
const year = new Date().getFullYear()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const loaderVisible = ref(false)
const error = ref('')
const fieldError = ref('')
const capsOn = ref(false)
const rememberMe = ref(false)

// ── Mode + OTP state ─────────────────────────────────────────
const mode = ref('otp')             // 'otp' default per design | 'password'
const otpStep = ref('email')        // 'email' | 'code'
const otpEmail = ref('')
const otpDigits = ref(['', '', '', '', '', ''])
const otpRefs = ref([])
const otpCode = computed(() => otpDigits.value.join(''))
const resendIn = ref(0)
let resendTimer = null

// ── Smooth height transition (no flash) ──────────────────────
const paneEl = ref(null)
const stageHeight = ref('auto')
function measure() {
  nextTick(() => {
    const el = paneEl.value
    if (el) stageHeight.value = el.offsetHeight + 'px'
  })
}
onMounted(() => measure())

function toggleMode() {
  mode.value = mode.value === 'password' ? 'otp' : 'password'
  clearError()
  otpStep.value = 'email'
  otpDigits.value = ['', '', '', '', '', '']
  stopResendCountdown()
}

function startResendCountdown() {
  stopResendCountdown()
  resendIn.value = 60
  resendTimer = setInterval(() => {
    resendIn.value -= 1
    if (resendIn.value <= 0) stopResendCountdown()
  }, 1000)
}
function stopResendCountdown() {
  if (resendTimer) { clearInterval(resendTimer); resendTimer = null }
  resendIn.value = 0
}
onBeforeUnmount(stopResendCountdown)

function resetOtp() {
  clearError()
  otpStep.value = 'email'
  otpDigits.value = ['', '', '', '', '', '']
  stopResendCountdown()
  measure()
}

onMounted(() => {
  const saved = localStorage.getItem('nocturne_remember')
  if (saved) { form.username = saved; rememberMe.value = true }
})

function clearError() { error.value = ''; fieldError.value = '' }

function useGuest() {
  clearError()
  form.username = 'guest-suppabase'
  form.password = 'guest@2026'
  handleLogin()
}

function detectCaps(e) { capsOn.value = e.getModifierState?.('CapsLock') ?? false }

async function handleLogin() {
  clearError()
  if (!form.username.trim()) { fieldError.value = 'username'; error.value = t('auth.username') + ' ' + t('common.no').toLowerCase(); return }
  if (!form.password) { fieldError.value = 'password'; error.value = t('auth.password') + ' ' + t('common.no').toLowerCase(); return }
  loading.value = true
  try {
    await auth.login(form.username.trim(), form.password)
    if (rememberMe.value) localStorage.setItem('nocturne_remember', form.username.trim())
    else localStorage.removeItem('nocturne_remember')
    await finishLogin()
  } catch (err) {
    loaderVisible.value = false
    error.value = tError(err, t('errors.ERR_INVALID_CREDENTIALS'))
  } finally {
    loading.value = false
  }
}

async function finishLogin() {
  await Promise.all([auth.fetchPermissions(), auth.fetchModules(), auth.fetchRoles()])
  loaderVisible.value = true
  useToast().show(t('auth.signedIn'), 'success')
  await new Promise(r => setTimeout(r, 800))
  navigateTo('/c')
}

// ── Email OTP actions ────────────────────────────────────────
async function onSendOtp() {
  clearError()
  const email = otpEmail.value.trim()
  if (!email) { fieldError.value = 'email'; error.value = t('auth.email') + ' ' + t('common.no').toLowerCase(); return }
  loading.value = true
  try {
    await auth.requestOtp(email)
    otpStep.value = 'code'
    otpDigits.value = ['', '', '', '', '', '']
    startResendCountdown()
    useToast().show(t('auth.otpSentNote', { email }), 'info', 4000)
    nextTick(() => { measure(); otpRefs.value[0]?.focus() })
  } catch (err) {
    error.value = tError(err, t('errors.ERR_VALIDATION'))
  } finally {
    loading.value = false
  }
}

// 6-box input handlers
function onDigitInput(i, e) {
  const v = e.target.value.replace(/\D/g, '')
  clearError()
  if (!v) { otpDigits.value[i] = ''; return }
  // take last char typed; if user pasted multiple, distribute
  const chars = v.split('')
  otpDigits.value[i] = chars[0]
  let j = i
  for (let k = 1; k < chars.length && j + 1 < 6; k++) { j++; otpDigits.value[j] = chars[k] }
  const next = Math.min(j + 1, 5)
  nextTick(() => otpRefs.value[next]?.focus())
  if (otpCode.value.length === 6) verifyOtpCode()
}
function onDigitKey(i, e) {
  if (e.key === 'Backspace' && !otpDigits.value[i] && i > 0) {
    otpDigits.value[i - 1] = ''
    nextTick(() => otpRefs.value[i - 1]?.focus())
  } else if (e.key === 'ArrowLeft' && i > 0) {
    otpRefs.value[i - 1]?.focus()
  } else if (e.key === 'ArrowRight' && i < 5) {
    otpRefs.value[i + 1]?.focus()
  }
}
function onDigitPaste(e) {
  e.preventDefault()
  const txt = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6)
  if (!txt) return
  const arr = ['', '', '', '', '', '']
  for (let k = 0; k < txt.length; k++) arr[k] = txt[k]
  otpDigits.value = arr
  clearError()
  nextTick(() => otpRefs.value[Math.min(txt.length, 5)]?.focus())
  if (txt.length === 6) verifyOtpCode()
}

async function verifyOtpCode() {
  if (loading.value || otpCode.value.length !== 6) return
  loading.value = true
  try {
    await auth.loginWithOtp(otpEmail.value.trim(), otpCode.value)
    await finishLogin()
  } catch (err) {
    loaderVisible.value = false
    error.value = tError(err, t('errors.ERR_OTP_INVALID'))
    otpDigits.value = ['', '', '', '', '', '']
    fieldError.value = 'code'
    nextTick(() => otpRefs.value[0]?.focus())
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  color: var(--fg);
  font-family: var(--font-sans);
  position: relative;
  overflow: hidden;
}
.grain {
  position: fixed; inset: 0; pointer-events: none; z-index: 1000;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.5; mix-blend-mode: overlay;
}

/* ── Left: blue hero ───────────────────────────── */
.art-side {
  position: relative;
  background: linear-gradient(135deg, #3b6df0 0%, #2f55d8 55%, #2545c0 100%);
  padding: 48px 56px;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.art-inner { position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; }
.brand-row { display: flex; align-items: center; gap: 11px; }
.brand-logo {
  width: 40px; height: 40px; border-radius: 11px;
  background: rgba(255,255,255,0.16);
  display: grid; place-items: center; color: #fff;
}
.brand-name { font-size: 20px; font-weight: 700; color: #fff; }

.art-title {
  font-family: var(--font-serif);
  font-size: 56px; font-weight: 700; line-height: 1.05;
  color: #fff; margin: auto 0 0; letter-spacing: -0.01em;
  white-space: pre-line;
}
.art-sub {
  color: rgba(255,255,255,0.82);
  font-size: 16px; line-height: 1.6; margin: 24px 0 0; max-width: 420px;
}
.art-foot {
  margin-top: auto; padding-top: 40px;
  color: rgba(255,255,255,0.6); font-size: 12.5px;
}

/* ── Right: auth ───────────────────────────────── */
.form-side {
  display: grid; place-items: center;
  background:
    radial-gradient(70% 50% at 100% 0%, color-mix(in oklab, #ff8fb1 14%, transparent), transparent 70%),
    radial-gradient(60% 50% at 0% 100%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 70%),
    var(--bg-elev);
  padding: 40px;
}
.form-wrap { width: 100%; max-width: 380px; }
.pane-stage { position: relative; transition: height .28s cubic-bezier(.4,0,.2,1); }
.pane { display: flex; flex-direction: column; }

/* Cross-fade between panes (out-in → no overlap, no flash) */
.pane-enter-active { transition: opacity .2s ease, transform .2s ease; }
.pane-leave-active { transition: opacity .14s ease, transform .14s ease; }
.pane-enter-from { opacity: 0; transform: translateY(8px); }
.pane-leave-to   { opacity: 0; transform: translateY(-8px); }

.head { font-family: var(--font-serif); font-size: 30px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.01em; }
.head-sub { color: var(--fg-mute); font-size: 14px; margin: 0 0 28px; }

.field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
.lbl { font-size: 12px; font-weight: 700; color: var(--fg-dim); }

.inp-wrap {
  display: flex; align-items: center;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(12px) saturate(160%); backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid var(--line-2);
  border-radius: 999px; height: 50px;
  transition: border-color .15s, box-shadow .2s;
}
.inp-wrap:focus-within {
  border-color: color-mix(in oklab, var(--accent) 50%, transparent);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 14%, transparent);
}
.inp-wrap.invalid { border-color: color-mix(in oklab, var(--danger) 60%, transparent); }
.icn { width: 44px; display: grid; place-items: center; color: var(--fg-mute); flex-shrink: 0; }
.inp-wrap input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: var(--fg); font-size: 14px; font-family: inherit; padding: 0 16px 0 0; }
.inp-wrap input::placeholder { color: var(--fg-faint); }

.caps-hint { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 10.5px; color: var(--warn); margin-top: 7px; }

/* 6-box OTP */
.otp-boxes { display: flex; gap: 12px; justify-content: space-between; margin: 4px 0 8px; }
.otp-box {
  flex: 1; aspect-ratio: 1 / 1; min-width: 0; max-width: 64px;
  text-align: center;
  background: var(--glass-bg);
  border: 1.5px solid var(--line-2);
  border-radius: 14px;
  color: var(--fg);
  font-family: var(--font-mono); font-size: 26px; font-weight: 600;
  outline: none;
  transition: border-color .15s, box-shadow .2s, background .15s;
}
.otp-box:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 16%, transparent);
}
.otp-boxes.invalid .otp-box { border-color: color-mix(in oklab, var(--danger) 55%, transparent); }

.err-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; margin-bottom: 14px;
  background: color-mix(in oklab, var(--danger) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--danger) 30%, transparent);
  border-radius: 10px; color: var(--danger); font-size: 12.5px;
  animation: shake .3s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes shake { 10%,90%{transform:translateX(-2px)} 20%,80%{transform:translateX(3px)} 30%,50%,70%{transform:translateX(-3px)} 40%,60%{transform:translateX(3px)} }

.remember { display: inline-flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; margin-bottom: 18px; }
.remember-chk { display: none; }
.remember-box { width: 16px; height: 16px; border-radius: 5px; border: 1px solid var(--line-2); background: var(--bg-elev); display: grid; place-items: center; color: var(--accent-fg); transition: background .13s, border-color .13s; }
.remember-box.checked { background: var(--accent); border-color: var(--accent); }
.remember-lbl { font-size: 12.5px; color: var(--fg-mute); }

.submit {
  appearance: none; border: 0;
  width: 100%; height: 50px; border-radius: 999px; margin-top: 6px;
  background: var(--accent); color: var(--accent-fg);
  font-weight: 700; font-size: 15px; font-family: inherit;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; box-shadow: var(--shadow-pill);
  transition: filter .15s, transform .12s var(--spring), opacity .15s;
}
.submit:hover:not(:disabled) { filter: brightness(1.05); }
.submit:active:not(:disabled) { transform: translateY(1px); }
.submit:disabled { opacity: 0.55; cursor: not-allowed; }
.spin { width: 15px; height: 15px; border-radius: 50%; border: 2px solid color-mix(in oklab, var(--accent-fg) 30%, transparent); border-top-color: var(--accent-fg); animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.help { text-align: center; color: var(--fg-mute); font-size: 12.5px; margin: 18px 0 0; }

.otp-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
.link-btn { appearance: none; background: transparent; border: 0; color: var(--accent); font-family: inherit; font-size: 13px; cursor: pointer; padding: 4px 0; }
.link-btn:hover:not(:disabled) { text-decoration: underline; }
.link-btn.muted { color: var(--fg-mute); }
.link-btn:disabled { color: var(--fg-faint); cursor: default; }

.guest-link, .switch-link {
  appearance: none; background: transparent; border: 0;
  width: 100%; text-align: center; cursor: pointer;
  font-family: inherit; font-size: 13px; padding: 6px 0;
}
.guest-link { color: var(--fg-mute); margin-top: 16px; }
.guest-link:hover { color: var(--fg); }
.switch-link { color: var(--accent); margin-top: 4px; font-weight: 500; }
.switch-link:hover { text-decoration: underline; }

/* ── Responsive ───────────────────────────────── */
@media (max-width: 920px) {
  .shell { grid-template-columns: 1fr; }
  .art-side { display: none; }
  .form-side { min-height: 100vh; padding: 24px; }
}
@media (max-width: 480px) {
  .otp-boxes { gap: 8px; }
  .otp-box { border-radius: 11px; font-size: 22px; }
  .head { font-size: 26px; }
}
</style>
