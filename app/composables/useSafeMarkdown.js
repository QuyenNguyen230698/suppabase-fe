// Safe-markdown helper.
// marked@18 deprecated its built-in sanitize option, so any HTML coming out of
// it has to be passed through DOMPurify before going into v-html. DOMPurify
// needs a DOM (window) so on SSR we fall back to a plain text escape — the
// real render happens after hydration anyway.

import DOMPurify from 'dompurify'

const PURIFY_CONFIG = {
  // Allow the tags marked emits (and our custom ai-h<n> + caret span).
  // No <script>, no <iframe>, no <object>, no event handlers, no inline styles.
  USE_PROFILES: { html: true },
  // Block all event handler attributes (onclick, onerror, onload, ...).
  // DOMPurify strips these by default; we set FORBID_ATTR explicitly so
  // tightening the policy later is just one place.
  FORBID_ATTR: ['style', 'srcset', 'formaction'],
  FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'],
  ALLOW_DATA_ATTR: false,
  // Make every link open safely.
  ADD_ATTR: ['target', 'rel'],
  // Reject any URL that isn't http(s)/mailto — blocks javascript: and data: URIs.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
}

let purifier = null

function getPurifier() {
  if (purifier) return purifier
  if (typeof window === 'undefined') return null
  purifier = DOMPurify(window)
  // Force all anchors to open in a new tab without referrer leakage.
  purifier.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer nofollow')
    }
  })
  return purifier
}

function plainEscape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Sanitize an HTML string. On SSR (no window) returns an escaped fallback so
// the page still renders something readable until hydration.
export function sanitizeHtml(html) {
  if (!html) return ''
  const p = getPurifier()
  if (!p) return plainEscape(html)
  return p.sanitize(html, PURIFY_CONFIG)
}

// Sanitize the *inner* markup of a <svg> element. Admins paste raw SVG paths
// into the module-icon field, which is stored in DB and rendered via v-html
// for every user — a malicious admin (or a tampered DB row) could otherwise
// inject <script> or event handlers via the icon field. We strip everything
// except a tight allowlist of shape primitives + harmless attributes.
const SVG_INNER_CONFIG = {
  // Treat the content as an SVG fragment, not full HTML.
  USE_PROFILES: { svg: true, svgFilters: false },
  // Only allow geometric primitives — no <script>, <foreignObject>, <use>,
  // <a>, <image>, etc.
  ALLOWED_TAGS: [
    'svg',
    'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse',
    'g', 'title', 'desc',
  ],
  ALLOWED_ATTR: [
    'xmlns', 'viewBox', 'viewbox',
    'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'width', 'height', 'points', 'fill', 'stroke', 'stroke-width',
    'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'transform',
    'opacity', 'fill-rule', 'clip-rule', 'vector-effect',
  ],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: false,
}

export function sanitizeSvgInner(svg) {
  if (!svg) return ''
  const p = getPurifier()
  if (!p) return '' // SSR fallback — no icon until hydrate
  // DOMPurify's svg profile expects a rooted <svg>; sanitizing orphan
  // children (e.g. "<path d=...>") returns ''. Wrap, sanitize, then strip
  // the wrapper so callers still get inner-only markup.
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${String(svg)}</svg>`
  const clean = p.sanitize(wrapped, SVG_INNER_CONFIG)
  const m = String(clean).match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  return m ? m[1] : ''
}

/* Sanitize a full <svg>…</svg> string and return the same string ready
   for v-html on a wrapper element (e.g. <span v-html="…">). */
export function sanitizeSvg(svg) {
  if (!svg) return ''
  const p = getPurifier()
  if (!p) return ''
  return p.sanitize(String(svg), SVG_INNER_CONFIG)
}
