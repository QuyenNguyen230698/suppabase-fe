// Minimal i18n composable — no extra deps.
// Locale state is shared (module-scoped ref). Persisted via cookie 'sb_lang'.
// Translation files are dynamically imported and cached after first load.

import enMessages from '../i18n/en.json'
import viMessages from '../i18n/vi.json'

const SUPPORTED = ['en', 'vi']
const DEFAULT = 'en'

const dicts = { en: enMessages, vi: viMessages }
const locale = ref(DEFAULT)
let initialized = false

function detectInitial() {
  if (typeof window === 'undefined') return DEFAULT
  // 1. cookie
  const cookie = document.cookie.split('; ').find(c => c.startsWith('sb_lang='))
  if (cookie) {
    const v = cookie.split('=')[1]
    if (SUPPORTED.includes(v)) return v
  }
  // 2. user store (if logged in)
  // (resolved after login by setLocale)
  // 3. navigator
  const nav = (navigator.language || '').toLowerCase()
  if (nav.startsWith('vi')) return 'vi'
  return DEFAULT
}

function getNested(obj, path) {
  return path.split('.').reduce((acc, k) => (acc != null ? acc[k] : undefined), obj)
}

function interpolate(str, vars) {
  if (!str || typeof str !== 'string' || !vars) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))
}

export function useI18n() {
  if (!initialized && typeof window !== 'undefined') {
    locale.value = detectInitial()
    initialized = true
  }

  function setLocale(next) {
    if (!SUPPORTED.includes(next)) return
    locale.value = next
    if (typeof document !== 'undefined') {
      document.cookie = `sb_lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
      document.documentElement.setAttribute('lang', next)
    }
  }

  /**
   * t('chat.send')                       → "Send"
   * t('errors.ERR_ACCOUNT_LOCKED', { detail: '15:30' })
   * t('foo.bar', null, 'Fallback')       → "Fallback" when missing
   */
  function t(key, vars, fallback) {
    const dict = dicts[locale.value] || dicts[DEFAULT]
    let val = getNested(dict, key)
    if (val == null && locale.value !== DEFAULT) {
      val = getNested(dicts[DEFAULT], key)
    }
    if (val == null) return fallback ?? key
    return interpolate(val, vars)
  }

  /** Translate a BE error response { code, error, detail? }. */
  function tError(err, fallback = 'Something went wrong') {
    const code = err?.data?.code || err?.code
    const detail = err?.data?.detail || err?.detail
    if (code) return t(`errors.${code}`, { detail }, err?.data?.error || err?.message || fallback)
    return err?.data?.error || err?.message || fallback
  }

  const supported = SUPPORTED
  return { locale, setLocale, t, tError, supported }
}
