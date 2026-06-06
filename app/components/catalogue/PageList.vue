<script setup>
/* Left-column page list with native HTML5 drag-and-drop reordering.
   Emits 'select' (page index, or -1 for catalogue meta). Page ops go through
   the store. */
import { ref, computed } from 'vue'
import { useCatalogueStore, normalizeItem } from '~/composables/useCatalogues'

const props = defineProps({
  catId: { type: String, required: true },
  selected: { type: Number, default: -1 },   // -1 = catalogue meta
})
const emit = defineEmits(['select'])

const store = useCatalogueStore()
const cat = computed(() => store.get(props.catId))
const pages = computed(() => cat.value.realPages)

function kindOf(p) {
  if (p && typeof p === 'object' && p.material) return 'material'
  if (p && typeof p === 'object' && p.video) return 'video'
  if (p && typeof p === 'object' && p.videoCont) return 'video-cont'
  if (typeof p === 'string' && p) return 'image'
  return 'empty'
}
function kindLabel(k) {
  return k === 'material' ? 'Vật liệu'
    : k === 'image' ? 'Ảnh'
    : k === 'video' ? 'Video (2 trang)'
    : k === 'video-cont' ? 'Video (tiếp)'
    : 'Trống'
}
function thumbSrc(p) {
  if (typeof p === 'string') return p
  if (p && p.material) return normalizeItem(p.material.items?.[0] || {}).swatch
  return ''
}

const addOpen = ref(false)
function add(kind) {
  addOpen.value = false
  if (kind === 'video') {
    const at = store.addVideoSpread(props.catId, '')
    emit('select', at)
    return
  }
  store.addPage(props.catId, kind)
  emit('select', pages.value.length - 1)
}
function remove(i) {
  store.removePage(props.catId, i)
  if (props.selected >= pages.value.length) emit('select', pages.value.length - 1)
}
function duplicate(i) { store.duplicatePage(props.catId, i) }

/* ── Drag & drop ── */
const dragIndex = ref(-1)
const overIndex = ref(-1)
function onDragStart(i, e) { dragIndex.value = i; e.dataTransfer.effectAllowed = 'move' }
function onDragOver(i, e) { e.preventDefault(); overIndex.value = i }
function onDrop(i) {
  if (dragIndex.value >= 0 && dragIndex.value !== i) {
    store.movePage(props.catId, dragIndex.value, i)
    emit('select', i)
  }
  dragIndex.value = -1; overIndex.value = -1
}
function onDragEnd() { dragIndex.value = -1; overIndex.value = -1 }
</script>

<template>
  <div class="pl">
    <!-- Catalogue meta row -->
    <button class="pl-meta" :class="{ active: selected === -1 }" @click="emit('select', -1)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      Thông tin catalogue
    </button>

    <div class="pl-divider">Trang ({{ pages.length }})</div>

    <div class="pl-scroll">
      <div
        v-for="(p, i) in pages"
        :key="i"
        class="pl-row"
        :class="{ active: selected === i, over: overIndex === i, dragging: dragIndex === i, 'is-cont': kindOf(p) === 'video-cont' }"
        :draggable="kindOf(p) !== 'video' && kindOf(p) !== 'video-cont'"
        @click="emit('select', kindOf(p) === 'video-cont' ? i - 1 : i)"
        @dragstart="onDragStart(i, $event)"
        @dragover="onDragOver(i, $event)"
        @drop="onDrop(i)"
        @dragend="onDragEnd"
      >
        <span class="pl-grip" aria-hidden="true">⠿</span>
        <span class="pl-thumb" :data-kind="kindOf(p)">
          <img v-if="thumbSrc(p)" :src="thumbSrc(p)" alt="" />
          <span v-else-if="kindOf(p) === 'material'" class="pl-thumb-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </span>
          <span v-else-if="kindOf(p) === 'video' || kindOf(p) === 'video-cont'" class="pl-thumb-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </span>
          <span v-else class="pl-thumb-ic dim">—</span>
        </span>
        <span class="pl-info">
          <span class="pl-num">Trang {{ i + 1 }}</span>
          <span class="pl-kind" :data-kind="kindOf(p)">{{ kindLabel(kindOf(p)) }}</span>
        </span>
        <span class="pl-row-tools">
          <button class="pl-tool" @click.stop="duplicate(i)" title="Nhân bản">⧉</button>
          <button class="pl-tool danger" @click.stop="remove(i)" title="Xóa">×</button>
        </span>
      </div>
      <p v-if="!pages.length" class="pl-empty">Chưa có trang nào.</p>
    </div>

    <!-- Add page -->
    <div class="pl-add-wrap">
      <button class="pl-add" @click="addOpen = !addOpen">＋ Thêm trang</button>
      <transition name="pl-pop">
        <div v-if="addOpen" class="pl-add-menu">
          <button @click="add('image')">Trang ảnh</button>
          <button @click="add('material')">Trang vật liệu</button>
          <button @click="add('video')">Video (2 trang)</button>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.pl { display: flex; flex-direction: column; min-height: 0; height: 100%; }
.pl-meta { display: flex; align-items: center; gap: 9px; appearance: none; cursor: pointer; text-align: left; width: 100%; background: transparent; border: 0; border-bottom: 1px solid var(--line); color: var(--fg-dim); font: inherit; font-size: 13px; font-weight: 600; padding: 12px 14px; }
.pl-meta:hover { background: var(--line); color: var(--fg); }
.pl-meta.active { background: color-mix(in oklab, var(--accent) 10%, transparent); color: var(--accent); }
.pl-divider { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--fg-faint); padding: 12px 14px 6px; }
.pl-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px; }

.pl-row { display: flex; align-items: center; gap: 9px; padding: 8px; border-radius: 9px; cursor: pointer; border: 1px solid transparent; transition: background .12s, border-color .12s; }
.pl-row:hover { background: var(--line); }
.pl-row.active { background: color-mix(in oklab, var(--accent) 10%, transparent); border-color: color-mix(in oklab, var(--accent) 35%, transparent); }
.pl-row.over { border-color: var(--accent); border-style: dashed; }
.pl-row.dragging { opacity: .4; }
.pl-grip { color: var(--fg-faint); cursor: grab; font-size: 12px; line-height: 1; user-select: none; }
.pl-thumb { width: 34px; height: 46px; flex: none; border-radius: 4px; overflow: hidden; background: var(--bg-elev-2); border: 1px solid var(--line-2); display: grid; place-items: center; }
.pl-thumb img { width: 100%; height: 100%; object-fit: cover; }
.pl-thumb-ic { color: var(--fg-mute); }
.pl-thumb-ic.dim { color: var(--fg-faint); font-size: 14px; }
.pl-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pl-num { font-size: 12.5px; font-weight: 600; }
.pl-kind { font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; }
.pl-kind[data-kind="material"] { color: #7a9a8a; }
.pl-kind[data-kind="image"] { color: var(--fg-mute); }
.pl-kind[data-kind="video"] { color: var(--accent); }
.pl-kind[data-kind="video-cont"] { color: var(--fg-faint); }
.pl-kind[data-kind="empty"] { color: var(--fg-faint); }
/* The continuation half is auto-managed — show it muted, no drag handle. */
.pl-row.is-cont { opacity: .6; }
.pl-row.is-cont .pl-grip { visibility: hidden; }
.pl-row-tools { display: flex; gap: 3px; opacity: 0; transition: opacity .12s; }
.pl-row:hover .pl-row-tools, .pl-row.active .pl-row-tools { opacity: 1; }
.pl-tool { appearance: none; cursor: pointer; width: 24px; height: 24px; border-radius: 6px; background: transparent; border: 1px solid var(--line-2); color: var(--fg-mute); font-size: 13px; line-height: 1; }
.pl-tool:hover { color: var(--fg); border-color: var(--line-3); }
.pl-tool.danger:hover { color: var(--danger); border-color: color-mix(in oklab, var(--danger) 40%, transparent); }
.pl-empty { font-size: 12px; color: var(--fg-mute); padding: 14px; }

.pl-add-wrap { position: relative; padding: 10px; border-top: 1px solid var(--line); }
.pl-add { appearance: none; cursor: pointer; width: 100%; font: inherit; font-size: 12.5px; font-weight: 600; padding: 9px; border-radius: 8px; background: var(--accent); color: var(--accent-fg); border: 1px solid var(--accent); }
.pl-add:hover { opacity: .9; }
.pl-add-menu { position: absolute; left: 10px; right: 10px; bottom: calc(100% - 2px); background: var(--bg-elev); border: 1px solid var(--line-2); border-radius: 9px; box-shadow: 0 -8px 24px rgba(0,0,0,.3); overflow: hidden; }
.pl-add-menu button { appearance: none; cursor: pointer; width: 100%; text-align: left; background: transparent; border: 0; color: var(--fg); font: inherit; font-size: 12.5px; padding: 10px 12px; }
.pl-add-menu button:hover { background: var(--line); }
.pl-pop-enter-active, .pl-pop-leave-active { transition: opacity .12s, transform .12s; }
.pl-pop-enter-from, .pl-pop-leave-to { opacity: 0; transform: translateY(4px); }
</style>
