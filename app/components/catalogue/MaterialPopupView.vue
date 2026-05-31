<script setup>
/* Renders the material detail popup CONTENT (gallery + info + actions) from a
   normalized item. Reused by the flipbook popup AND the editor live preview.
   `embed` drops the modal chrome for use inside the editor preview pane. */
import { ref, computed, watch } from 'vue'
import { normalizeItem } from '~/composables/useCatalogues'

const props = defineProps({
  item: { type: Object, required: true },   // raw or normalized material item
  embed: { type: Boolean, default: false },
})
const m = computed(() => normalizeItem(props.item))
const active = ref(0)
watch(() => m.value.images.length, () => { if (active.value >= m.value.images.length) active.value = 0 })
</script>

<template>
  <div class="mp" :class="{ embed }">
    <!-- Gallery -->
    <div class="mp-gallery">
      <div class="mp-hero">
        <img v-if="m.images[active]" :src="m.images[active]" :alt="m.name" />
        <div v-else class="mp-empty">Chưa có ảnh</div>
      </div>
      <div class="mp-thumbs" v-if="m.images.length > 1 || m.images.length === 0">
        <button
          v-for="(img, i) in (m.images.length ? m.images : [''])"
          :key="i"
          class="mp-thumb"
          :class="{ active: active === i }"
          @click="active = i"
        >
          <img v-if="img" :src="img" alt="" />
          <span v-else>—</span>
        </button>
      </div>
    </div>

    <!-- Info -->
    <div class="mp-info">
      <div class="mp-info-left">
        <h3 class="mp-code">{{ m.code || '—' }}</h3>
        <div class="mp-name">{{ m.name }}</div>
        <p v-if="m.desc" class="mp-desc">{{ m.desc }}</p>
        <dl v-if="m.specs.length" class="mp-spec">
          <div v-for="([k, v]) in m.specs" :key="k" class="mp-spec-row"><dt>{{ k }}:</dt><dd>{{ v }}</dd></div>
        </dl>
      </div>
      <div class="mp-actions">
        <component
          :is="a.href ? 'a' : 'button'"
          v-for="(a, i) in m.actions"
          :key="i"
          class="mp-act"
          :href="a.href || undefined"
          :target="a.href ? '_blank' : undefined"
          rel="noopener"
        >{{ a.label }}</component>
        <div class="mp-foot">Trung tâm Dịch vụ Khách hàng <a href="#" @click.prevent>Liên hệ ngay</a></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mp-gallery { display: grid; grid-template-columns: 1fr 92px; gap: 12px; padding: 22px 22px 0; }
.mp.embed .mp-gallery { padding: 16px 16px 0; grid-template-columns: 1fr 70px; }
.mp-hero { aspect-ratio: 16 / 10; border-radius: 8px; overflow: hidden; border: 1px solid var(--line); background: var(--bg-elev-2); display: grid; place-items: center; }
.mp-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mp-empty { color: var(--fg-faint); font-size: 12px; }
.mp-thumbs { display: flex; flex-direction: column; gap: 10px; max-height: 280px; overflow-y: auto; }
.mp-thumb { aspect-ratio: 4 / 3; border-radius: 6px; overflow: hidden; border: 2px solid var(--line-2); background: var(--bg-elev-2); cursor: pointer; padding: 0; display: grid; place-items: center; color: var(--fg-faint); }
.mp-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mp-thumb.active { border-color: var(--accent); }

.mp-info { display: grid; grid-template-columns: 1.3fr 1fr; gap: 28px; padding: 22px; margin-top: 18px; background: var(--bg-elev-2); border-top: 1px solid var(--line); }
.mp.embed .mp-info { padding: 16px; gap: 18px; margin-top: 14px; }
.mp-code { font-size: 26px; font-weight: 700; letter-spacing: .5px; margin: 0; }
.mp.embed .mp-code { font-size: 20px; }
.mp-name { font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: var(--fg-dim); margin: 2px 0 14px; }
.mp-desc { font-size: 12.5px; color: var(--fg-dim); line-height: 1.5; margin: 0 0 14px; }
.mp-spec { display: flex; flex-direction: column; gap: 7px; margin: 0; }
.mp-spec-row { display: flex; gap: 8px; font-size: 13px; }
.mp-spec-row dt { color: var(--fg-mute); flex: none; }
.mp-spec-row dd { color: var(--fg); margin: 0; }
.mp-actions { display: flex; flex-direction: column; gap: 10px; justify-content: center; }
.mp-act { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 12px 16px; border-radius: 8px; cursor: pointer; font: inherit; font-size: 13.5px; font-weight: 600; text-decoration: none; background: #16161a; color: #fff; border: 1px solid var(--line-2); transition: background .15s, transform .12s; }
.mp-act:hover { transform: translateY(-1px); background: #222228; }
.mp-foot { margin-top: 6px; font-size: 12px; color: var(--fg-mute); text-align: center; }
.mp-foot a { color: var(--accent); text-decoration: underline; }

@media (max-width: 720px) {
  .mp-gallery { grid-template-columns: 1fr; }
  .mp-thumbs { flex-direction: row; }
  .mp-thumb { width: 72px; flex: none; }
  .mp-info { grid-template-columns: 1fr; gap: 18px; }
}
</style>
