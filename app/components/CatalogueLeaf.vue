<script setup>
/* One page of the flipbook. Two kinds:
   • image    → a single page image (CDN), or a placeholder if no URL yet
   • material → a self-built HTML grid of swatch cells (1..3 cols), each with a
                (+) hotspot that calls onItem(item) to open the detail popup.
   pg = leaf descriptor from buildPages(). */
import { computed } from 'vue'
import { normalizeItem } from '~/composables/useCatalogues'

const props = defineProps({
  pg: { type: Object, default: null },
  onItem: { type: Function, default: null },   // (item) => void
})

const cols = computed(() => Math.min(3, Math.max(1, props.pg?.material?.cols || 3)))
function swatchOf(it) { return normalizeItem(it).swatch }
</script>

<template>
  <!-- blank facing page -->
  <div v-if="!pg" class="page page-blank" />

  <!-- MATERIAL grid page -->
  <div v-else-if="pg.kind === 'material'" class="page page-material">
    <div class="mt-head">
      <span class="mt-tag">{{ pg.material.theme }}</span>
      <span v-if="pg.material.sub" class="mt-sub">{{ pg.material.sub }}</span>
    </div>
    <div class="mt-grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
      <button
        v-for="(it, i) in pg.material.items"
        :key="it.code || i"
        class="mt-cell"
        :disabled="!onItem"
        @click="onItem && onItem(it)"
      >
        <span class="mt-swatch">
          <img v-if="swatchOf(it)" :src="swatchOf(it)" :alt="it.name" draggable="false" loading="lazy" />
          <span class="mt-plus" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </span>
        </span>
        <span class="mt-cap">
          <span class="mt-code">{{ it.code }}</span>
          <span class="mt-name">{{ it.name }}</span>
          <span v-if="it.new" class="mt-new">NEW</span>
        </span>
      </button>
    </div>
    <div class="mt-foot">AN CƯỜNG LAMINATE KINGDOM TREND COLLECTION</div>
  </div>

  <!-- IMAGE page (real CDN) -->
  <div v-else-if="pg.src" class="page">
    <img :src="pg.src" :alt="`Trang ${pg.num}`" class="page-img" draggable="false" loading="lazy" />
  </div>

  <!-- placeholder image page -->
  <div v-else class="page page-ph">
    <div class="ph-mark">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
    </div>
    <div class="ph-num">Trang {{ pg.num }}</div>
    <div class="ph-hint">Chưa có ảnh CDN</div>
  </div>
</template>

<style scoped>
.page {
  width: 100%; height: 100%;
  background: #fff; overflow: hidden; position: relative;
  container-type: inline-size;
}
.page-blank { background: var(--bg-elev); }
.page-img { width: 100%; height: 100%; object-fit: cover; display: block; background: #fff; }

/* Placeholder */
.page-ph { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  background: repeating-linear-gradient(45deg, #f4f4f5, #f4f4f5 12px, #eeeef0 12px, #eeeef0 24px); color: #9a9aa2; }
.ph-mark { opacity: .6; }
.ph-num { font-size: 14px; font-weight: 700; color: #6b6b73; }
.ph-hint { font-family: var(--font-mono); font-size: 10px; letter-spacing: .05em; color: #a0a0a8; }

/* ── Material grid page ── */
.page-material { color: #1a1a1c; padding: 5% 5% 3.5%; display: flex; flex-direction: column; }
.mt-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4%; }
.mt-tag { font-size: clamp(12px,2.2cqw,20px); font-weight: 600; color: #fff; background: #93a39a; padding: 5px 16px; border-radius: 4px; }
.mt-sub { font-size: clamp(11px,1.9cqw,17px); font-weight: 700; color: #8a9a90; }
.mt-grid { flex: 1; min-height: 0; display: grid; grid-auto-rows: 1fr; gap: 4% 5%; }
.mt-cell { display: flex; flex-direction: column; gap: 7px; min-height: 0; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; font: inherit; color: inherit; }
.mt-cell[disabled] { cursor: default; }
.mt-swatch { flex: 1; min-height: 0; position: relative; border-radius: 2px; overflow: hidden; display: grid; place-items: center; box-shadow: inset 0 0 0 1px rgba(0,0,0,.06); }
.mt-swatch img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.mt-plus { position: relative; z-index: 1; width: clamp(28px,5cqw,40px); height: clamp(28px,5cqw,40px); border-radius: 50%; background: rgba(255,255,255,.92); color: #1a1a1c; display: grid; place-items: center; box-shadow: 0 3px 12px rgba(0,0,0,.28); transition: transform .15s, background .15s; }
.mt-cell:not([disabled]):hover .mt-plus { transform: scale(1.1); background: #fff; }
.mt-cell:not([disabled]):hover .mt-swatch { box-shadow: inset 0 0 0 2px rgba(0,0,0,.16), 0 6px 16px rgba(0,0,0,.16); }
.mt-cap { display: flex; flex-direction: column; line-height: 1.25; }
.mt-code { font-size: clamp(9px,1.5cqw,13px); font-weight: 700; color: #2a2a2e; }
.mt-name { font-size: clamp(8px,1.25cqw,11px); color: #777; text-transform: uppercase; letter-spacing: .02em; }
.mt-new { align-self: flex-start; margin-top: 4px; font-size: 8px; font-weight: 700; letter-spacing: .05em; color: #5a6b7a; background: #e6edf2; padding: 1px 6px; border-radius: 3px; }
.mt-foot { margin-top: 3.5%; text-align: center; font-size: clamp(7px,1.1cqw,10px); letter-spacing: .14em; color: #b8b8be; text-transform: uppercase; }
</style>
