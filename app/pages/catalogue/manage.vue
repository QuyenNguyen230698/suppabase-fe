<script setup>
/* Catalogue manage — "flipbook edit".
   Split layout: page list (left) + page editor (right). Edits go through the
   shared catalogue store (localStorage). Includes Export/Import JSON and a
   live "Xem trước" link to the flipbook. */
import { ref, computed } from 'vue'
import { useCatalogueStore, buildPages } from '~/composables/useCatalogues'

const store = useCatalogueStore()
const list = computed(() => store.catalogues())
const activeId = ref(list.value[0].id)
const cat = computed(() => store.get(activeId.value))
const selected = ref(-1)   // -1 = catalogue meta

function selectCat(id) { activeId.value = id; selected.value = -1 }

/* Stats */
const stats = computed(() => {
  const pages = cat.value.realPages
  const material = pages.filter(p => p && typeof p === 'object' && p.material)
  const products = material.reduce((s, p) => s + p.material.items.length, 0)
  return {
    pages: pages.length,
    images: pages.filter(p => typeof p === 'string' && p).length,
    materials: material.length,
    products,
  }
})

/* Save / reset */
const savedToast = ref('')
function flash(m) { savedToast.value = m; setTimeout(() => { if (savedToast.value === m) savedToast.value = '' }, 2200) }
function saveNow() {
  const err = store.persist()
  flash(err ? 'Lỗi: dữ liệu quá lớn cho localStorage' : 'Đã lưu')
}
function resetCat() {
  if (!confirm('Khôi phục catalogue này về mặc định?')) return
  store.resetCatalogue(activeId.value)
  selected.value = -1
  flash('Đã khôi phục mặc định')
}

/* Export / Import */
function exportJson() {
  const blob = new Blob([store.exportJson()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'catalogues.json'
  a.click()
  URL.revokeObjectURL(a.href)
}
const importInput = ref(null)
function pickImport() { importInput.value?.click() }
async function onImport(e) {
  const file = e.target.files?.[0]; e.target.value = ''
  if (!file) return
  try {
    store.importJson(await file.text())
    activeId.value = list.value[0].id; selected.value = -1
    flash('Đã nhập dữ liệu')
  } catch (err) {
    flash('JSON không hợp lệ: ' + (err?.message || ''))
  }
}

/* Preview spread count */
const spreadCount = computed(() => Math.ceil(buildPages(cat.value).length / 2))
</script>

<template>
  <div class="mng">
    <!-- Header -->
    <div class="mng-header">
      <div class="mng-h-left">
        <NuxtLink to="/catalogue" class="mng-back" title="Quay lại flipbook" aria-label="Quay lại">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </NuxtLink>
        <div class="mng-h-text">
          <h1 class="mng-title">Quản lý Catalogue</h1>
          <p class="mng-sub">Chỉnh sửa hình ảnh, sản phẩm và popup của từng trang flipbook.</p>
        </div>
      </div>
      <div class="mng-h-right">
        <select class="mng-select" :value="activeId" @change="selectCat($event.target.value)">
          <option v-for="c in list" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
        <NuxtLink to="/catalogue" class="mng-btn ghost" target="_blank">Xem trước ↗</NuxtLink>
        <button class="mng-btn ghost" @click="exportJson">Export</button>
        <button class="mng-btn ghost" @click="pickImport">Import</button>
        <button class="mng-btn ghost danger" @click="resetCat">Khôi phục</button>
        <button class="mng-btn primary" @click="saveNow">Lưu</button>
        <input ref="importInput" type="file" accept="application/json,.json" hidden @change="onImport" />
      </div>
    </div>

    <!-- Stats -->
    <div class="mng-stats">
      <div class="mng-stat"><span class="v">{{ stats.pages }}</span><span class="l">Trang</span></div>
      <div class="sep" />
      <div class="mng-stat"><span class="v">{{ spreadCount }}</span><span class="l">Spread</span></div>
      <div class="sep" />
      <div class="mng-stat"><span class="v">{{ stats.images }}</span><span class="l">Trang ảnh</span></div>
      <div class="sep" />
      <div class="mng-stat"><span class="v accent">{{ stats.materials }}</span><span class="l">Trang vật liệu</span></div>
      <div class="sep" />
      <div class="mng-stat"><span class="v">{{ stats.products }}</span><span class="l">Sản phẩm</span></div>
    </div>

    <!-- Split body -->
    <div class="mng-body">
      <aside class="mng-list">
        <PageList :cat-id="activeId" :selected="selected" @select="selected = $event" />
      </aside>
      <section class="mng-editor">
        <PageEditor :key="activeId + ':' + selected" :cat-id="activeId" :page-index="selected" />
      </section>
    </div>

    <transition name="fade"><div v-if="savedToast" class="mng-toast">{{ savedToast }}</div></transition>
  </div>
</template>

<style scoped>
.mng { display: flex; flex-direction: column; min-height: 0; height: calc(100dvh - 48px); }

/* Header */
.mng-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 20px 26px 16px; background: var(--glass-bg-soft); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); border-bottom: 1px solid var(--glass-border); flex-shrink: 0; }
.mng-h-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.mng-back { flex: none; width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center; color: var(--fg-mute); background: var(--bg-elev-2); border: 1px solid var(--line-2); text-decoration: none; transition: background .12s, color .12s, border-color .12s; }
.mng-back:hover { color: var(--fg); background: var(--line); border-color: var(--line-3); }
.mng-title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 3px; background: linear-gradient(135deg, var(--fg) 0%, var(--accent) 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.mng-sub { font-size: 12px; color: var(--fg-mute); margin: 0; }
.mng-h-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.mng-select { appearance: none; font: inherit; font-size: 12.5px; padding: 7px 28px 7px 10px; border-radius: 8px; background: var(--bg-elev-2); border: 1px solid var(--line-2); color: var(--fg); cursor: pointer; }
.mng-btn { appearance: none; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600; padding: 7px 15px; border-radius: 999px; text-decoration: none; display: inline-flex; align-items: center; transition: background .15s, border-color .15s, opacity .12s, transform .12s var(--spring); }
.mng-btn:active { transform: scale(0.96); }
.mng-btn.primary { background: var(--accent); color: var(--accent-fg); border: 1px solid var(--accent); box-shadow: var(--shadow-pill); }
.mng-btn.primary:hover { opacity: .9; }
.mng-btn.ghost { background: transparent; color: var(--fg-mute); border: 1px solid var(--line-2); }
.mng-btn.ghost:hover { color: var(--fg); border-color: var(--line-3); }
.mng-btn.danger:hover { color: var(--danger); border-color: color-mix(in oklab, var(--danger) 40%, transparent); }

/* Stats */
.mng-stats { display: flex; align-items: center; padding: 10px 26px; background: var(--glass-bg-soft); -webkit-backdrop-filter: blur(16px) saturate(160%); backdrop-filter: blur(16px) saturate(160%); border-bottom: 1px solid var(--glass-border); flex-shrink: 0; overflow-x: auto; }
.mng-stat { display: flex; align-items: baseline; gap: 7px; flex: none; }
.mng-stat .v { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
.mng-stat .v.accent { color: var(--accent); }
.mng-stat .l { font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg-mute); white-space: nowrap; }
.mng-stats .sep { width: 1px; height: 22px; background: var(--line-2); margin: 0 16px; flex: none; }

/* Body split */
.mng-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 300px 1fr; }
.mng-list { min-height: 0; border-right: 1px solid var(--line); background: var(--bg-elev); }
.mng-editor { min-height: 0; overflow-y: auto; padding: 20px 24px 40px; }

.mng-toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%); z-index: 120; background: var(--fg); color: var(--bg); font-size: 13px; font-weight: 500; padding: 10px 18px; border-radius: 999px; box-shadow: 0 10px 30px rgba(0,0,0,.4); }
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 900px) {
  .mng-body { grid-template-columns: 1fr; grid-template-rows: 240px 1fr; }
  .mng-list { border-right: 0; border-bottom: 1px solid var(--line); }
}
</style>
