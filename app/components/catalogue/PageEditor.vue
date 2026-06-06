<script setup>
/* Right-column editor. Edits either the catalogue meta (pageIndex === -1) or a
   single page (image / material). Writes straight into the store's reactive
   data via updatePage/save, persisting to localStorage. */
import { ref, computed } from 'vue'
import { useCatalogueStore, normalizeItem, MAX_GRID_ITEMS } from '~/composables/useCatalogues'

const props = defineProps({
  catId: { type: String, required: true },
  pageIndex: { type: Number, default: -1 },   // -1 = catalogue meta
})

const store = useCatalogueStore()
const cat = computed(() => store.get(props.catId))
const page = computed(() => props.pageIndex >= 0 ? cat.value.realPages[props.pageIndex] : null)
const isMaterial = computed(() => page.value && typeof page.value === 'object' && page.value.material)
const isVideo = computed(() => page.value && typeof page.value === 'object' && (page.value.video || page.value.videoCont))
const isImage = computed(() => props.pageIndex >= 0 && !isMaterial.value && !isVideo.value)

/* ── Video page ──
   The editor always targets the HEAD entry (the even page). If the user lands
   on the tail (videoCont), we resolve back to the head one slot earlier. */
const videoHeadIndex = computed(() =>
  page.value?.videoCont ? props.pageIndex - 1 : props.pageIndex
)
const videoHead = computed(() => cat.value.realPages[videoHeadIndex.value])
const DEFAULT_VIDEO = 'https://api-gateway.tranduc.com/api/video/tdc-video.mp4'
const videoSrc = computed({
  get: () => videoHead.value?.video?.src || '',
  set: (v) => {
    const h = videoHead.value
    if (h && h.video) { h.video.src = v; store.persist() }
  },
})
function useDefaultVideo() { videoSrc.value = DEFAULT_VIDEO }

function commit() { store.persist() }

/* ── Image page ── */
const imageSrc = computed({
  get: () => (typeof page.value === 'string' ? page.value : ''),
  set: (v) => { store.updatePage(props.catId, props.pageIndex, v) },
})

/* ── Material page helpers ── */
const MAX_ITEMS = MAX_GRID_ITEMS
const canAddItem = computed(() => isMaterial.value && page.value.material.items.length < MAX_ITEMS)
function addItem() {
  if (!canAddItem.value) return
  page.value.material.items.push({ code: '', name: '', images: [], specs: [], actions: [], new: false })
  commit()
}
function removeItem(i) { page.value.material.items.splice(i, 1); commit() }
function moveItem(i, dir) {
  const arr = page.value.material.items
  const j = i + dir
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  commit()
}
function setCols(n) { page.value.material.cols = n; commit() }
function itemSwatch(it) { return normalizeItem(it).swatch }

/* Popup editor modal */
const popupOpen = ref(false)
const editingItem = ref(null)
function editPopup(it) { editingItem.value = it; popupOpen.value = true }

/* ── Catalogue meta ── */
function addChapter() { cat.value.chapters.push({ label: '', page: 1 }); commit() }
function removeChapter(i) { cat.value.chapters.splice(i, 1); commit() }
function setTitleLine(i, v) { cat.value.cover.titleLines[i] = v; commit() }
function addTitleLine() { cat.value.cover.titleLines.push(''); commit() }
function removeTitleLine(i) { cat.value.cover.titleLines.splice(i, 1); commit() }
</script>

<template>
  <div class="pe">
    <!-- ── Catalogue meta ── -->
    <template v-if="pageIndex === -1">
      <h2 class="pe-h">Thông tin catalogue</h2>
      <label class="pe-f"><span>Tiêu đề</span><input v-model="cat.title" type="text" @change="commit" /></label>
      <label class="pe-f"><span>Phụ đề</span><input v-model="cat.subtitle" type="text" @change="commit" /></label>
      <label class="pe-f"><span>Năm</span><input v-model="cat.year" type="text" @change="commit" /></label>

      <div class="pe-group">
        <div class="pe-group-h"><span>Bìa (drawer)</span></div>
        <div class="pe-grid2">
          <label class="pe-f"><span>Màu nền</span><input v-model="cat.cover.bg" type="text" placeholder="#3a2c25" @change="commit" /></label>
          <label class="pe-f"><span>Màu chữ</span><input v-model="cat.cover.fg" type="text" placeholder="#f3eee5" @change="commit" /></label>
        </div>
        <label class="pe-f"><span>Dòng phụ (sub)</span><input v-model="cat.cover.sub" type="text" @change="commit" /></label>
        <div class="pe-sub-h"><span>Dòng tiêu đề bìa</span><button class="pe-add" @click="addTitleLine">+ Dòng</button></div>
        <div v-for="(l, i) in cat.cover.titleLines" :key="i" class="pe-inline">
          <input :value="l" type="text" @input="setTitleLine(i, $event.target.value)" />
          <button class="pe-del" @click="removeTitleLine(i)" aria-label="Xóa">×</button>
        </div>
      </div>

      <div class="pe-group">
        <div class="pe-group-h"><span>Mục lục (Xem nhanh)</span><button class="pe-add" @click="addChapter">+ Chương</button></div>
        <div v-for="(ch, i) in cat.chapters" :key="i" class="pe-inline">
          <input v-model="ch.label" type="text" class="grow" placeholder="Tên chương" @change="commit" />
          <input v-model.number="ch.page" type="number" min="1" class="pe-num" @change="commit" />
          <button class="pe-del" @click="removeChapter(i)" aria-label="Xóa">×</button>
        </div>
        <p v-if="!cat.chapters.length" class="pe-empty">Chưa có chương.</p>
      </div>
    </template>

    <!-- ── Image page ── -->
    <template v-else-if="isImage">
      <h2 class="pe-h">Trang {{ pageIndex + 1 }} · Ảnh</h2>
      <p class="pe-hint">Trang hiển thị một ảnh (URL CDN An Cường hoặc ảnh upload). Để trống = placeholder.</p>
      <ImageField v-model="imageSrc" label="Ảnh trang" ratio="3 / 4" />
    </template>

    <!-- ── Video page (2-page spread) ── -->
    <template v-else-if="isVideo">
      <h2 class="pe-h">Trang {{ videoHeadIndex + 1 }}–{{ videoHeadIndex + 2 }} · Video</h2>
      <p class="pe-hint">
        Video trải <strong>2 trang</strong> (bắt đầu từ trang chẵn → trang lẻ kế tiếp,
        ví dụ 2–3, 4–5). Trang chẵn hiện nửa trái, trang lẻ hiện nửa phải. Tự phát, tắt tiếng, lặp lại.
      </p>
      <label class="pe-f">
        <span>Link video (MP4)</span>
        <input v-model="videoSrc" type="url" :placeholder="DEFAULT_VIDEO" @change="commit" />
      </label>
      <button class="pe-add" style="align-self:flex-start" @click="useDefaultVideo">Dùng video mẫu TDC</button>

      <div v-if="videoSrc" class="pe-video-preview">
        <video :src="videoSrc" autoplay muted loop playsinline controls />
      </div>
      <p v-else class="pe-empty">Chưa có link. Dán link MP4 hoặc bấm “Dùng video mẫu TDC”.</p>
    </template>

    <!-- ── Material page ── -->
    <template v-else-if="isMaterial">
      <h2 class="pe-h">Trang {{ pageIndex + 1 }} · Vật liệu</h2>
      <div class="pe-grid2">
        <label class="pe-f"><span>Chủ đề</span><input v-model="page.material.theme" type="text" @change="commit" /></label>
        <label class="pe-f"><span>Nhóm phụ (sub)</span><input v-model="page.material.sub" type="text" @change="commit" /></label>
      </div>

      <!-- Grid columns 1..3 -->
      <div class="pe-f">
        <span>Số cột lưới</span>
        <div class="pe-cols">
          <button v-for="n in 3" :key="n" class="pe-col-opt" :class="{ active: (page.material.cols || 3) === n }" @click="setCols(n)">{{ n }} cột</button>
        </div>
      </div>

      <div class="pe-group">
        <div class="pe-group-h">
          <span>Ô màu ({{ page.material.items.length }}/{{ MAX_ITEMS }})</span>
          <button class="pe-add" :disabled="!canAddItem" @click="addItem">+ Ô màu</button>
        </div>

        <div v-for="(it, i) in page.material.items" :key="i" class="pe-cell-row">
          <span class="pe-cell-sw">
            <img v-if="itemSwatch(it)" :src="itemSwatch(it)" alt="" />
            <span v-else class="pe-cell-ph">—</span>
          </span>
          <span class="pe-cell-info">
            <input v-model="it.code" type="text" class="pe-cell-code" placeholder="Mã" @change="commit" />
            <input v-model="it.name" type="text" class="pe-cell-name" placeholder="Tên màu" @change="commit" />
          </span>
          <span class="pe-cell-tools">
            <button class="pe-edit" @click="editPopup(it)">Sửa popup</button>
            <button class="pe-mini" @click="moveItem(i, -1)" :disabled="i === 0" title="Lên">↑</button>
            <button class="pe-mini" @click="moveItem(i, 1)" :disabled="i === page.material.items.length - 1" title="Xuống">↓</button>
            <button class="pe-mini danger" @click="removeItem(i)" title="Xóa">×</button>
          </span>
        </div>
        <p v-if="!page.material.items.length" class="pe-empty">Chưa có ô màu. Bấm “+ Ô màu”.</p>
      </div>
    </template>

    <!-- Per-item popup editor -->
    <MaterialPopupEditor :open="popupOpen" :item="editingItem" @update:open="popupOpen = $event" />
  </div>
</template>

<style scoped>
.pe { display: flex; flex-direction: column; gap: 14px; }
.pe-h { font-size: 15px; font-weight: 700; margin: 0; }
.pe-hint { font-size: 11.5px; color: var(--fg-mute); margin: -6px 0 0; line-height: 1.4; }
.pe-f { display: flex; flex-direction: column; gap: 5px; }
.pe-f > span { font-size: 11.5px; font-weight: 600; color: var(--fg-dim); }
.pe-f input { appearance: none; width: 100%; font: inherit; font-size: 13px; padding: 8px 10px; border-radius: 8px; background: var(--bg-elev-2); border: 1px solid var(--line-2); color: var(--fg); }
.pe-f input:focus { outline: none; border-color: color-mix(in oklab, var(--accent) 55%, transparent); }
.pe-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.pe-group { border: 1px solid var(--line); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.pe-group-h, .pe-sub-h { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; font-weight: 700; color: var(--fg-dim); }
.pe-sub-h { font-weight: 600; color: var(--fg-mute); }
.pe-add { appearance: none; cursor: pointer; background: transparent; border: 1px solid var(--line-2); color: var(--accent); font: inherit; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 6px; }
.pe-add:hover:not(:disabled) { background: color-mix(in oklab, var(--accent) 10%, transparent); }
.pe-add:disabled { opacity: .4; cursor: default; }

/* cols selector */
.pe-cols { display: flex; gap: 6px; }
.pe-col-opt { appearance: none; cursor: pointer; flex: 1; font: inherit; font-size: 12px; font-weight: 600; padding: 7px; border-radius: 7px; background: var(--bg-elev-2); border: 1px solid var(--line-2); color: var(--fg-mute); }
.pe-col-opt:hover { color: var(--fg); }
.pe-col-opt.active { color: var(--accent); border-color: color-mix(in oklab, var(--accent) 45%, transparent); background: color-mix(in oklab, var(--accent) 10%, transparent); }

/* compact material cell rows */
.pe-cell-row { display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid var(--line); border-radius: 9px; background: var(--bg-elev); }
.pe-cell-sw { width: 40px; height: 40px; flex: none; border-radius: 5px; overflow: hidden; border: 1px solid var(--line-2); background: var(--bg-elev-2); display: grid; place-items: center; }
.pe-cell-sw img { width: 100%; height: 100%; object-fit: cover; }
.pe-cell-ph { color: var(--fg-faint); }
.pe-cell-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.pe-cell-info input { appearance: none; font: inherit; padding: 5px 8px; border-radius: 6px; background: var(--bg-elev-2); border: 1px solid var(--line-2); color: var(--fg); width: 100%; }
.pe-cell-info input:focus { outline: none; border-color: color-mix(in oklab, var(--accent) 55%, transparent); }
.pe-cell-code { font-size: 12px; font-weight: 600; }
.pe-cell-name { font-size: 11.5px; }
.pe-cell-tools { display: flex; align-items: center; gap: 4px; flex: none; }
.pe-edit { appearance: none; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 6px; background: transparent; border: 1px solid var(--line-2); color: var(--fg-dim); }
.pe-edit:hover { color: var(--accent); border-color: color-mix(in oklab, var(--accent) 40%, transparent); }
.pe-inline { display: flex; align-items: center; gap: 6px; }
.pe-inline input { appearance: none; font: inherit; font-size: 12.5px; padding: 6px 8px; border-radius: 7px; background: var(--bg-elev-2); border: 1px solid var(--line-2); color: var(--fg); flex: 1; min-width: 0; }
.pe-inline input:focus { outline: none; border-color: color-mix(in oklab, var(--accent) 55%, transparent); }
.pe-inline input.grow { flex: 1; }
.pe-num { width: 64px; flex: none !important; text-align: center; }
.pe-del { flex: none; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; background: transparent; border: 1px solid var(--line-2); color: var(--fg-mute); font-size: 16px; line-height: 1; }
.pe-del:hover { color: var(--danger); border-color: color-mix(in oklab, var(--danger) 40%, transparent); }
.pe-empty { font-size: 12px; color: var(--fg-mute); margin: 0; }

.pe-item { border: 1px solid var(--line); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; background: var(--bg-elev); }
.pe-item-head { display: flex; align-items: center; justify-content: space-between; }
.pe-item-no { font-family: var(--font-mono); font-size: 11px; color: var(--fg-mute); }
.pe-item-tools { display: flex; gap: 4px; }
.pe-mini { appearance: none; cursor: pointer; width: 24px; height: 24px; border-radius: 6px; background: transparent; border: 1px solid var(--line-2); color: var(--fg-mute); font-size: 13px; line-height: 1; }
.pe-mini:hover:not(:disabled) { color: var(--fg); border-color: var(--line-3); }
.pe-mini:disabled { opacity: .3; cursor: default; }
.pe-mini.danger:hover { color: var(--danger); border-color: color-mix(in oklab, var(--danger) 40%, transparent); }
.pe-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--fg-dim); }
.pe-check input { accent-color: var(--accent); }

/* Video preview */
.pe-video-preview { border: 1px solid var(--line-2); border-radius: 10px; overflow: hidden; background: #000; }
.pe-video-preview video { display: block; width: 100%; max-height: 320px; object-fit: contain; background: #000; }
</style>
