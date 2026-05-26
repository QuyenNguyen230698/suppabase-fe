<template>
  <div
    class="convo"
    :data-active="active"
    :title="conv.summary || ''"
    @click="$emit('click')"
    @contextmenu.prevent="openMenu"
  >
    <span class="convo-dot" :class="conv.source"></span>

    <!-- Inline rename -->
    <input
      v-if="renaming"
      ref="renameInput"
      v-model="renameValue"
      class="convo-rename"
      @click.stop
      @keydown.enter="commitRename"
      @keydown.escape="cancelRename"
      @blur="commitRename"
    />
    <span v-else class="convo-title-wrap">
      <span class="convo-title" @dblclick.stop="startRename">{{ conv.title || t('convo.untitled') }}</span>
      <span v-if="conv.tags?.length" class="convo-tags">
        <span
          v-for="tag in conv.tags.slice(0, 2)"
          :key="tag.id"
          class="convo-tag"
          :class="`tag-${tag.color || 'gray'}`"
        >{{ tag.name }}</span>
        <span v-if="conv.tags.length > 2" class="convo-tag tag-more">+{{ conv.tags.length - 2 }}</span>
      </span>
    </span>

    <!-- Inline icons (visible on hover) -->
    <span v-if="conv.starred" class="convo-flag" :title="t('convo.starred')">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>
    </span>

    <button ref="menuBtn" class="convo-menu" @click.stop="openMenuFromButton" :title="t('common.more')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
    </button>

    <!-- Context menu (teleported) -->
    <Teleport to="body">
      <div
        v-if="menuOpen"
        class="convo-context-menu"
        :style="menuStyle"
        ref="menuEl"
        @click.stop
      >
        <button class="cm-item" @click="emitAction('pin')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-2-7H7l-2 7z"/><line x1="9" y1="10" x2="9" y2="4"/><line x1="15" y1="10" x2="15" y2="4"/></svg>
          {{ conv.pinned ? t('convo.unpin') : t('convo.pin') }}
        </button>
        <button class="cm-item" @click="emitAction('star')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {{ conv.starred ? t('convo.unstar') : t('convo.star') }}
        </button>
        <button class="cm-item" @click="startRename">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          {{ t('convo.rename') }}
        </button>
        <button class="cm-item" @click="emitAction('share')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          {{ t('convo.share') }}
        </button>
        <button class="cm-item" @click="emitAction('move')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          {{ t('convo.moveToProject') }}
        </button>
        <button class="cm-item" @click="emitAction('tags')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          {{ t('convo.tags') }}
        </button>
        <button class="cm-item" @click="emitAction('archive')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          {{ conv.archived ? t('convo.unarchive') : t('convo.archive') }}
        </button>
        <div class="cm-sep" />
        <button class="cm-item danger" @click="emitAction('delete')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          {{ t('common.delete') }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const props = defineProps({
  conv:   { type: Object, required: true },
  active: { type: Boolean, default: false },
})
const emit = defineEmits(['click', 'action'])
const { t } = useI18n()

// ── Inline rename ───────────────────────────────────────────
const renaming    = ref(false)
const renameValue = ref('')
const renameInput = ref(null)

function startRename() {
  closeMenu()
  renameValue.value = props.conv.title || ''
  renaming.value = true
  nextTick(() => renameInput.value?.focus())
}

function cancelRename() {
  renaming.value = false
}

function commitRename() {
  if (!renaming.value) return
  const newTitle = renameValue.value.trim()
  renaming.value = false
  if (newTitle && newTitle !== props.conv.title) {
    emit('action', { type: 'rename', value: newTitle })
  }
}

// ── Context menu (fixed-position teleport) ──────────────────
const menuOpen = ref(false)
const menuEl   = ref(null)
const menuBtn  = ref(null)
const menuPos  = ref({ x: 0, y: 0 })

// Menu dimensions used for viewport clamping. Keep in sync with CSS .convo-context-menu.
// 8 items × 32px (incl. padding) + 1 separator (8px) + container padding (10px) ≈ 274px.
// Add 20px breathing room so nothing gets visually clipped.
const MENU_W = 200
const MENU_H = 300

const menuStyle = computed(() => ({
  position: 'fixed',
  left: `${menuPos.value.x}px`,
  top:  `${menuPos.value.y}px`,
  zIndex: 1200,
}))

// Clamp a target rect so the menu never escapes the viewport. Prefer anchoring
// to the right edge of the trigger but flip leftward when there isn't room.
function placeMenu({ x, y }) {
  const margin = 8
  const maxX = window.innerWidth  - MENU_W - margin
  const maxY = window.innerHeight - MENU_H - margin
  menuPos.value = {
    x: Math.max(margin, Math.min(x, maxX)),
    y: Math.max(margin, Math.min(y, maxY)),
  }
}

// Right-click handler — anchor menu at cursor.
function openMenu(e) {
  const x = (e?.clientX ?? 0) + 2
  const y = (e?.clientY ?? 0) + 2
  placeMenu({ x, y })
  menuOpen.value = true
}

// "…" button click — anchor menu to the button so it stays inside the sidebar.
function openMenuFromButton() {
  const btn = menuBtn.value
  if (!btn) { placeMenu({ x: 200, y: 200 }); menuOpen.value = true; return }
  const r = btn.getBoundingClientRect()
  // Prefer dropping the menu below-left of the button (right edge aligned)
  // so the menu fits comfortably inside the sidebar column.
  let x = r.right - MENU_W
  let y = r.bottom + 4
  // If that pushes off the top of the screen for some reason, fall back to below.
  if (y + MENU_H > window.innerHeight - 8) y = r.top - MENU_H - 4
  placeMenu({ x, y })
  menuOpen.value = true
}

function closeMenu() {
  menuOpen.value = false
}

function emitAction(act) {
  closeMenu()
  emit('action', { type: act })
}

function onDocClick(e) {
  if (!menuOpen.value) return
  if (menuEl.value && menuEl.value.contains(e.target)) return
  closeMenu()
}
function onEsc(e) { if (e.key === 'Escape') closeMenu() }

onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onEsc)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onEsc)
})
</script>

<style scoped>
.convo {
  position: relative;
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px;
  margin: 1px 0;
  border-radius: 7px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--fg-dim);
  transition: background .12s, color .12s;
}
.convo:hover { background: rgba(255,255,255,0.04); color: var(--fg); }
.convo[data-active="true"] {
  background: rgba(255,255,255,0.06);
  color: var(--fg);
}

.convo-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--fg-faint);
  flex-shrink: 0;
}
.convo-dot.pro  { background: #d8ff5b; }
.convo-dot.chat { background: #6ab7ff; }

.convo-title-wrap {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 2px;
}
.convo-title {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.convo-tags {
  display: flex; gap: 3px;
  overflow: hidden;
}
.convo-tag {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.02em;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.04);
  color: var(--fg-mute);
  flex-shrink: 0;
}
.convo-tag.tag-gray   { background: rgba(148,163,184,0.10); color: #94a3b8; }
.convo-tag.tag-indigo { background: rgba(129,140,248,0.13); color: #818cf8; }
.convo-tag.tag-amber  { background: rgba(251,191,36,0.13);  color: #fbbf24; }
.convo-tag.tag-pink   { background: rgba(244,114,182,0.13); color: #f472b6; }
.convo-tag.tag-cyan   { background: rgba(34,211,238,0.13);  color: #22d3ee; }
.convo-tag.tag-green  { background: rgba(74,222,128,0.13);  color: #4ade80; }
.convo-tag.tag-blue   { background: rgba(96,165,250,0.13);  color: #60a5fa; }
.convo-tag.tag-purple { background: rgba(167,139,250,0.13); color: #a78bfa; }
.convo-tag.tag-orange { background: rgba(251,146,60,0.13);  color: #fb923c; }
.convo-tag.tag-teal   { background: rgba(45,212,191,0.13);  color: #2dd4bf; }
.convo-tag.tag-red    { background: rgba(248,113,113,0.13); color: #f87171; }
.convo-tag.tag-more   { background: rgba(255,255,255,0.04); color: var(--fg-faint); }
.convo-rename {
  flex: 1; min-width: 0;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(216,255,91,0.35);
  border-radius: 4px;
  color: var(--fg);
  padding: 2px 6px;
  font-size: 12.5px;
  outline: 0;
}

.convo-flag {
  color: #ffb84d;
  display: inline-flex;
}

.convo-menu {
  background: transparent; border: 0;
  color: var(--fg-mute);
  width: 20px; height: 20px;
  border-radius: 4px;
  cursor: pointer;
  display: none;
  place-items: center;
  flex-shrink: 0;
}
.convo:hover .convo-menu,
.convo[data-active="true"] .convo-menu { display: grid; }
.convo-menu:hover { color: var(--fg); background: rgba(255,255,255,0.06); }

/* Context menu */
.convo-context-menu {
  width: 200px;
  /* Fit all 8 items + separator without clipping. Scroll only kicks in if a
     future item count exceeds this. Keep in sync with MENU_H in <script>. */
  max-height: 300px;
  overflow-y: auto;
  background: #18181b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 9px;
  padding: 5px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3);
}
.cm-item {
  display: flex; align-items: center; gap: 9px;
  width: 100%;
  background: transparent; border: 0;
  color: #cbd5e1;
  text-align: left;
  padding: 7px 9px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background .1s, color .1s;
}
.cm-item:hover { background: rgba(255,255,255,0.06); color: #ededec; }
.cm-item.danger { color: #f87171; }
.cm-item.danger:hover { background: rgba(239,68,68,0.1); color: #fca5a5; }
.cm-sep {
  height: 1px;
  background: rgba(255,255,255,0.07);
  margin: 4px 2px;
}

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .convo {
    padding: 6px 8px;
    font-size: 12px;
  }
  .convo-menu {
    width: 18px; height: 18px;
  }
}

@media (max-width: 768px) {
  .convo {
    padding: 9px 10px;
    font-size: 13px;
    min-height: 40px;
  }
  /* Always show the menu button on mobile — no hover state on touch */
  .convo-menu {
    display: grid;
    width: 28px; height: 28px;
  }
  /* Hide secondary tag info to keep the row clean */
  .convo-tags { display: none; }
  .convo-flag { display: none; }
  /* Context menu: full-width on very small screens */
  .convo-context-menu {
    width: min(200px, 90vw);
  }
  .cm-item {
    padding: 10px 9px;
    font-size: 13px;
  }
}
</style>
