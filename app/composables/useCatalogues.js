/* ============================================================
   Catalogue library — flipbook pages.
   A catalogue's `realPages` is a mixed list, one entry per page:
     • string URL        → an image page (An Cường Publitas CDN, or any image)
     • { material: {...} } → a MATERIAL page: a self-built HTML grid of swatch
       cells, each with a (+) hotspot that opens the product detail popup.
     • { video: { src } } → a VIDEO that spans TWO pages (a full spread). It must
       start on an EVEN page (e.g. 2→3, 4→5) so it fills the left+right of one
       viewing spread. The head entry holds { video:{src} }; the very next entry
       is its tail { videoCont:true } (auto-managed — never edited directly). The
       video renders across the spine: even page = left half, odd page = right.

   material = {
     theme, sub?,                            // chapter label + sub-group
     cols?,                                  // grid columns 1..3 (default 3)
     items: [{
       code, name, new?, size?, edge?, finish?, desc?,
       images: [url, ...],                   // gallery: [0]=swatch, [1..]=application shots
       specs?: [[label, value], ...],        // custom key/value spec rows (optional)
       actions?: [{ label, href? }],         // custom popup action buttons
     }]
   }
   (Legacy item.swatch / item.rooms are normalised into item.images on read.)

   Only the COVER image is reliably scrapable from the CDN; other CDN page
   UUIDs load dynamically (signed). Missing image pages show a placeholder.

   catalogue = { id, title, subtitle, year, ratio, cover, realPages[], pageCount, chapters[] }
   ============================================================ */

import { ref } from 'vue'

/* Demo swatch image (deterministic wood texture) so material pages render
   before real swatch URLs are supplied. Replace with real swatch image URLs. */
function demoSwatch(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/400`
}

const DEFAULTS = [
  {
    id: 'laminate-kingdom',
    title: 'Laminate Kingdom',
    subtitle: 'Trend Collection',
    year: '2023 — 2025',
    ratio: 1320 / 1938,           // CDN page image ratio (portrait)
    cover: { bg: '#3a2c25', fg: '#f3eee5', titleLines: ['LAMINATE', 'KINGDOM'], sub: 'HIGH PRESSURE LAMINATE' },
    realPages: [
      // 1 — Cover (real CDN image)
      'https://view.publitas.com/90294/1685798/pages/058badd6-a24d-4542-ab87-e6161ffc7920-at1600.jpg',
      '',  // 2 — intro (placeholder; paste CDN URL later)
      '',  // 3
      '',  // 4
      // 5 — MATERIAL page: Woodgrains · Synchronized (grid of swatches + hotspots)
      { material: {
        theme: 'Woodgrains', sub: 'Synchronized', cols: 3,
        items: [
          { code: 'LK 3121 E', name: 'Mocha Mountain Pine', new: true, swatch: demoSwatch('lk3121'), size: '1220*2440*0.8mm', edge: 'PVC 461/LK3121' },
          { code: 'LK 3122 E', name: 'Tobacco Mountain Pine', new: true, swatch: demoSwatch('lk3122'), size: '1220*2440*0.8mm', edge: 'PVC 462/LK3122' },
          { code: 'LK 3123 E', name: 'Denim Mountain Pine', new: true, swatch: demoSwatch('lk3123'), size: '1220*2440*0.8mm', edge: 'PVC 463/LK3123' },
          { code: 'LK 2001 E', name: 'Light Elm', new: true, swatch: demoSwatch('lk2001'), size: '1220*2440*0.8mm', edge: 'PVC 401/LK2001' },
          { code: 'LK 2002 E', name: 'Golden Elm', new: true, swatch: demoSwatch('lk2002'), size: '1220*2440*0.8mm', edge: 'PVC 402/LK2002' },
          { code: 'LK 2003 E', name: 'Brown Elm', new: true, swatch: demoSwatch('lk2003'), size: '1220*2440*0.8mm', edge: 'PVC 403/LK2003' },
          { code: 'LK 2004 E', name: 'Snow Ash Wood', new: true, swatch: demoSwatch('lk2004'), size: '1220*2440*0.8mm', edge: 'PVC 404/LK2004' },
          { code: 'LK 2005 E', name: 'Twilight Ash Wood', new: true, swatch: demoSwatch('lk2005'), size: '1220*2440*0.8mm', edge: 'PVC 405/LK2005' },
          { code: 'LK 2006 E', name: 'Dark Grey Ash', new: true, swatch: demoSwatch('lk2006'), size: '1220*2440*0.8mm', edge: 'PVC 406/LK2006' },
        ],
      }},
      // 6 — MATERIAL page: continued (Crown Oak)
      { material: {
        theme: 'Woodgrains', sub: 'Crown Oak', cols: 3,
        items: [
          { code: 'LK 2007 E', name: 'White Crown Oak', new: true, swatch: demoSwatch('lk2007'), size: '1220*2440*0.8mm', edge: 'PVC 407/LK2007' },
          { code: 'LK 2008 E', name: 'Classic Crown Oak', new: true, swatch: demoSwatch('lk2008'), size: '1220*2440*0.8mm', edge: 'PVC 408/LK2008' },
          { code: 'LK 2009 E', name: 'Reddish Crown Oak', new: true, swatch: demoSwatch('lk2009'), size: '1220*2440*0.8mm', edge: 'PVC 409/LK2009' },
          { code: 'LK 2010 E', name: 'Brown Crown Oak', new: true, swatch: demoSwatch('lk2010'), size: '1220*2440*0.8mm', edge: 'PVC 410/LK2010' },
          { code: 'LK 2011 E', name: 'Black Crown Oak', new: true, swatch: demoSwatch('lk2011'), size: '1220*2440*0.8mm', edge: 'PVC 411/LK2011' },
          { code: 'LK 2012 E', name: 'Vague Oak', new: true, swatch: demoSwatch('lk2012'), size: '1230*2450*0.8mm', edge: 'PVC 468/LK4575' },
        ],
      }},
    ],
    pageCount: 12,
    chapters: [
      { label: 'Bìa', page: 1 },
      { label: 'Intro', page: 3 },
      { label: 'Woodgrains', page: 5 },
      { label: 'Stones', page: 9 },
    ],
  },
  {
    id: 'acrylic-panel',
    title: 'High Gloss Acrylic Panel',
    subtitle: 'Acrylic Panel',
    year: '2024',
    ratio: 1320 / 1938,
    cover: { bg: '#c9c1ac', fg: '#2a2820', titleLines: ['ACRYLIC', 'PANEL'], sub: 'HIGH GLOSS · CO-EXTRUDED' },
    realPages: [
      'https://view.publitas.com/90294/1683868/pages/be38e543-9884-4b5d-83ea-ec64898f7e2a-at1600.jpg',
    ],
    pageCount: 10,
    chapters: [
      { label: 'Bìa', page: 1 },
      { label: 'Glossy Solids', page: 3 },
      { label: 'Metallics', page: 7 },
    ],
  },
]

/* ============================================================
   Catalogue store — defaults merged with localStorage overrides.
   The whole catalogue list is persisted once edited; the flipbook page and
   the manage page both read/write through this shared reactive store so edits
   reflect live. (Demo persistence — localStorage only.)
   ============================================================ */
const STORAGE_KEY = 'catalogue_data_v1'

function deepClone(x) { return JSON.parse(JSON.stringify(x)) }

let _store = null
export function useCatalogueStore() {
  if (_store) return _store

  const list = ref(deepClone(DEFAULTS))

  function load() {
    if (typeof localStorage === 'undefined') return
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (Array.isArray(saved) && saved.length) list.value = saved
    } catch { /* ignore */ }
  }
  function persist() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value))
    } catch (e) {
      // QuotaExceeded — most likely from large base64 images.
      return e
    }
  }
  load()

  const catalogues = () => list.value
  const get = (id) => list.value.find(c => c.id === id) || list.value[0]
  const index = (id) => list.value.findIndex(c => c.id === id)

  /* Replace a catalogue's data wholesale (used by the manage page form). */
  function save(id, data) {
    const i = index(id)
    if (i >= 0) list.value[i] = deepClone(data)
    else list.value.push(deepClone(data))
    return persist()
  }
  function resetCatalogue(id) {
    const def = DEFAULTS.find(c => c.id === id)
    const i = index(id)
    if (def && i >= 0) list.value[i] = deepClone(def)
    persist()
  }
  function resetAll() {
    list.value = deepClone(DEFAULTS)
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  }

  /* ── Page-level operations (operate on catalogue.realPages) ── */
  function blankImagePage() { return '' }
  function blankMaterialPage() {
    return { material: { theme: 'Chủ đề mới', sub: '', items: [] } }
  }
  function addPage(id, kind = 'image', at = -1) {
    const c = get(id)
    const page = kind === 'material' ? blankMaterialPage() : blankImagePage()
    if (at < 0 || at >= c.realPages.length) c.realPages.push(page)
    else c.realPages.splice(at, 0, page)
    if (c.pageCount != null) c.pageCount = Math.max(c.pageCount, c.realPages.length)
    persist()
  }
  /* Insert a two-page video so its FIRST page is even (2,4,6…).
     Page number = index+1, so an even start page means an ODD insert index.
     We insert the head at the requested even page, padding with a blank image
     beforehand if the slot would land on an odd page. Returns the head index. */
  function addVideoSpread(id, src = '') {
    const c = get(id)
    let at = c.realPages.length
    // Head must sit at an odd index (= even page number). If the append point
    // is at an even index (odd page), push a blank filler page first so the
    // video starts on the next (even) page.
    if (at % 2 === 0) { c.realPages.push(blankImagePage()); at = c.realPages.length }
    c.realPages.push({ video: { src } }, { videoCont: true })
    if (c.pageCount != null) c.pageCount = Math.max(c.pageCount, c.realPages.length)
    persist()
    return at
  }
  /* Is realPages[idx] part of a video pair? Returns 'head' | 'tail' | null. */
  function videoRole(id, idx) {
    const p = get(id).realPages[idx]
    if (p && typeof p === 'object' && p.video) return 'head'
    if (p && typeof p === 'object' && p.videoCont) return 'tail'
    return null
  }
  function removePage(id, idx) {
    const c = get(id)
    // Removing either half of a video removes BOTH halves so we never leave an
    // orphan head/tail.
    const role = videoRole(id, idx)
    if (role === 'head') c.realPages.splice(idx, 2)
    else if (role === 'tail') c.realPages.splice(idx - 1, 2)
    else c.realPages.splice(idx, 1)
    persist()
  }
  function duplicatePage(id, idx) {
    const c = get(id)
    const role = videoRole(id, idx)
    if (role) {
      // Duplicate the whole video pair as a new pair (kept on an even page by
      // appending — caller's index parity is preserved since pairs are even).
      const head = role === 'head' ? c.realPages[idx] : c.realPages[idx - 1]
      addVideoSpread(id, head.video?.src || '')
      return
    }
    c.realPages.splice(idx + 1, 0, deepClone(c.realPages[idx]))
    if (c.pageCount != null) c.pageCount = Math.max(c.pageCount, c.realPages.length)
    persist()
  }
  function movePage(id, from, to) {
    const c = get(id)
    if (to < 0 || to >= c.realPages.length || from === to) return
    const [p] = c.realPages.splice(from, 1)
    c.realPages.splice(to, 0, p)
    persist()
  }
  function updatePage(id, idx, value) {
    const c = get(id)
    c.realPages[idx] = value
    persist()
  }

  /* ── Export / Import JSON ── */
  function exportJson() { return JSON.stringify(list.value, null, 2) }
  function importJson(text) {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) throw new Error('JSON phải là một mảng catalogue')
    list.value = parsed
    persist()
  }

  _store = {
    list, catalogues, get, save, resetCatalogue, resetAll,
    addPage, addVideoSpread, videoRole, removePage, duplicatePage, movePage, updatePage,
    exportJson, importJson, persist, DEFAULTS,
  }
  return _store
}

/* Back-compat: a getter list + getCatalogue read through the store. */
export const CATALOGUES = DEFAULTS
export function getCatalogue(id) {
  return useCatalogueStore().get(id)
}

/* Default action buttons shown in the material popup when an item has none. */
export const DEFAULT_ACTIONS = [
  { label: 'Tải Fullsheet', href: '' },
  { label: 'Yêu cầu mẫu / Báo giá', href: '' },
  { label: 'Xem mẫu gỗ trong nhà bạn', href: '' },
]
export const MAX_GRID_ITEMS = 9

/* Normalise a material item to the gallery shape for rendering:
   { code, name, new, size, edge, finish, desc, images[], specs[], actions[] }.
   Accepts legacy items (swatch + rooms[]). */
export function normalizeItem(it) {
  const images = Array.isArray(it.images) && it.images.length
    ? it.images.filter(Boolean)
    : [it.swatch, ...(it.rooms || [])].filter(Boolean)
  const specs = Array.isArray(it.specs) && it.specs.length
    ? it.specs
    : [
        ...(it.size ? [['Kích thước', it.size]] : []),
        ...(it.edge ? [['Chỉ dán cạnh đồng màu', it.edge]] : []),
        ...(it.finish ? [['Bề mặt', it.finish]] : []),
      ]
  const actions = Array.isArray(it.actions) && it.actions.length ? it.actions : DEFAULT_ACTIONS
  return {
    code: it.code || '', name: it.name || '', new: !!it.new, desc: it.desc || '',
    size: it.size || '', edge: it.edge || '', finish: it.finish || '',
    images, specs, actions,
    swatch: images[0] || '',
  }
}

/* Returns the flat leaf list for the flipbook. A blank leads so the cover sits
   on the RIGHT of the opening view (like a real book / the An Cường viewer),
   and the list is padded with a trailing blank to an even length so the final
   sheet never shows two blank faces.
   leaf = { num, kind:'image'|'material', src?, material?, placeholder? } | null */
export function buildPages(c) {
  const n = Math.max(c.realPages.length, c.pageCount || c.realPages.length)
  const leaves = [null]                                   // inside front cover
  for (let i = 0; i < n; i++) {
    const entry = c.realPages[i]
    if (entry && typeof entry === 'object' && entry.material) {
      leaves.push({ num: i + 1, kind: 'material', material: entry.material })
    } else if (entry && typeof entry === 'object' && entry.video) {
      // Head of a two-page video → the EVEN (left) half of the spread.
      leaves.push({ num: i + 1, kind: 'video', video: entry.video, videoSide: 'left' })
    } else if (entry && typeof entry === 'object' && entry.videoCont) {
      // Tail of a two-page video → the ODD (right) half. Carry the head's src
      // so the right leaf can render the same clip, shifted to its half.
      const head = c.realPages[i - 1]
      const video = (head && head.video) ? head.video : { src: '' }
      leaves.push({ num: i + 1, kind: 'video', video, videoSide: 'right' })
    } else {
      const src = (typeof entry === 'string' ? entry : '') || ''
      leaves.push({ num: i + 1, kind: 'image', src, placeholder: !src })
    }
  }
  if (leaves.length % 2 !== 0) leaves.push(null)          // inside back cover
  return leaves
}
