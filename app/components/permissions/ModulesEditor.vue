<template>
  <div class="modules-editor">
    <!-- LEFT: module list -->
    <div class="mod-list-pane" :class="{ collapsed: !!moduleForm }">
      <div class="mod-list-head">
        <span class="mod-list-count">{{ modulesList.length }} modules</span>
        <button class="mod-new-btn" @click="openModuleForm(null)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
          New Module
        </button>
      </div>

      <div class="list-rows">
        <div
          v-for="mod in modulesList"
          :key="mod.id"
          class="mod-row"
          :class="{ selected: selectedModule?.id === mod.id, inactive: !mod.is_active }"
          @click="openModuleForm(mod)"
        >
          <span class="mod-row-badge" :class="mod.color">
            <span v-if="mod.icon" class="svg-icon" v-html="svgIcon(mod.icon, 13)" />
            <template v-else>{{ mod.abbr }}</template>
          </span>
          <div class="mod-row-info">
            <div class="mod-row-name">{{ mod.name }}</div>
            <div class="mod-row-route">{{ mod.route || '— no route —' }}</div>
          </div>
          <span v-if="!mod.is_active" class="mod-inactive-tag">inactive</span>
          <button
            class="mod-row-delete"
            :disabled="deletingModuleId === mod.id"
            @click.stop="deleteModuleFromRow(mod)"
            title="Delete module"
          >
            <svg v-if="deletingModuleId === mod.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
          <svg class="cell-action" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m9 18 6-6-6-6"/></svg>
        </div>
        <div v-if="!modulesList.length" class="empty-state">
          <div class="empty-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
          <div class="empty-title">No modules yet</div>
          <div class="empty-sub">Click "New Module" to add one.</div>
        </div>
      </div>

      <div class="table-footer">{{ modulesList.length }} modules total</div>
    </div>

    <!-- RIGHT: form / detail -->
    <div v-if="moduleForm" class="detail-panel">
      <div class="detail-head">
        <div class="detail-avatar" :class="moduleForm.color || 'bu'">
          <span v-if="moduleForm.icon" class="svg-icon" v-html="svgIcon(moduleForm.icon, 16)" />
          <template v-else>{{ moduleForm.abbr || '??' }}</template>
        </div>
        <div class="detail-title-block">
          <div class="detail-name">{{ moduleForm.id ? moduleForm.name || moduleForm.id : 'New Module' }}</div>
          <div class="detail-prefix">{{ moduleForm.id ? moduleForm.id : 'Fill in the details below' }}</div>
        </div>
        <button class="mod-form-close" @click="closeForm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="mod-form-body">
        <div class="mod-field">
          <label class="mod-label">ID <span class="mod-label-hint">lowercase, underscore only</span></label>
          <DsInput
            v-model="moduleForm.id"
            :disabled="!!selectedModule"
            placeholder="e.g. reports"
            autocomplete="off"
          />
        </div>

        <div class="mod-row-2">
          <div class="mod-field">
            <label class="mod-label">Name</label>
            <DsInput v-model="moduleForm.name" placeholder="e.g. Reports" autocomplete="off" />
          </div>
          <div class="mod-field">
            <label class="mod-label">Abbr <span class="mod-label-hint">max 4 chars</span></label>
            <DsInput v-model="moduleForm.abbr" placeholder="RP" :maxlength="4" autocomplete="off" />
          </div>
        </div>

        <div class="mod-row-2">
          <div class="mod-field">
            <label class="mod-label">Color</label>
            <DsDropdown
              v-model="moduleForm.color"
              :options="MODULE_COLORS.map(c => ({ value: c, label: c }))"
            />
          </div>
          <div class="mod-field">
            <label class="mod-label">Sort order</label>
            <DsInput v-model.number="moduleForm.sort_order" type="number" placeholder="0" />
          </div>
        </div>

        <div class="mod-field">
          <label class="mod-label">Route <span class="mod-label-hint">FE page path, e.g. /chat</span></label>
          <DsInput v-model="moduleForm.route" placeholder="/reports" autocomplete="off" />
        </div>

        <div class="mod-field">
          <label class="mod-label">Description</label>
          <DsInput v-model="moduleForm.description" placeholder="Short description…" autocomplete="off" />
        </div>

        <!-- Icon picker -->
        <div class="mod-field">
          <label class="mod-label">Icon <span class="mod-label-hint">click to pick, or paste SVG path below</span></label>
          <div class="icon-preset-grid">
            <button
              v-for="preset in ICON_PRESETS"
              :key="preset.id"
              type="button"
              class="icon-preset-btn"
              :class="{ selected: moduleForm.icon === preset.svg }"
              :title="preset.label"
              @click="moduleForm.icon = preset.svg"
            >
              <span class="svg-icon" v-html="svgIcon(preset.svg, 14)" />
            </button>
          </div>
          <DsInput v-model="moduleForm.icon" placeholder="SVG path markup, e.g. <circle cx='12' cy='12' r='9'/>" autocomplete="off" style="margin-top:6px;font-size:11px;font-family:monospace" />
        </div>

        <div class="mod-preview">
          <span class="mod-label">Preview</span>
          <div class="mod-preview-row">
            <span class="perm-mod-icon" :class="moduleForm.color || 'gray'">
              <span v-if="moduleForm.icon" class="svg-icon" v-html="svgIcon(moduleForm.icon, 11)" />
              <template v-else>{{ moduleForm.abbr || '??' }}</template>
            </span>
            <span class="mod-preview-name">{{ moduleForm.name || 'Module name' }}</span>
            <span v-if="moduleForm.route" class="mod-preview-route">{{ moduleForm.route }}</span>
          </div>
          <!-- Sidebar preview -->
          <div class="mod-preview-sidebar">
            <div class="sidebar-preview-item" :class="{ active: true }">
              <span class="svg-icon" v-html="svgIcon(moduleForm.icon || FALLBACK_ICON, 15)" />
              <span>{{ moduleForm.name || 'Module name' }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedModule" class="mod-field mod-active-row">
          <label class="mod-label">Active</label>
          <button
            class="mod-active-toggle"
            :class="{ on: moduleForm.is_active }"
            @click="moduleForm.is_active = !moduleForm.is_active"
          >
            <span class="mod-active-knob"></span>
          </button>
          <span class="mod-active-label">{{ moduleForm.is_active ? 'Active' : 'Inactive' }}</span>
        </div>
      </div>

      <div class="mod-form-foot">
        <div class="mod-form-foot-left">
          <button
            v-if="selectedModule"
            class="mod-delete-btn"
            :disabled="moduleFormSaving"
            @click="confirmDelete"
          >Delete</button>
        </div>
        <div class="mod-form-foot-right">
          <button class="mod-cancel-btn" @click="closeForm">Cancel</button>
          <button
            class="mod-save-btn"
            :disabled="moduleFormSaving || !moduleForm.id || !moduleForm.name || !moduleForm.abbr"
            @click="saveModule"
          >
            {{ moduleFormSaving ? 'Saving…' : selectedModule ? 'Save changes' : 'Create module' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { sanitizeSvgInner } from '~/composables/useSafeMarkdown.js'

const MODULE_COLORS = ['gray','indigo','amber','pink','cyan','green','blue','purple','orange','teal','red']

const FALLBACK_ICON = '<circle cx="12" cy="12" r="9"/>'

// Module icons are admin-supplied SVG markup stored in the DB and rendered
// via v-html. A compromised admin (or a tampered DB row) could inject
// <script>/event handlers, so every render path goes through the SVG
// sanitiser. Presets are constants in this file and don't strictly need it,
// but we run them through the same pipe for uniformity.
const safeSvg = (s) => sanitizeSvgInner(s)

/* Build a full <svg> string so v-html parses children in the SVG namespace.
   Setting v-html on an outer <svg> element parses children as HTML, not SVG,
   so <path>/<circle> never render. */
const svgIcon = (inner, size = 14) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${sanitizeSvgInner(inner) || ''}</svg>`

const ICON_PRESETS = [
  { id: 'chat',        label: 'Chat',        svg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
  { id: 'person',      label: 'Person',      svg: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>' },
  { id: 'team',        label: 'Team',        svg: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  { id: 'folder',      label: 'Projects',    svg: '<path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
  { id: 'settings',    label: 'Settings',    svg: '<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>' },
  { id: 'key',         label: 'API / Key',   svg: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>' },
  { id: 'shield',      label: 'Permissions', svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  { id: 'star',        label: 'Pro / Plan',  svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
  { id: 'chart',       label: 'Dashboard',   svg: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>' },
  { id: 'doc',         label: 'Document',    svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
  { id: 'bell',        label: 'Notification',svg: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
  { id: 'mail',        label: 'Email',       svg: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
  { id: 'grid',        label: 'Grid / Apps', svg: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' },
  { id: 'map',         label: 'Org / Map',   svg: '<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/>' },
  { id: 'layers',      label: 'Layers',      svg: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>' },
  { id: 'zap',         label: 'AI / Zap',    svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  { id: 'credit-card', label: 'Billing',     svg: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>' },
  { id: 'globe',       label: 'Global',      svg: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
]

const emit = defineEmits(['changed'])

const { apiFetch } = useApi()
const { show: showToast } = useToast()
const { ask: askConfirm } = useConfirm()

const modulesList    = ref([])
const selectedModule = ref(null)
const moduleForm     = ref(null)
const moduleFormSaving = ref(false)
const deletingModuleId = ref(null)

defineExpose({ reload: loadModules })

async function loadModules() {
  try {
    const data = await apiFetch('/api/admin/permissions/modules?all=true', { _skipLoader: true })
    modulesList.value = data
    emit('changed', data.filter(m => m.is_active))
  } catch {
    showToast('Failed to load modules', 'error')
  }
}

function openModuleForm(mod) {
  selectedModule.value = mod
  moduleForm.value = mod
    ? { ...mod }
    : { id: '', name: '', abbr: '', color: 'gray', route: '', description: '', sort_order: 99, is_active: true, icon: '' }
}

function closeForm() {
  moduleForm.value = null
  selectedModule.value = null
}

async function saveModule() {
  if (!moduleForm.value) return
  moduleFormSaving.value = true
  try {
    if (selectedModule.value) {
      await apiFetch(`/api/admin/permissions/modules/${selectedModule.value.id}`, {
        method: 'PUT', body: moduleForm.value, _skipLoader: true,
      })
      showToast(`Module «${moduleForm.value.name}» updated`)
    } else {
      await apiFetch('/api/admin/permissions/modules', {
        method: 'POST', body: moduleForm.value, _skipLoader: true,
      })
      showToast(`Module «${moduleForm.value.name}» created`)
    }
    closeForm()
    await loadModules()
  } catch (e) {
    showToast(e?.data?.error || 'Failed to save module', 'error')
  } finally {
    moduleFormSaving.value = false
  }
}

async function confirmDelete() {
  if (!selectedModule.value) return
  const mod = selectedModule.value
  const ok = await askConfirm({
    title: `Delete module "${mod.name}"?`,
    message: 'All node overrides, role matrix entries, and user permission data for this module will be permanently removed.',
    confirmLabel: 'Delete',
    variant: 'danger',
  })
  if (!ok) return
  moduleFormSaving.value = true
  try {
    await apiFetch(`/api/admin/permissions/modules/${mod.id}`, { method: 'DELETE', _skipLoader: true })
    showToast(`Module «${mod.name}» deleted`)
    closeForm()
    await loadModules()
  } catch (e) {
    showToast(e?.data?.error || 'Failed to delete module', 'error')
  } finally {
    moduleFormSaving.value = false
  }
}

async function deleteModuleFromRow(mod) {
  const ok = await askConfirm({
    title: `Delete module "${mod.name}"?`,
    message: 'All node overrides, role matrix entries, and user permission data for this module will be permanently removed.',
    confirmLabel: 'Delete',
    variant: 'danger',
  })
  if (!ok) return
  deletingModuleId.value = mod.id
  try {
    await apiFetch(`/api/admin/permissions/modules/${mod.id}`, { method: 'DELETE', _skipLoader: true })
    if (selectedModule.value?.id === mod.id) closeForm()
    await loadModules()
    showToast(`Module "${mod.name}" deleted`)
  } catch (e) {
    showToast(e?.data?.error || 'Failed to delete module', 'error')
  } finally {
    deletingModuleId.value = null
  }
}

onMounted(loadModules)
</script>

<!-- Self-contained styles (non-scoped on purpose so nested DsInput/DsDropdown
     children keep working without :deep). -->
<style>
.modules-editor {
  display: flex;
  gap: 16px;
  min-height: 0;
  flex: 1;
  min-width: 0;
  align-self: stretch;
}

/* Wrapper for SVG icons rendered via v-html — keeps inline-flex layout
   and ensures the inner <svg> uses currentColor. */
.svg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  flex-shrink: 0;
}
.svg-icon > svg { display: block; }

/* ── Left card: module list ─────────────────────────────── */
.mod-list-pane {
  flex: 1; min-width: 0;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.18);
  transition: flex .3s cubic-bezier(.4,0,.2,1), margin .3s cubic-bezier(.4,0,.2,1);
  display: flex; flex-direction: column;
}
.mod-list-pane.collapsed { flex: 0 0 320px; margin-right: 14px; }

.mod-list-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-elev-2);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.mod-list-count {
  font-size: 10px; font-weight: 800; letter-spacing: .1em;
  text-transform: uppercase; color: var(--fg-mute);
}
.mod-new-btn {
  display: flex; align-items: center; gap: 6px;
  height: 28px; padding: 0 10px;
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 30%, transparent);
  color: var(--accent);
  border-radius: 7px;
  font-size: 11px; font-weight: 600;
  cursor: pointer;
  transition: background .12s, border-color .12s;
}
.mod-new-btn:hover { background: color-mix(in oklab, var(--accent) 18%, transparent); border-color: color-mix(in oklab, var(--accent) 45%, transparent); }

.list-rows { flex: 1; overflow-y: auto; }
.table-footer {
  padding: 10px 16px;
  font-size: 10.5px; color: var(--fg-mute);
  background: var(--bg-elev-2);
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}

.mod-row {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  position: relative;
  transition: background .1s;
}
.mod-row::before {
  content: ""; position: absolute;
  left: 0; top: 20%; bottom: 20%;
  width: 2px;
  border-radius: 0 2px 2px 0;
  background: var(--accent); opacity: 0;
  transition: opacity .15s;
}
.mod-row:hover { background: var(--bg-elev-2); }
.mod-row:hover::before { opacity: 0.5; }
.mod-row.selected { background: color-mix(in oklab, var(--accent) 8%, transparent); }
.mod-row.selected::before { opacity: 1; }
.mod-row:last-child { border-bottom: 0; }
.mod-row.inactive { opacity: 0.45; }

.mod-row-badge {
  width: 30px; height: 30px; border-radius: 8px;
  display: grid; place-items: center;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px; font-weight: 700;
  flex-shrink: 0;
}
.mod-row-info { flex: 1; min-width: 0; }
.mod-row-name {
  font-size: 12px; font-weight: 600; color: var(--fg);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mod-row-route {
  font-size: 10.5px; color: var(--fg-mute);
  font-family: var(--font-mono, ui-monospace, monospace);
  margin-top: 1px;
}
.mod-inactive-tag {
  font-size: 9.5px;
  font-family: var(--font-mono, ui-monospace, monospace);
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-elev-2);
  color: var(--fg-mute);
}
.mod-row-delete {
  opacity: 0; flex-shrink: 0;
  width: 26px; height: 26px;
  border: 0; background: transparent;
  color: var(--fg-mute);
  border-radius: 6px;
  cursor: pointer;
  display: grid; place-items: center;
  transition: opacity .15s, background .15s, color .15s;
}
.mod-row:hover .mod-row-delete { opacity: 1; }
.mod-row-delete:hover:not(:disabled) { background: color-mix(in oklab, var(--danger) 14%, transparent); color: var(--danger); }
.mod-row-delete:disabled { cursor: not-allowed; opacity: 0.5; }

.cell-action {
  display: grid; place-items: center;
  color: var(--fg-faint);
  transition: color .12s, transform .12s;
  flex-shrink: 0;
}
.mod-row:hover .cell-action { color: var(--fg-dim); transform: translateX(2px); }

/* Spinner shared */
@keyframes me-spin { to { transform: rotate(360deg); } }
.modules-editor .spin { animation: me-spin .8s linear infinite; }

.empty-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 48px 20px;
  gap: 8px;
}
.empty-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  background: var(--bg-elev-2);
  border: 1px solid var(--line-2);
  display: grid; place-items: center;
  color: var(--fg-mute);
}
.empty-title { font-size: 13px; color: var(--fg-dim); font-weight: 600; }
.empty-sub { font-size: 11.5px; color: var(--fg-mute); }

/* ── Right card: form panel ─────────────────────────────── */
.detail-panel {
  flex: 1; min-width: 0;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.18);
}
.detail-head {
  display: flex; align-items: center; gap: 11px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.detail-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: grid; place-items: center;
  font-size: 11px; font-weight: 800;
  flex-shrink: 0;
}
.detail-title-block { flex: 1; min-width: 0; }
.detail-name { font-size: 13px; font-weight: 700; color: var(--fg); }
.detail-prefix {
  font-size: 10px;
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--fg-mute);
}

.mod-form-close {
  background: transparent; border: 0; color: var(--fg-mute);
  cursor: pointer;
  width: 28px; height: 28px;
  border-radius: 6px;
  display: grid; place-items: center;
  transition: background .1s, color .1s;
  margin-left: auto;
  flex-shrink: 0;
}
.mod-form-close:hover { background: var(--bg-elev-2); color: var(--fg); }

.mod-form-body {
  flex: 1; overflow-y: auto;
  padding: 16px 20px;
  display: flex; flex-direction: column;
  gap: 14px;
}
.mod-field { display: flex; flex-direction: column; gap: 5px; }
.mod-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mod-label {
  font-size: 11px; font-weight: 600; color: var(--fg-dim);
  letter-spacing: 0.04em; text-transform: uppercase;
}
.mod-label-hint {
  font-size: 10px; font-weight: 400; color: var(--fg-mute);
  text-transform: none; letter-spacing: 0;
  margin-left: 4px;
}

.mod-preview {
  background: var(--bg-elev-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 8px;
}
.mod-preview-row { display: flex; align-items: center; gap: 9px; }
.mod-preview-name { font-size: 13px; font-weight: 600; color: var(--fg); }
.mod-preview-route {
  font-size: 11px;
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--fg-mute);
  margin-left: 4px;
}

.mod-active-row { flex-direction: row !important; align-items: center; gap: 10px; }
.mod-active-toggle {
  width: 36px; height: 20px;
  border-radius: 999px;
  background: var(--bg-elev-3);
  border: 1px solid var(--line-2);
  cursor: pointer;
  position: relative;
  transition: background .15s;
  flex-shrink: 0;
}
.mod-active-toggle.on { background: color-mix(in oklab, var(--accent) 28%, transparent); border-color: color-mix(in oklab, var(--accent) 45%, transparent); }
.mod-active-knob {
  position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--fg-mute);
  transition: left .15s, background .15s;
}
.mod-active-toggle.on .mod-active-knob { left: 18px; background: var(--accent); }
.mod-active-label { font-size: 12px; color: var(--fg-mute); }

.mod-form-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}
.mod-form-foot-right { display: flex; gap: 8px; }
.mod-cancel-btn {
  height: 32px; padding: 0 14px;
  border-radius: 7px;
  background: transparent;
  border: 1px solid var(--line-2);
  color: var(--fg-mute);
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  transition: border-color .12s, color .12s;
}
.mod-cancel-btn:hover { border-color: var(--line-3); color: var(--fg-dim); }
.mod-save-btn {
  height: 32px; padding: 0 16px;
  border-radius: 7px;
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 35%, transparent);
  color: var(--accent);
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  transition: background .12s;
}
.mod-save-btn:hover:not(:disabled) { background: color-mix(in oklab, var(--accent) 20%, transparent); }
.mod-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.mod-delete-btn {
  height: 32px; padding: 0 14px;
  border-radius: 7px;
  background: color-mix(in oklab, var(--danger) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--danger) 25%, transparent);
  color: var(--danger);
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  transition: background .12s;
}
.mod-delete-btn:hover:not(:disabled) { background: color-mix(in oklab, var(--danger) 15%, transparent); }
.mod-delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Module badges (color variants) ─────────────────────── */
.perm-mod-icon {
  width: 20px; height: 20px;
  border-radius: 5px;
  display: grid; place-items: center;
  font-size: 9px; font-weight: 800;
  flex-shrink: 0;
}
.perm-mod-icon.gray   { background: rgba(148,163,184,0.12); color: #94a3b8; }
.perm-mod-icon.indigo { background: rgba(99,102,241,0.12);  color: #818cf8; }
.perm-mod-icon.amber  { background: rgba(251,191,36,0.12);  color: #fbbf24; }
.perm-mod-icon.pink   { background: rgba(244,114,182,0.12); color: #f472b6; }
.perm-mod-icon.cyan   { background: rgba(34,211,238,0.12);  color: #22d3ee; }
.perm-mod-icon.green  { background: rgba(74,222,128,0.12);  color: #4ade80; }
.perm-mod-icon.blue   { background: rgba(96,165,250,0.12);  color: #60a5fa; }
.perm-mod-icon.purple { background: rgba(167,139,250,0.12); color: #a78bfa; }
.perm-mod-icon.orange { background: rgba(251,146,60,0.12);  color: #fb923c; }
.perm-mod-icon.teal   { background: rgba(45,212,191,0.12);  color: #2dd4bf; }
.perm-mod-icon.red    { background: rgba(248,113,113,0.12); color: #f87171; }

.mod-row-badge.gray   { background: rgba(148,163,184,0.12); color: #94a3b8; }
.mod-row-badge.indigo { background: rgba(99,102,241,0.12);  color: #818cf8; }
.mod-row-badge.amber  { background: rgba(251,191,36,0.12);  color: #fbbf24; }
.mod-row-badge.pink   { background: rgba(244,114,182,0.12); color: #f472b6; }
.mod-row-badge.cyan   { background: rgba(34,211,238,0.12);  color: #22d3ee; }
.mod-row-badge.green  { background: rgba(74,222,128,0.12);  color: #4ade80; }
.mod-row-badge.blue   { background: rgba(96,165,250,0.12);  color: #60a5fa; }
.mod-row-badge.purple { background: rgba(167,139,250,0.12); color: #a78bfa; }
.mod-row-badge.orange { background: rgba(251,146,60,0.12);  color: #fb923c; }
.mod-row-badge.teal   { background: rgba(45,212,191,0.12);  color: #2dd4bf; }
.mod-row-badge.red    { background: rgba(248,113,113,0.12); color: #f87171; }

.detail-avatar.gray   { background: rgba(148,163,184,0.15); color: #94a3b8; }
.detail-avatar.indigo { background: rgba(99,102,241,0.15);  color: #818cf8; }
.detail-avatar.amber  { background: rgba(251,191,36,0.15);  color: #fbbf24; }
.detail-avatar.pink   { background: rgba(244,114,182,0.15); color: #f472b6; }
.detail-avatar.cyan   { background: rgba(34,211,238,0.15);  color: #22d3ee; }
.detail-avatar.green  { background: rgba(74,222,128,0.15);  color: #4ade80; }
.detail-avatar.blue   { background: rgba(96,165,250,0.15);  color: #60a5fa; }
.detail-avatar.purple { background: rgba(167,139,250,0.15); color: #a78bfa; }
.detail-avatar.orange { background: rgba(251,146,60,0.15);  color: #fb923c; }
.detail-avatar.teal   { background: rgba(45,212,191,0.15);  color: #2dd4bf; }
.detail-avatar.red    { background: rgba(248,113,113,0.15); color: #f87171; }
.detail-avatar.bu     { background: rgba(133,183,235,0.15); color: #85b7eb; }

/* ── Icon picker ─────────────────────────────────────────── */
.icon-preset-grid {
  display: flex; flex-wrap: wrap; gap: 5px;
}
.icon-preset-btn {
  width: 30px; height: 30px;
  border-radius: 7px;
  border: 1px solid var(--line-2);
  background: var(--bg-elev-2);
  color: var(--fg-mute);
  display: grid; place-items: center;
  cursor: pointer;
  transition: background .1s, color .1s, border-color .1s;
}
.icon-preset-btn:hover { background: var(--bg-elev-3); color: var(--fg-dim); border-color: var(--line-3); }
.icon-preset-btn.selected {
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  border-color: color-mix(in oklab, var(--accent) 40%, transparent);
  color: var(--accent);
}

/* ── Sidebar preview strip ───────────────────────────────── */
.mod-preview-sidebar {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}
.sidebar-preview-item {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  border-radius: 7px;
  background: var(--bg-elev-2);
  color: var(--fg-mute);
  font-size: 12px; font-weight: 500;
}
.sidebar-preview-item.active {
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  color: var(--accent);
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .modules-editor { gap: 12px; }
  /* List stays full width — detail becomes popup drawer */
  .mod-list-pane,
  .mod-list-pane.collapsed { flex: 1; margin-right: 0; }
  .mod-form-body { padding: 14px 16px; gap: 12px; }

  .modules-editor > .detail-panel {
    position: fixed;
    top: 0; right: 0; bottom: 0; left: auto;
    z-index: 1040;
    width: 100%;
    max-width: 720px;
    min-height: 100vh;
    margin: 0;
    border-radius: 0;
    border-left: 1px solid var(--line);
    background: var(--bg);
    box-shadow: -8px 0 32px rgba(0,0,0,0.4);
    overflow-y: auto;
    animation: mod-detail-pop-in .22s cubic-bezier(.4,0,.2,1);
  }
  .modules-editor:has(> .detail-panel)::before {
    content: "";
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1039;
    animation: mod-backdrop-fade .2s ease;
  }
  @keyframes mod-detail-pop-in {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mod-backdrop-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
}

@media (max-width: 768px) {
  .modules-editor { flex-direction: column; gap: 10px; }
  .mod-list-pane,
  .mod-list-pane.collapsed {
    flex: none;
    width: 100%;
    margin-right: 0;
  }
  /* Mobile: fullscreen popup */
  .modules-editor > .detail-panel {
    position: fixed;
    inset: 0;
    z-index: 1040;
    width: 100%;
    max-width: 100%;
    min-height: 100vh;
    margin: 0;
    border-radius: 0;
    border-left: 0;
    background: var(--bg);
    box-shadow: none;
    overflow-y: auto;
    animation: mod-detail-pop-in-mobile .22s cubic-bezier(.4,0,.2,1);
  }
  @keyframes mod-detail-pop-in-mobile {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .mod-row-2 { grid-template-columns: 1fr; }
  .mod-form-foot { flex-direction: column; gap: 8px; align-items: stretch; }
  .mod-form-foot-left,
  .mod-form-foot-right { width: 100%; display: flex; gap: 8px; }
  .mod-delete-btn,
  .mod-cancel-btn,
  .mod-save-btn { flex: 1; justify-content: center; height: 40px; }
  .icon-preset-grid { gap: 6px; }
  .icon-preset-btn { width: 34px; height: 34px; }
}
</style>
