<template>
  <div class="db-shell">
    <!-- Palette -->
    <aside class="db-palette">
      <div class="db-palette-head">
        <h3>Components</h3>
        <p>Drag blocks onto the canvas</p>
      </div>
      <div class="db-palette-grid">
        <div
          v-for="proto in PALETTE"
          :key="proto.type"
          class="db-proto"
          draggable="true"
          @dragstart="onPaletteDragStart($event, proto)"
        >
          <span class="db-proto-ic" v-html="proto.icon" />
          <span class="db-proto-lbl">{{ proto.label }}</span>
        </div>
      </div>
    </aside>

    <!-- Canvas -->
    <main class="db-canvas-wrap">
      <div class="db-toolbar">
        <div class="db-toolbar-left">
          <DsBadge>{{ blocks.length }} blocks</DsBadge>
          <span class="db-toolbar-info" v-if="lastSavedAt">Saved at {{ lastSavedAt }}</span>
        </div>
        <div class="db-toolbar-right">
          <DsButton variant="ghost" size="sm" @click="exportJson">Export JSON</DsButton>
          <DsButton variant="ghost" size="sm" @click="resetCanvas">Clear all</DsButton>
          <DsButton variant="primary" size="sm" @click="saveLocal">Save</DsButton>
        </div>
      </div>

      <div
        class="db-canvas"
        :class="{ dragover: dragHoverCanvas }"
        @dragover.prevent="onCanvasDragOver"
        @dragleave="dragHoverCanvas = false"
        @drop.prevent="onCanvasDrop"
        @click.self="selectedId = null"
      >
        <div v-if="!blocks.length" class="db-empty">
          <p>Drag a component from the left panel to start.</p>
        </div>

        <div
          v-for="b in blocks"
          :key="b.id"
          class="db-block-wrap"
          :class="{ selected: selectedId === b.id }"
          :style="blockWrapStyle(b)"
          @click.stop="selectedId = b.id"
          draggable="true"
          @dragstart="onBlockDragStart($event, b)"
        >
          <BuilderBlock :block="b" />
          <button class="db-block-del" @click.stop="removeBlock(b.id)" title="Remove">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    </main>

    <!-- Properties -->
    <aside class="db-props">
      <div class="db-palette-head">
        <h3>Properties</h3>
        <p v-if="!selected">Select a block to edit</p>
        <p v-else>{{ selected.type }} · {{ selected.id.slice(0, 6) }}</p>
      </div>

      <div v-if="selected" class="db-props-body">
        <label v-if="'text' in selected.props" class="db-field">
          <span>Text</span>
          <input v-model="selected.props.text" type="text" />
        </label>

        <label v-if="'placeholder' in selected.props" class="db-field">
          <span>Placeholder</span>
          <input v-model="selected.props.placeholder" type="text" />
        </label>

        <label v-if="'src' in selected.props" class="db-field">
          <span>Image URL</span>
          <input v-model="selected.props.src" type="text" placeholder="https://…" />
        </label>

        <label v-if="'color' in selected.props" class="db-field">
          <span>Text color</span>
          <input v-model="selected.props.color" type="color" />
        </label>

        <label v-if="'bg' in selected.props" class="db-field">
          <span>Background</span>
          <input v-model="selected.props.bg" type="color" />
        </label>

        <label v-if="'fontSize' in selected.props" class="db-field">
          <span>Font size (px)</span>
          <input v-model.number="selected.props.fontSize" type="number" min="10" max="96" />
        </label>

        <div class="db-field-row">
          <label class="db-field">
            <span>W (px)</span>
            <input v-model.number="selected.layout.w" type="number" min="40" />
          </label>
          <label class="db-field">
            <span>H (px)</span>
            <input v-model.number="selected.layout.h" type="number" min="20" />
          </label>
        </div>
        <div class="db-field-row">
          <label class="db-field">
            <span>X (px)</span>
            <input v-model.number="selected.layout.x" type="number" />
          </label>
          <label class="db-field">
            <span>Y (px)</span>
            <input v-model.number="selected.layout.y" type="number" />
          </label>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
const STORAGE_KEY = 'sb_design_builder_v1'

const PALETTE = [
  { type: 'text',   label: 'Text',   icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7V5h16v2M9 5v14M15 19h-6"/></svg>' },
  { type: 'heading',label: 'Heading',icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 5v14M14 5v14M4 12h10M18 8l3-2v13"/></svg>' },
  { type: 'button', label: 'Button', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="8" width="18" height="8" rx="2"/></svg>' },
  { type: 'input',  label: 'Input',  icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 12h2"/></svg>' },
  { type: 'card',   label: 'Card',   icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6"/></svg>' },
  { type: 'image',  label: 'Image',  icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5L5 21"/></svg>' },
]

function defaultsFor(type) {
  switch (type) {
    case 'text':    return { props: { text: 'Lorem ipsum dolor sit amet.', color: '#ededec', fontSize: 14 }, layout: { w: 260, h: 64 } }
    case 'heading': return { props: { text: 'Heading', color: '#ededec', fontSize: 28 }, layout: { w: 320, h: 56 } }
    case 'button':  return { props: { text: 'Button', color: '#0b0b0c', bg: '#d8ff5b', fontSize: 13 }, layout: { w: 140, h: 40 } }
    case 'input':   return { props: { placeholder: 'Type something…', color: '#ededec', bg: '#1a1a1e' }, layout: { w: 260, h: 40 } }
    case 'card':    return { props: { text: 'Card content', color: '#ededec', bg: '#131316' }, layout: { w: 320, h: 160 } }
    case 'image':   return { props: { src: 'https://placehold.co/320x180/131316/ededec/png?text=Image' }, layout: { w: 320, h: 180 } }
    default:        return { props: {}, layout: { w: 200, h: 80 } }
  }
}

const blocks = ref([])
const selectedId = ref(null)
const dragHoverCanvas = ref(false)
const lastSavedAt = ref('')

const selected = computed(() => blocks.value.find(b => b.id === selectedId.value) || null)

function blockWrapStyle(b) {
  return {
    left: `${b.layout.x}px`,
    top:  `${b.layout.y}px`,
    width: `${b.layout.w}px`,
    height: `${b.layout.h}px`,
  }
}

function uid() { return Math.random().toString(36).slice(2, 10) }

function onPaletteDragStart(e, proto) {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('application/x-db-palette', proto.type)
}

function onBlockDragStart(e, block) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('application/x-db-block', JSON.stringify({
    id: block.id,
    offsetX: e.offsetX,
    offsetY: e.offsetY,
  }))
}

function onCanvasDragOver(e) {
  e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-db-block') ? 'move' : 'copy'
  dragHoverCanvas.value = true
}

function onCanvasDrop(e) {
  dragHoverCanvas.value = false
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const palette = e.dataTransfer.getData('application/x-db-palette')
  if (palette) {
    const def = defaultsFor(palette)
    const block = {
      id: uid(),
      type: palette,
      props: def.props,
      layout: { x: Math.max(0, x - def.layout.w / 2), y: Math.max(0, y - def.layout.h / 2), w: def.layout.w, h: def.layout.h },
    }
    blocks.value.push(block)
    selectedId.value = block.id
    return
  }

  const moveRaw = e.dataTransfer.getData('application/x-db-block')
  if (moveRaw) {
    const { id, offsetX, offsetY } = JSON.parse(moveRaw)
    const b = blocks.value.find(it => it.id === id)
    if (b) {
      b.layout.x = Math.max(0, x - offsetX)
      b.layout.y = Math.max(0, y - offsetY)
    }
  }
}

function removeBlock(id) {
  blocks.value = blocks.value.filter(b => b.id !== id)
  if (selectedId.value === id) selectedId.value = null
}

function resetCanvas() {
  blocks.value = []
  selectedId.value = null
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks.value))
  lastSavedAt.value = new Date().toLocaleTimeString()
  useToast().show('Canvas saved to localStorage', 'success')
}

function exportJson() {
  const json = JSON.stringify(blocks.value, null, 2)
  navigator.clipboard?.writeText(json).then(
    () => useToast().show('JSON copied to clipboard', 'success'),
    () => useToast().show('Copy failed, logged to console', 'warning'),
  )
  // eslint-disable-next-line no-console
  console.log('[design-builder] export', json)
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) blocks.value = JSON.parse(raw)
  } catch {}
})
</script>

<style scoped>
.db-shell {
  display: grid;
  grid-template-columns: 220px 1fr 260px;
  height: calc(100vh - 48px);
  background: var(--bg);
  color: var(--fg);
  min-height: 0;
}

/* Palette */
.db-palette,
.db-props {
  background: var(--bg-elev);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.db-props { border-right: 0; border-left: 1px solid var(--line); }

.db-palette-head {
  padding: 14px 14px 12px;
  border-bottom: 1px solid var(--line);
}
.db-palette-head h3 {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-dim);
}
.db-palette-head p {
  margin: 0;
  font-size: 11px;
  color: var(--fg-mute);
}

.db-palette-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
}
.db-proto {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px;
  border: 1px dashed var(--line-2);
  border-radius: 10px;
  background: var(--bg-elev-2);
  cursor: grab;
  font-size: 11px;
  color: var(--fg-dim);
  transition: border-color .12s, background .12s, color .12s;
  user-select: none;
}
.db-proto:hover {
  border-color: color-mix(in oklab, var(--accent) 40%, transparent);
  background: color-mix(in oklab, var(--accent) 6%, transparent);
  color: var(--accent);
}
.db-proto:active { cursor: grabbing; }
.db-proto-ic { color: inherit; }

/* Canvas */
.db-canvas-wrap { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.db-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  height: 44px;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
  background: var(--bg-elev);
  flex-shrink: 0;
}
.db-toolbar-left, .db-toolbar-right { display: flex; align-items: center; gap: 8px; }
.db-toolbar-info { font-size: 11px; color: var(--fg-mute); }

.db-canvas {
  position: relative;
  flex: 1;
  overflow: auto;
  background:
    linear-gradient(var(--line) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(90deg, var(--line) 1px, transparent 1px) 0 0 / 24px 24px,
    var(--bg);
  transition: background-color .12s;
}
.db-canvas.dragover { background-color: color-mix(in oklab, var(--accent) 4%, transparent); }
.db-empty {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  color: var(--fg-mute);
  font-size: 13px;
  pointer-events: none;
}

.db-block-wrap {
  position: absolute;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: grab;
}
.db-block-wrap:hover { border-color: var(--line-2); }
.db-block-wrap.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 14%, transparent);
}
.db-block-wrap:active { cursor: grabbing; }

.db-block-del {
  position: absolute; top: -10px; right: -10px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-elev);
  border: 1px solid color-mix(in oklab, var(--danger) 40%, transparent);
  color: var(--danger);
  display: none; place-items: center;
  cursor: pointer;
}
.db-block-wrap.selected .db-block-del,
.db-block-wrap:hover .db-block-del { display: grid; }

/* Properties */
.db-props-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.db-field { display: flex; flex-direction: column; gap: 4px; }
.db-field > span {
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--fg-mute);
}
.db-field input {
  background: var(--bg-elev-2);
  border: 1px solid var(--line-2);
  border-radius: 7px;
  height: 30px;
  padding: 0 8px;
  color: var(--fg);
  font-size: 12px;
  outline: none;
  transition: border-color .12s;
}
.db-field input:focus { border-color: color-mix(in oklab, var(--accent) 50%, transparent); }
.db-field input[type="color"] { padding: 2px; height: 30px; cursor: pointer; }
.db-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

/* ── Tablet ── */
@media (max-width: 1024px) {
  .db-shell {
    grid-template-columns: 180px 1fr 220px;
  }
  .db-palette-item { padding: 6px 8px; font-size: 11px; }
  .db-props-body { padding: 10px; gap: 8px; }
  .db-toolbar { padding: 6px 10px; gap: 6px; }
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .db-shell {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .db-palette {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--line);
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 8px;
    gap: 8px;
    flex-shrink: 0;
  }
  .db-palette-section { min-width: max-content; }
  .db-palette-grid {
    display: flex;
    flex-direction: row;
    gap: 6px;
  }

  .db-canvas-wrap {
    flex: 1;
    min-height: 300px;
    width: 100%;
  }
  .db-canvas { overflow: auto; -webkit-overflow-scrolling: touch; }
  .db-toolbar {
    padding: 6px 10px;
    gap: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
  }

  .db-props {
    width: 100%;
    height: auto;
    max-height: 40vh;
    border-left: none;
    border-top: 1px solid var(--line);
    overflow-y: auto;
    flex-shrink: 0;
  }
  .db-props-body { padding: 10px; gap: 8px; }
  .db-field-row { grid-template-columns: 1fr 1fr; gap: 6px; }
}
</style>
