// CSP for the FE shell.
//
// Dev vs prod tradeoff: Nuxt + Vite inject several inline bootstrap scripts
// in dev (Vite client, HMR runtime, payload extractors) whose contents
// change per build, so pinning them by sha256 is impractical and the
// observed failure mode is "Cannot create proxy with a non-object as target
// or handler" — the Nuxt runtime config fails to hydrate when one of those
// scripts is CSP-blocked. So in dev we accept 'unsafe-inline' for scripts.
// In prod we keep the strict hash for the one inline script we ship
// (the pre-paint theme bootstrap in app.head below).
//
// Update CSP_INLINE_SCRIPT_SHA whenever that snippet changes:
//   node -e "console.log(require('crypto').createHash('sha256').update(SCRIPT).digest('base64'))"
const CSP_INLINE_SCRIPT_SHA = "'sha256-HoTJF1J4OyTog2k+rGda0JYK4pxHsEmIOCzFqpJeS/k='"
const API_BASE = process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3045'
const IS_DEV = process.env.NODE_ENV !== 'production'

const scriptSrc = IS_DEV
  ? `'self' 'unsafe-inline' 'unsafe-eval'`              // Vite HMR needs both
  : `'self' ${CSP_INLINE_SCRIPT_SHA}`

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src ${scriptSrc}`,
  // Tailwind / Nuxt inject <style> tags at runtime; Google Fonts stylesheet too.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images from self, data: (markdown inline), and R2 public + uploads on BE.
  "img-src 'self' data: blob: https:",
  // XHR/SSE to BE API. ws/wss kept in dev for Vite HMR; harmless in prod
  // (no server is listening on those schemes unless we add one).
  `connect-src 'self' ${API_BASE} ws: wss:`,
  "worker-src 'self' blob:",
  "media-src 'self'",
].join('; ')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  ssr: false,
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'Content-Security-Policy': cspDirectives,
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-Frame-Options': 'DENY',
        },
      },
    },
  },
  // Auto-import components from sub-folders without folder-name prefix.
  // So <ModulesEditor> resolves to components/permissions/ModulesEditor.vue
  // (instead of requiring <PermissionsModulesEditor>).
  components: [{ path: '~/components', pathPrefix: false }],
  vite: {
    server: {
      hmr: { overlay: false },
    },
    define: {
      // Show detailed hydration mismatch info in dev (no-op in production build)
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
    },
    // Pre-bundle these so adding/removing them doesn't trigger a full reload
    // in dev. Vite was logging an "ℹ Vite discovered new dependencies at
    // runtime" hint until we listed them here.
    optimizeDeps: {
      include: [
        'dompurify',
        'highlight.js',
        'highlight.js/lib/common',
        'marked',
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3045',
    },
  },
  app: {
    head: {
      title: 'Suppabase',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      script: [
        {
          // Apply theme/density/motion before paint so there's no flash.
          innerHTML: `
(function(){
  try {
    function ck(n){var m=document.cookie.split('; ').find(function(c){return c.indexOf(n+'=')===0});return m?decodeURIComponent(m.split('=')[1]):null}
    var t=ck('sb_theme')||'system';
    var d=ck('sb_density')||'comfortable';
    var m=ck('sb_motion')||'system';
    var dark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
    var eff=t==='system'?(dark?'dark':'light'):t;
    document.documentElement.setAttribute('data-theme', eff);
    if(d==='compact') document.documentElement.setAttribute('data-density','compact');
    document.documentElement.setAttribute('data-motion', m);
  } catch(e){}
})();
          `,
          type: 'text/javascript',
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif&display=swap',
        },
      ],
    },
  },
})
