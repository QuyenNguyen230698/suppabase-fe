<script setup>
/* Modal to edit ONE material item in full: gallery images, basic + custom
   specs, and custom action buttons. A live preview of the real popup updates
   as you type. Edits the passed item in place (reactive) and persists on save.
   v-model:open controls visibility. */
import { reactive, watch, computed } from 'vue'
import { useCatalogueStore, DEFAULT_ACTIONS } from '~/composables/useCatalogues'

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },   // the raw item object from the store
})
const emit = defineEmits(['update:open'])
const store = useCatalogueStore()

/* Working copy (so cancel discards). Seeded from the item when opened. */
const form = reactive({ code: '', name: '', new: false, desc: '', images: [], specs: [], actions: [] })

watch(() => [props.open, props.item], () => {
  if (!props.open || !props.item) return
  const it = props.item
  form.code = it.code || ''
  form.name = it.name || ''
  form.new = !!it.new
  form.desc = it.desc || ''
  form.images = Array.isArray(it.images) && it.images.length
    ? [...it.images]
    : [it.swatch, ...(it.rooms || [])].filter(Boolean)
  if (!form.images.length) form.images = ['']
  form.specs = Array.isArray(it.specs) && it.specs.length
    ? it.specs.map(s => [...s])
    : [
        ...(it.size ? [['Kích thước', it.size]] : []),
        ...(it.edge ? [['Chỉ dán cạnh đồng màu', it.edge]] : []),
        ...(it.finish ? [['Bề mặt', it.finish]] : []),
      ]
  form.actions = Array.isArray(it.actions) && it.actions.length
    ? it.actions.map(a => ({ ...a }))
    : DEFAULT_ACTIONS.map(a => ({ ...a }))
}, { immediate: true })

/* Live preview reads the working form directly. */
const previewItem = computed(() => ({
  code: form.code, name: form.name, new: form.new, desc: form.desc,
  images: form.images.filter(Boolean), specs: form.specs.filter(s => s[0] || s[1]), actions: form.actions.filter(a => a.label),
}))

function addImage() { form.images.push('') }
function removeImage(i) { form.images.splice(i, 1); if (!form.images.length) form.images = [''] }
function moveImage(i, d) { const j = i + d; if (j < 0 || j >= form.images.length) return;[form.images[i], form.images[j]] = [form.images[j], form.images[i]] }
function setImage(i, v) { form.images[i] = v }

function addSpec() { form.specs.push(['', '']) }
function removeSpec(i) { form.specs.splice(i, 1) }

function addAction() { form.actions.push({ label: '', href: '' }) }
function removeAction(i) { form.actions.splice(i, 1) }

function save() {
  const it = props.item
  it.code = form.code.trim()
  it.name = form.name.trim()
  it.new = form.new
  it.desc = form.desc.trim()
  it.images = form.images.filter(Boolean)
  it.specs = form.specs.filter(s => s[0] || s[1]).map(s => [s[0], s[1]])
  it.actions = form.actions.filter(a => a.label.trim()).map(a => ({ label: a.label.trim(), href: (a.href || '').trim() }))
  // Drop legacy fields now folded into images/specs.
  delete it.swatch; delete it.rooms; delete it.size; delete it.edge; delete it.finish
  store.persist()
  emit('update:open', false)
}
function close() { emit('update:open', false) }
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="mpe-bg" @click.self="close">
      <div class="mpe">
        <div class="mpe-head">
          <h3>Sửa popup vật liệu</h3>
          <button class="mpe-x" @click="close" aria-label="Đóng"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </div>

        <div class="mpe-body">
          <!-- Form -->
          <div class="mpe-form">
            <div class="g2">
              <label class="f"><span>Mã</span><input v-model="form.code" type="text" placeholder="LK 2001 E" /></label>
              <label class="f"><span>Tên</span><input v-model="form.name" type="text" placeholder="Light Elm" /></label>
            </div>
            <label class="chk"><input v-model="form.new" type="checkbox" /> Đánh dấu NEW</label>
            <label class="f"><span>Mô tả (tùy chọn)</span><textarea v-model="form.desc" rows="2" placeholder="Mô tả ngắn về vật liệu…" /></label>

            <div class="grp">
              <div class="grp-h"><span>Thư viện ảnh (ảnh đầu = swatch)</span><button class="add" @click="addImage">+ Ảnh</button></div>
              <div v-for="(img, i) in form.images" :key="i" class="img-row">
                <span class="img-no">{{ i === 0 ? 'Swatch' : i }}</span>
                <ImageField :model-value="img" ratio="1 / 1" @update:model-value="setImage(i, $event)" />
                <div class="img-tools">
                  <button class="mini" @click="moveImage(i, -1)" :disabled="i === 0">↑</button>
                  <button class="mini" @click="moveImage(i, 1)" :disabled="i === form.images.length - 1">↓</button>
                  <button class="mini danger" @click="removeImage(i)">×</button>
                </div>
              </div>
            </div>

            <div class="grp">
              <div class="grp-h"><span>Thông số</span><button class="add" @click="addSpec">+ Dòng</button></div>
              <div v-for="(s, i) in form.specs" :key="i" class="inline">
                <input v-model="s[0]" type="text" class="grow" placeholder="Nhãn (Kích thước)" />
                <input v-model="s[1]" type="text" class="grow" placeholder="Giá trị (1220*2440*0.8mm)" />
                <button class="del" @click="removeSpec(i)">×</button>
              </div>
              <p v-if="!form.specs.length" class="empty">Chưa có thông số.</p>
            </div>

            <div class="grp">
              <div class="grp-h"><span>Nút hành động</span><button class="add" @click="addAction">+ Nút</button></div>
              <div v-for="(a, i) in form.actions" :key="i" class="inline">
                <input v-model="a.label" type="text" class="grow" placeholder="Nhãn nút (Tải Fullsheet)" />
                <input v-model="a.href" type="text" class="grow" placeholder="Link (tùy chọn)" />
                <button class="del" @click="removeAction(i)">×</button>
              </div>
              <p v-if="!form.actions.length" class="empty">Chưa có nút.</p>
            </div>
          </div>

          <!-- Live preview -->
          <div class="mpe-preview">
            <div class="pv-label">Xem trước popup</div>
            <div class="pv-frame">
              <MaterialPopupView :item="previewItem" embed />
            </div>
          </div>
        </div>

        <div class="mpe-foot">
          <button class="mpe-btn ghost" @click="close">Hủy</button>
          <button class="mpe-btn primary" @click="save">Xong</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.mpe-bg { position: fixed; inset: 0; z-index: 210; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; }
.mpe { width: 100%; max-width: 1040px; max-height: 92dvh; display: flex; flex-direction: column; background: var(--bg-elev); border: 1px solid var(--line-2); border-radius: 14px; box-shadow: 0 40px 100px rgba(0,0,0,.55); overflow: hidden; }
.mpe-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); }
.mpe-head h3 { margin: 0; font-size: 16px; font-weight: 700; }
.mpe-x { width: 32px; height: 32px; border-radius: 7px; background: transparent; border: 1px solid var(--line-2); color: var(--fg-mute); cursor: pointer; display: grid; place-items: center; }
.mpe-x:hover { color: var(--fg); }
.mpe-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
.mpe-form { min-height: 0; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; border-right: 1px solid var(--line); }
.mpe-preview { min-height: 0; overflow-y: auto; padding: 18px 20px; background: var(--bg); }
.pv-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--fg-faint); margin-bottom: 10px; }
.pv-frame { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--bg-elev); }

.f { display: flex; flex-direction: column; gap: 5px; }
.f > span { font-size: 11.5px; font-weight: 600; color: var(--fg-dim); }
.f input, .f textarea, .inline input, .img-row :deep(.if-url) { appearance: none; width: 100%; font: inherit; font-size: 13px; padding: 8px 10px; border-radius: 8px; background: var(--bg-elev-2); border: 1px solid var(--line-2); color: var(--fg); }
.f textarea { resize: vertical; }
.f input:focus, .f textarea:focus, .inline input:focus { outline: none; border-color: color-mix(in oklab, var(--accent) 55%, transparent); }
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.chk { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--fg-dim); }
.chk input { accent-color: var(--accent); }

.grp { border: 1px solid var(--line); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.grp-h { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; font-weight: 700; color: var(--fg-dim); }
.add { appearance: none; cursor: pointer; background: transparent; border: 1px solid var(--line-2); color: var(--accent); font: inherit; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 6px; }
.add:hover { background: color-mix(in oklab, var(--accent) 10%, transparent); }
.img-row { display: flex; align-items: flex-start; gap: 8px; }
.img-no { flex: none; width: 44px; font-size: 10px; color: var(--fg-mute); padding-top: 8px; }
.img-row :deep(.imgfield) { flex: 1; min-width: 0; }
.img-tools { display: flex; flex-direction: column; gap: 4px; }
.inline { display: flex; align-items: center; gap: 6px; }
.inline input.grow { flex: 1; min-width: 0; }
.mini { width: 24px; height: 24px; border-radius: 6px; background: transparent; border: 1px solid var(--line-2); color: var(--fg-mute); cursor: pointer; font-size: 13px; }
.mini:hover:not(:disabled) { color: var(--fg); }
.mini:disabled { opacity: .3; cursor: default; }
.mini.danger:hover, .del:hover { color: var(--danger); border-color: color-mix(in oklab, var(--danger) 40%, transparent); }
.del { flex: none; width: 26px; height: 26px; border-radius: 6px; background: transparent; border: 1px solid var(--line-2); color: var(--fg-mute); cursor: pointer; font-size: 15px; }
.empty { font-size: 12px; color: var(--fg-mute); margin: 0; }

.mpe-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--line); }
.mpe-btn { appearance: none; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; padding: 9px 18px; border-radius: 8px; }
.mpe-btn.ghost { background: transparent; border: 1px solid var(--line-2); color: var(--fg-mute); }
.mpe-btn.ghost:hover { color: var(--fg); }
.mpe-btn.primary { background: var(--accent); color: var(--accent-fg); border: 1px solid var(--accent); }
.mpe-btn.primary:hover { opacity: .9; }

.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 860px) {
  .mpe-body { grid-template-columns: 1fr; }
  .mpe-form { border-right: 0; border-bottom: 1px solid var(--line); }
}
</style>
