<script setup>
/* ============================================================
   Catalogue — image-CDN flipbook
   A CSS-3D flipbook where each page is a single image (An Cường's
   Publitas CDN where available, placeholder otherwise). Keeps the
   stacked-sheets page-turn, a slim toolbar, "Xem nhanh" chapter tabs,
   a related-publications drawer, and a page zoom-view popup.

   Runs inside the default app layout (FE sidebar + header).
   ============================================================ */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useCatalogueStore, buildPages, normalizeItem } from '~/composables/useCatalogues'

/* ── Active catalogue ── */
const store = useCatalogueStore()
const catalogueList = computed(() => store.catalogues())
const activeId = ref(catalogueList.value[0].id)
const cat = computed(() => store.get(activeId.value))
const pages = computed(() => buildPages(cat.value))
const totalPages = computed(() => pages.value.length)

/* Book aspect = two portrait pages side by side. */
const bookAspect = computed(() => (cat.value.ratio || 0.68) * 2)

useHead(() => ({ title: `${cat.value.title} — Catalogue` }))

/* ── UI state ── */
const zoom = ref(1)
const thumbsOpen = ref(false)
const tabsOpen = ref(true)
const drawerOpen = ref(false)
function zoomIn() { zoom.value = Math.min(1.8, +(zoom.value + 0.1).toFixed(2)) }
function zoomOut() { zoom.value = Math.max(0.6, +(zoom.value - 0.1).toFixed(2)) }

/* ── Book model: stacked sheets ──
   pages[0] (cover) is the fixed left base; each sheet = two pages
   (front = right side, back = left side after flipping). turned = sheets
   flipped to the left. */
const sheets = computed(() => {
  const list = []
  const p = pages.value
  for (let i = 1; i < p.length; i += 2) list.push({ front: p[i] || null, back: p[i + 1] || null })
  return list
})

const turned = ref(0)
const FLIP_MS = 700
const animating = ref(-1)
let animTimer = null

const spread = computed(() => turned.value)
/* Each spread view = (leaf 2t, leaf 2t+1). With L leaves there are ceil(L/2)
   views; the last sheet's flip would reveal the padded blank, so cap turning
   one short of the sheet count to avoid an all-blank spread. */
const totalSpreads = computed(() => Math.ceil(pages.value.length / 2))
const maxTurn = computed(() => Math.max(0, totalSpreads.value - 1))
const canPrev = computed(() => turned.value > 0 && animating.value === -1)
const canNext = computed(() => turned.value < maxTurn.value && animating.value === -1)

function sheetZ(i) {
  if (i === animating.value) return sheets.value.length + 5
  return i < turned.value ? (i + 2) : (sheets.value.length - i + 1)
}
function startTurn(i) {
  animating.value = i
  clearTimeout(animTimer)
  animTimer = setTimeout(() => { animating.value = -1 }, FLIP_MS)
}
function next() { if (turned.value < maxTurn.value && animating.value === -1) { startTurn(turned.value); turned.value++ } }
function prev() { if (turned.value > 0 && animating.value === -1) { startTurn(turned.value - 1); turned.value-- } }
function goTo(i) { if (animating.value === -1) turned.value = Math.max(0, Math.min(maxTurn.value, i)) }
function pageAt(i) { return pages.value[i] || null }

/* ── Chapter tabs ("Xem nhanh") — from the catalogue config. Each chapter
   has a 1-based page; with the leading blank leaf, page P lives at leaf index
   P, shown on spread floor(P/2). ── */
const chapters = computed(() =>
  (cat.value.chapters || []).map(ch => ({ label: ch.label, spread: Math.floor(ch.page / 2) }))
)
/* Label of the chapter the current spread falls into (toolbar chip). */
const currentSection = computed(() => {
  const cur = turned.value
  let label = ''
  for (const ch of chapters.value) { if (ch.spread <= cur) label = ch.label }
  return label || (cat.value.chapters?.[0]?.label ?? 'Bìa')
})

/* ── Related-publications drawer ── */
function selectCatalogue(id) {
  if (id !== activeId.value) { activeId.value = id; turned.value = 0 }
  drawerOpen.value = false
}

/* ── Popups ──
   - selected: a real image page, opened large (click an image page)
   - material: a normalized material item, opened in the detail popup (click a +) */
const selected = ref(null)
const material = ref(null)      // normalized: { code, name, images[], specs[], actions[], ... }
function openPage(pg) { if (pg && pg.kind === 'image' && pg.src) selected.value = pg }
function openMaterial(item) { material.value = normalizeItem(item) }
function closePopup() { selected.value = null; material.value = null }

/* ── Share / fullscreen ── */
const shareToast = ref('')
function flashToast(m) { shareToast.value = m; setTimeout(() => { if (shareToast.value === m) shareToast.value = '' }, 2200) }
async function share() {
  const data = { title: cat.value.title, text: `${cat.value.title} — ${cat.value.subtitle}`, url: typeof location !== 'undefined' ? location.href : '' }
  try { if (navigator.share) { await navigator.share(data); return } await navigator.clipboard.writeText(data.url); flashToast('Đã sao chép liên kết') } catch { /* cancelled */ }
}
const isFullscreen = ref(false)
function toggleFullscreen() {
  if (typeof document === 'undefined') return
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  else document.exitFullscreen?.()
}
function onFsChange() { isFullscreen.value = !!document.fullscreenElement }

/* ── Keyboard ── */
function onKey(e) {
  if (e.key === 'Escape') {
    if (selected.value || material.value) { closePopup(); return }
    if (drawerOpen.value) { drawerOpen.value = false; return }
  }
  if (selected.value || material.value) return
  if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key.toLowerCase() === 't') thumbsOpen.value = !thumbsOpen.value
  else if (e.key.toLowerCase() === 'r') drawerOpen.value = !drawerOpen.value
  else if (e.key.toLowerCase() === 'f') toggleFullscreen()
  else if (e.key === '+' || e.key === '=') zoomIn()
  else if (e.key === '-' || e.key === '_') zoomOut()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.addEventListener('fullscreenchange', onFsChange)
})
onBeforeUnmount(() => {
  clearTimeout(animTimer)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', onFsChange)
})

watch(activeId, () => { turned.value = 0; closePopup() })
</script>

<template>
  <div class="cat-root">
    <!-- Slim toolbar -->
    <header class="cat-toolbar">
      <div class="ct-title">
        <h1>{{ cat.title }}</h1>
        <span class="ct-sub">{{ cat.subtitle }}</span>
        <span class="section-chip">{{ currentSection }}</span>
      </div>
      <div class="topbar-actions">
        <div class="pill"><span class="dot" /> {{ totalPages }} trang</div>
        <div class="tb-sep" />
        <button class="icon-btn" :data-active="drawerOpen" @click="drawerOpen = !drawerOpen" title="Ấn phẩm liên quan (R)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>
        </button>
        <button class="icon-btn" :data-active="thumbsOpen" @click="thumbsOpen = !thumbsOpen" title="Thu nhỏ trang (T)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></svg>
        </button>
        <button class="icon-btn" @click="share()" title="Chia sẻ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>
        </button>
        <NuxtLink class="icon-btn" to="/catalogue/manage" title="Quản lý dữ liệu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </NuxtLink>
        <button class="icon-btn" :data-active="isFullscreen" @click="toggleFullscreen" title="Toàn màn hình (F)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
        </button>
      </div>
    </header>

    <!-- Chapter tabs -->
    <nav class="chapter-tabs">
      <button class="tabs-toggle" @click="tabsOpen = !tabsOpen" :title="tabsOpen ? 'Thu gọn' : 'Xem nhanh'">
        <span>Xem nhanh</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: tabsOpen ? 'rotate(90deg)' : 'none' }"><path d="m9 18 6-6-6-6"/></svg>
      </button>
      <transition name="tabs-reveal">
        <div v-show="tabsOpen" class="tabs-list">
          <button
            v-for="ch in chapters"
            :key="ch.label"
            class="chapter-tab"
            :data-active="ch.label === currentSection"
            @click="goTo(ch.spread)"
          >{{ ch.label }}</button>
        </div>
      </transition>
    </nav>

    <!-- Stage -->
    <section class="stage">
      <div class="stage-canvas" :style="{ '--book-aspect': bookAspect }">
        <button class="nav-arrow prev" :disabled="!canPrev" @click="prev" aria-label="Trang trước">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button class="nav-arrow next" :disabled="!canNext" @click="next" aria-label="Trang sau">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        <div class="book" :style="{ '--flip-ms': FLIP_MS + 'ms', '--zoom': zoom }">
          <div class="book-paper" />
          <div class="leaf-base" @click="openPage(pageAt(0))"><CatalogueLeaf :pg="pageAt(0)" :on-item="openMaterial" /></div>

          <div
            v-for="(sheet, i) in sheets"
            :key="i"
            class="sheet"
            :class="{ flipped: i < turned }"
            :style="{ zIndex: sheetZ(i) }"
          >
            <div class="sheet-face sheet-front" @click="openPage(sheet.front)">
              <CatalogueLeaf :pg="sheet.front" :on-item="openMaterial" />
              <div class="sheet-shade shade-front" />
            </div>
            <div class="sheet-face sheet-back" @click="openPage(sheet.back)">
              <CatalogueLeaf :pg="sheet.back" :on-item="openMaterial" />
              <div class="sheet-shade shade-back" />
            </div>
          </div>

          <div class="spine" :class="{ active: animating !== -1 }" />
        </div>
      </div>

      <!-- Thumbnails -->
      <div class="thumbs-wrap" :data-open="thumbsOpen">
        <div class="thumbs">
          <button v-for="n in totalSpreads" :key="n" class="thumb" :data-active="n - 1 === spread" @click="goTo(n - 1)">
            <span class="thumb-num">{{ n }}</span>
          </button>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="stage-bar">
        <div class="sb-left">
          <button class="icon-btn" :disabled="!canPrev" @click="prev"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
          <div class="page-readout"><span class="cur">{{ turned + 1 }}</span> / {{ totalSpreads }}</div>
          <button class="icon-btn" :disabled="!canNext" @click="next"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
        </div>
        <div class="slider-row">
          <input type="range" class="slider" :min="0" :max="Math.max(1, totalSpreads - 1)" step="1" :value="spread"
                 :style="{ '--val': (spread / Math.max(1, totalSpreads - 1)) * 100 + '%' }"
                 @input="goTo(parseInt($event.target.value))" />
        </div>
        <div class="sb-right">
          <button class="icon-btn" @click="zoomOut"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/></svg></button>
          <div class="zoom-readout">{{ Math.round(zoom * 100) }}%</div>
          <button class="icon-btn" @click="zoomIn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/></svg></button>
        </div>
      </div>
    </section>

    <!-- Page zoom-view popup -->
    <transition name="fade">
      <div v-if="selected" class="page-bg" @click.self="closePopup">
        <button class="page-close" @click="closePopup" aria-label="Đóng"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <img :src="selected.src" :alt="`Trang ${selected.num}`" class="page-zoom" />
      </div>
    </transition>

    <!-- Material detail popup (An Cường style) -->
    <transition name="fade">
      <div v-if="material" class="mat-bg" @click.self="closePopup">
        <div class="mat-modal">
          <button class="mat-close" @click="closePopup" aria-label="Đóng"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
          <MaterialPopupView :item="material" />
        </div>
      </div>
    </transition>

    <!-- Related-publications drawer -->
    <transition name="fade"><div v-if="drawerOpen" class="drawer-bg" @click.self="drawerOpen = false" /></transition>
    <transition name="slide">
      <aside v-if="drawerOpen" class="drawer">
        <div class="drawer-head">
          <div><span class="drawer-label">Ấn phẩm liên quan</span><div class="drawer-heading">Related publications</div></div>
          <button class="drawer-close" @click="drawerOpen = false" aria-label="Đóng"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </div>
        <div class="drawer-body">
          <button v-for="c in catalogueList" :key="c.id" class="pub-card" :class="{ current: c.id === activeId }" @click="selectCatalogue(c.id)">
            <span class="pub-cover" :style="{ '--cv-bg': c.cover.bg, '--cv-fg': c.cover.fg }">
              <span class="pub-cover-band"><span class="pub-logo"><span class="b" /> AN CƯỜNG</span></span>
              <span class="pub-cover-body">
                <span class="pub-cover-title"><span v-for="(l, li) in c.cover.titleLines" :key="li">{{ l }}</span></span>
                <span class="pub-cover-rule" /><span class="pub-cover-sub">{{ c.cover.sub }}</span>
              </span>
              <span v-if="c.id === activeId" class="pub-flag">Đang đọc</span>
            </span>
            <span class="pub-info">
              <span class="pub-info-text"><span class="pub-title">{{ c.title }}</span><span class="pub-meta">{{ c.year }} · {{ c.subtitle }}</span></span>
              <span class="pub-go"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></span>
            </span>
          </button>
        </div>
      </aside>
    </transition>

    <transition name="fade"><div v-if="shareToast" class="toast">{{ shareToast }}</div></transition>
  </div>
</template>

<style scoped>
.cat-root {
  position: relative; flex: 1; min-height: 0; height: calc(100dvh - 48px);
  overflow: hidden; background: var(--bg); color: var(--fg);
  display: flex; flex-direction: column;
}

/* Toolbar */
.cat-toolbar { display: flex; align-items: center; gap: 14px; padding: 8px 18px; min-height: 44px; flex-shrink: 0; border-bottom: 1px solid var(--line); position: relative; z-index: 5; }
.ct-title { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.ct-title h1 { margin: 0; font-weight: 600; font-size: 14px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ct-sub { color: var(--fg-mute); font-size: 12px; white-space: nowrap; }
.section-chip { margin-left: 2px; color: var(--accent); font-size: 11px; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
.topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 2px; }
.pill { display: flex; align-items: center; gap: 7px; padding: 0 8px 0 2px; margin-right: 4px; font-size: 11px; color: var(--fg-mute); }
.pill .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
.icon-btn { appearance: none; background: transparent; border: 0; color: var(--fg-mute); width: 30px; height: 30px; display: grid; place-items: center; border-radius: 6px; transition: background .12s, color .12s; cursor: pointer; }
.icon-btn:hover:not(:disabled) { background: var(--line); color: var(--fg); }
.icon-btn:disabled { opacity: .3; cursor: default; }
.icon-btn[data-active="true"] { color: var(--accent); }
.tb-sep { width: 1px; height: 18px; background: var(--line); margin: 0 4px; }

/* Chapter tabs */
.chapter-tabs { display: flex; align-items: center; gap: 10px; padding: 0 18px; flex-shrink: 0; height: 40px; border-bottom: 1px solid var(--line); position: relative; z-index: 4; }
.tabs-toggle { appearance: none; flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; background: transparent; border: 0; color: var(--fg-mute); cursor: pointer; font-size: 11.5px; font-weight: 500; padding: 4px 2px; }
.tabs-toggle:hover { color: var(--fg); }
.tabs-toggle svg { transition: transform .25s cubic-bezier(.4,0,.2,1); }
.tabs-list { display: flex; align-items: center; gap: 2px; min-width: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
.tabs-list::-webkit-scrollbar { display: none; }
.chapter-tab { appearance: none; flex-shrink: 0; cursor: pointer; white-space: nowrap; background: transparent; border: 0; color: var(--fg-mute); padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; transition: background .12s, color .12s; }
.chapter-tab:hover { color: var(--fg); background: var(--line); }
.chapter-tab[data-active="true"] { color: var(--fg); font-weight: 600; }
.tabs-reveal-enter-active { transition: opacity .28s ease, transform .28s cubic-bezier(.4,0,.2,1), clip-path .28s ease; }
.tabs-reveal-leave-active { transition: opacity .18s ease, transform .2s, clip-path .2s; }
.tabs-reveal-enter-from, .tabs-reveal-leave-to { opacity: 0; transform: translateX(-8px); clip-path: inset(0 100% 0 0); }
.tabs-reveal-enter-to, .tabs-reveal-leave-from { opacity: 1; transform: translateX(0); clip-path: inset(0 0 0 0); }

/* Stage */
.stage { flex: 1; min-height: 0; min-width: 0; position: relative; display: grid; grid-template-rows: 1fr auto; overflow: hidden; z-index: 1; }
.stage-canvas { position: relative; display: grid; place-items: center; overflow: hidden; padding: 18px 16px 12px; container-type: size; }

.book {
  /* Two-page spread; aspect = two page images side by side (from --book-aspect,
     fallback 1.36 ≈ 2 portrait pages). Sized off the container so it fits. */
  aspect-ratio: var(--book-aspect, 1.36);
  height: min(100cqh, calc(100cqw / var(--book-aspect, 1.36))); max-width: 100%;
  position: relative; perspective: 2800px;
  transform: scale(var(--zoom, 1)); transition: transform .25s cubic-bezier(.3,.7,.3,1);
}
.book::after { content: ""; position: absolute; left: 4%; right: 4%; bottom: -16px; height: 22px; background: radial-gradient(ellipse at center, rgba(0,0,0,.28), transparent 70%); filter: blur(7px); z-index: -1; }
.book-paper { position: absolute; inset: 0; background: #fff; z-index: 0; border-radius: 4px; }

.leaf-base { position: absolute; top: 0; left: 0; width: calc(50% + 1px); height: 100%; z-index: 0; }
.sheet { position: absolute; top: 0; left: 50%; width: 50%; height: 100%; transform-origin: left center; transform-style: preserve-3d; transition: transform var(--flip-ms,700ms) cubic-bezier(.42,0,.25,1); will-change: transform; }
.sheet.flipped { transform: rotateY(-180deg); }
.sheet-face { position: absolute; inset: 0; backface-visibility: hidden; overflow: hidden; }
.sheet-back { transform: rotateY(180deg); }
.sheet-shade { position: absolute; inset: 0; pointer-events: none; transition: opacity var(--flip-ms,700ms) ease; }
.shade-front { background: linear-gradient(270deg, rgba(0,0,0,.28), rgba(0,0,0,0) 60%); opacity: 0; }
.shade-back { background: linear-gradient(90deg, rgba(0,0,0,.28), rgba(0,0,0,0) 60%); opacity: 0; }
.sheet.flipped .shade-back { opacity: .3; }
.sheet:not(.flipped) .shade-front { opacity: .08; }
.spine { position: absolute; top: 0; bottom: 0; left: 50%; width: 22px; transform: translateX(-50%); pointer-events: none; z-index: 1; opacity: 0; transition: opacity .2s ease; background: linear-gradient(90deg, rgba(0,0,0,.16), rgba(0,0,0,.03) 42%, rgba(255,255,255,.04) 50%, rgba(0,0,0,.03) 58%, rgba(0,0,0,.16)); }
.spine.active { opacity: 1; }

/* Nav arrows */
.nav-arrow { appearance: none; position: absolute; top: 50%; width: 56px; height: 56px; border-radius: 50%; border: 0; background: transparent; color: var(--fg-mute); display: grid; place-items: center; cursor: pointer; z-index: 10; transition: background .12s, color .12s; --half-book: min(calc(50cqh * var(--book-aspect, 1.36)), 50cqw); }
.nav-arrow svg { width: 26px; height: 26px; }
.nav-arrow:hover:not(:disabled) { background: var(--line); color: var(--fg); }
.nav-arrow:disabled { opacity: .25; cursor: default; }
.nav-arrow.prev { left: 50%; transform: translate(calc(-1 * (var(--half-book) + 8px + 56px)), -50%); }
.nav-arrow.next { left: 50%; transform: translate(calc(var(--half-book) + 8px), -50%); }

/* Thumbnails */
.thumbs-wrap { position: absolute; left: 0; right: 0; bottom: 58px; padding: 10px 18px; z-index: 6; background: linear-gradient(180deg, transparent, color-mix(in oklab, var(--bg) 85%, transparent) 30%); pointer-events: none; opacity: 0; transform: translateY(8px); transition: opacity .2s, transform .2s; }
.thumbs-wrap[data-open="true"] { opacity: 1; transform: translateY(0); pointer-events: auto; }
.thumbs { display: flex; gap: 8px; overflow-x: auto; padding: 6px 4px 10px; scrollbar-width: thin; }
.thumb { flex-shrink: 0; width: 54px; height: 76px; border-radius: 4px; padding: 0; cursor: pointer; background: var(--bg-elev-2); border: 1px solid var(--line-2); display: grid; place-items: center; transition: border-color .12s, transform .15s; }
.thumb:hover { transform: translateY(-2px); border-color: var(--line-3); }
.thumb[data-active="true"] { border-color: var(--accent); }
.thumb-num { font-family: var(--font-mono); font-size: 11px; color: var(--fg-mute); }
.thumb[data-active="true"] .thumb-num { color: var(--accent); }

/* Bottom bar */
.stage-bar { display: grid; grid-template-columns: 180px 1fr 180px; align-items: center; gap: 18px; padding: 8px 18px 10px; border-top: 1px solid var(--line); }
.sb-left, .sb-right { display: flex; align-items: center; gap: 6px; }
.sb-right { justify-content: flex-end; }
.page-readout { font-size: 11px; color: var(--fg-mute); }
.page-readout .cur { color: var(--fg); }
.zoom-readout { font-size: 11px; color: var(--fg-mute); min-width: 42px; text-align: center; }
.slider-row { display: flex; width: 100%; }
.slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; outline: none; background: rgba(255,255,255,.06); border-radius: 999px; background-image: linear-gradient(90deg, var(--accent), var(--accent)); background-size: var(--val,0%) 100%; background-repeat: no-repeat; }
.slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%; border: 0; background: var(--accent); cursor: grab; }
.slider::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--accent); border: 0; }

/* Page zoom-view popup */
.page-bg { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.78); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 4vh 4vw; }
.page-zoom { max-width: 100%; max-height: 92vh; border-radius: 6px; box-shadow: 0 30px 80px rgba(0,0,0,.6); background: #fff; }
.page-close { position: fixed; top: 18px; right: 22px; z-index: 2; width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); color: #fff; display: grid; place-items: center; cursor: pointer; transition: background .12s; }
.page-close:hover { background: rgba(255,255,255,.2); }

/* Material detail popup */
.mat-bg { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; }
.mat-modal { position: relative; width: 100%; max-width: 880px; max-height: 92dvh; overflow: auto; background: var(--glass-bg-pop); -webkit-backdrop-filter: blur(28px) saturate(180%); backdrop-filter: blur(28px) saturate(180%); border: 1px solid var(--glass-border); border-radius: var(--radius-3xl); box-shadow: var(--shadow-island-lg); }
.mat-close { position: absolute; top: 14px; right: 14px; z-index: 3; width: 36px; height: 36px; border-radius: 8px; background: var(--bg-elev); border: 1px solid var(--line-2); color: var(--fg); display: grid; place-items: center; cursor: pointer; transition: background .12s; }
.mat-close:hover { background: var(--bg-elev-2); }
/* Gallery / info / actions live in <MaterialPopupView>. */

/* Drawer */
.drawer-bg { position: fixed; inset: 0; z-index: 110; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); }
.drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 111; width: min(384px, 90vw); background: var(--glass-bg-pop); -webkit-backdrop-filter: blur(28px) saturate(180%); backdrop-filter: blur(28px) saturate(180%); border-left: 1px solid var(--glass-border); box-shadow: -12px 0 40px rgba(15,23,42,.18); display: flex; flex-direction: column; }
.drawer-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 22px 18px; border-bottom: 1px solid var(--line); }
.drawer-label { display: block; margin-bottom: 6px; font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--fg-faint); }
.drawer-heading { font-family: var(--font-serif); font-size: 22px; line-height: 1; }
.drawer-close { width: 32px; height: 32px; border-radius: 7px; flex: none; background: none; border: none; color: var(--fg-mute); cursor: pointer; display: grid; place-items: center; transition: background .12s, color .12s; }
.drawer-close:hover { background: var(--line); color: var(--fg); }
.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.pub-card { display: grid; grid-template-columns: 84px 1fr; text-align: left; cursor: pointer; padding: 0; background: var(--bg-elev-2); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; font: inherit; color: inherit; transition: border-color .18s, transform .18s, box-shadow .18s; }
.pub-card:hover { border-color: var(--line-3); transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0,0,0,.32); }
.pub-card.current { border-color: color-mix(in oklab, var(--accent) 55%, transparent); box-shadow: 0 0 0 1px color-mix(in oklab, var(--accent) 40%, transparent); }
.pub-cover { position: relative; display: flex; flex-direction: column; aspect-ratio: 3 / 4; background: var(--cv-bg); color: var(--cv-fg); }
.pub-cover-band { height: 22%; background: #fff; display: flex; align-items: center; justify-content: flex-end; padding: 0 8px; }
.pub-logo { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 6px; letter-spacing: .05em; color: rgba(0,0,0,.65); }
.pub-logo .b { width: 7px; height: 7px; border-radius: 50%; background: #006BB7; position: relative; }
.pub-logo .b::after { content: ''; position: absolute; inset: 1.6px; background: #fff; border-radius: 50%; }
.pub-cover-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 8px 6px; text-align: center; }
.pub-cover-title { display: flex; flex-direction: column; align-items: center; line-height: .9; }
.pub-cover-title span { font-weight: 800; font-size: 14px; letter-spacing: -.3px; }
.pub-cover-rule { width: 50%; height: 1px; background: currentColor; opacity: .4; margin: 5px 0 3px; }
.pub-cover-sub { font-family: var(--font-mono); font-size: 5.5px; letter-spacing: .08em; opacity: .85; }
.pub-flag { position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); font-family: var(--font-mono); font-size: 7px; letter-spacing: .05em; text-transform: uppercase; background: var(--accent); color: var(--accent-fg); padding: 3px 7px; border-radius: 999px; white-space: nowrap; }
.pub-info { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; }
.pub-info-text { min-width: 0; }
.pub-title { display: block; font-size: 13.5px; font-weight: 600; line-height: 1.3; }
.pub-meta { display: block; margin-top: 4px; font-size: 11px; color: var(--fg-mute); }
.pub-go { flex: none; width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line-2); display: grid; place-items: center; color: var(--fg-dim); transition: background .15s, color .15s, border-color .15s; }
.pub-card:hover .pub-go { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
.slide-enter-active, .slide-leave-active { transition: transform .28s cubic-bezier(.32,.72,.18,1); }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }

/* Toast + fade */
.toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%); z-index: 120; background: var(--fg); color: var(--bg); font-size: 13px; font-weight: 500; padding: 10px 18px; border-radius: 999px; box-shadow: 0 10px 30px rgba(0,0,0,.4); }
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 720px) {
  .chapter-tabs { padding: 0 12px; }
  .stage-canvas { padding: 14px 6px 12px; }
  .nav-arrow { width: 44px; height: 44px; }
  .nav-arrow svg { width: 22px; height: 22px; }
  .nav-arrow.prev { left: 6px; transform: translateY(-50%); }
  .nav-arrow.next { left: auto; right: 6px; transform: translateY(-50%); }
  .ct-sub, .section-chip { display: none; }
  .pill { display: none; }
  .stage-bar { grid-template-columns: auto 1fr auto; gap: 10px; }
}
</style>
