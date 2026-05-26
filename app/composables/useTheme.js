// useTheme — manage theme (light/dark/system), density, and motion.
// Persisted via cookies so SSR + reload stay consistent without flash.

const SUPPORTED_THEMES   = ['system', 'light', 'dark']
const SUPPORTED_DENSITY  = ['comfortable', 'compact']
const SUPPORTED_MOTION   = ['system', 'reduced', 'full']

const theme    = ref('system')
const density  = ref('comfortable')
const motion   = ref('system')
let initialized = false

function systemDark() {
  if (typeof window === 'undefined') return true
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
}

function applyTheme(value) {
  if (typeof document === 'undefined') return
  const effective = value === 'system' ? (systemDark() ? 'dark' : 'light') : value
  document.documentElement.setAttribute('data-theme', effective)
}

function applyDensity(value) {
  if (typeof document === 'undefined') return
  if (value === 'compact') document.documentElement.setAttribute('data-density', 'compact')
  else document.documentElement.removeAttribute('data-density')
}

function applyMotion(value) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-motion', value)
}

function readCookie(name, fallback) {
  if (typeof document === 'undefined') return fallback
  const m = document.cookie.split('; ').find(c => c.startsWith(`${name}=`))
  return m ? decodeURIComponent(m.split('=')[1]) : fallback
}

function writeCookie(name, value) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

function ensureInitialized() {
  if (initialized || typeof window === 'undefined') return
  theme.value   = readCookie('sb_theme', 'system')
  density.value = readCookie('sb_density', 'comfortable')
  motion.value  = readCookie('sb_motion', 'system')
  if (!SUPPORTED_THEMES.includes(theme.value))    theme.value   = 'system'
  if (!SUPPORTED_DENSITY.includes(density.value)) density.value = 'comfortable'
  if (!SUPPORTED_MOTION.includes(motion.value))   motion.value  = 'system'

  applyTheme(theme.value)
  applyDensity(density.value)
  applyMotion(motion.value)

  // Respond to OS preference changes when theme/motion = 'system'
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)')
  mqDark.addEventListener?.('change', () => { if (theme.value === 'system') applyTheme('system') })

  initialized = true
}

export function useTheme() {
  ensureInitialized()

  function setTheme(v) {
    if (!SUPPORTED_THEMES.includes(v)) return
    theme.value = v
    writeCookie('sb_theme', v)
    applyTheme(v)
  }

  function setDensity(v) {
    if (!SUPPORTED_DENSITY.includes(v)) return
    density.value = v
    writeCookie('sb_density', v)
    applyDensity(v)
  }

  function setMotion(v) {
    if (!SUPPORTED_MOTION.includes(v)) return
    motion.value = v
    writeCookie('sb_motion', v)
    applyMotion(v)
  }

  return {
    theme, density, motion,
    setTheme, setDensity, setMotion,
    supportedThemes:  SUPPORTED_THEMES,
    supportedDensity: SUPPORTED_DENSITY,
    supportedMotion:  SUPPORTED_MOTION,
  }
}
