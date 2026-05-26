<template>
  <transition name="drawer">
    <div v-if="modelValue" class="drawer-backdrop" @click.self="close">
      <div class="drawer">
        <!-- Header -->
        <div class="drawer-head">
          <div class="drawer-title-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
            <span class="drawer-title">Create New User</span>
          </div>
          <button class="close-btn" @click="close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Split body -->
        <div class="drawer-body">
          <!-- LEFT: Form -->
          <div class="drawer-form">
            <!-- Account -->
            <div class="form-section">
              <div class="form-section-head">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                Account Info
              </div>
              <div class="form-grid-2">
                <div class="field">
                  <label class="field-label">Full name <span class="req">*</span></label>
                  <DsInput v-model="form.name" autocomplete="off" placeholder="Nguyen Van A" :error="!!errors.name" @input="errors.name=''" />
                  <div v-if="errors.name" class="field-err-msg">{{ errors.name }}</div>
                </div>
                <div class="field">
                  <label class="field-label">Display name</label>
                  <DsInput v-model="form.displayName" autocomplete="off" placeholder="Alias / nickname" />
                </div>
              </div>
              <div class="form-grid-2">
                <div class="field">
                  <label class="field-label">Email <span class="req">*</span></label>
                  <DsInput v-model="form.email" type="email" autocomplete="new-password" placeholder="user@pebsteel.com" :error="!!errors.email" @input="errors.email=''" />
                  <div v-if="errors.email" class="field-err-msg">{{ errors.email }}</div>
                </div>
                <div class="field">
                  <label class="field-label">Username</label>
                  <DsInput v-model="form.username" autocomplete="off" placeholder="auto from email" />
                </div>
              </div>
              <div class="form-grid-2">
                <div class="field">
                  <label class="field-label">Password <span class="req">*</span></label>
                  <DsInput v-model="form.password" type="password" autocomplete="new-password" placeholder="Min 8 characters" :error="!!errors.password" @input="errors.password=''" />
                  <div v-if="errors.password" class="field-err-msg">{{ errors.password }}</div>
                </div>
                <div class="field">
                  <label class="field-label">Language</label>
                  <DsDropdown v-model="form.language" :options="LANGUAGES.map(l => ({ value: l.code, label: l.flag + ' ' + l.label }))" />
                </div>
              </div>
            </div>

            <!-- Profile -->
            <div class="form-section">
              <div class="form-section-head">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                Profile
              </div>
              <div class="form-grid-2">
                <div class="field">
                  <label class="field-label">Job title</label>
                  <DsDropdown v-model="form.jobTitle" :options="[{ value: '', label: '— Select —' }, ...JOB_TITLES.map(t => ({ value: t, label: t }))]" />
                </div>
                <div class="field">
                  <label class="field-label">Department</label>
                  <DsDropdown v-model="form.department" :options="[{ value: '', label: '— Select —' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]" />
                </div>
              </div>
              <div class="form-grid-2">
                <div class="field">
                  <label class="field-label">Phone</label>
                  <DsInput v-model="form.phone" autocomplete="off" placeholder="+84 90 000 0000" />
                </div>
                <div class="field">
                  <label class="field-label">Country</label>
                  <DsDropdown v-model="form.countryCode" :options="[{ value: '', label: '— None —' }, ...COUNTRIES.map(c => ({ value: c.code, label: c.flag + ' ' + c.name }))]" />
                </div>
              </div>
            </div>

            <!-- Org Assignment -->
            <div class="form-section">
              <div class="form-section-head">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Org Assignment
                <span class="section-optional">optional</span>
              </div>
              <div class="form-grid-2">
                <div class="field">
                  <label class="field-label">Assign to node</label>
                  <select class="field-select" v-model="form.nodeId">
                    <option value="">— Skip assignment —</option>
                    <optgroup v-for="layer in orgLayerGroups" :key="layer.label" :label="layer.label">
                      <option v-for="n in layer.nodes" :key="n.id" :value="n.id">
                        {{ '·'.repeat(n.depth) }} {{ n.label }}
                      </option>
                    </optgroup>
                  </select>
                </div>
                <div class="field">
                  <label class="field-label">Role in node</label>
                  <DsDropdown v-model="form.role" :options="ROLE_DEFS.map(r => ({ value: r.id, label: r.label }))" :disabled="!form.nodeId" />
                </div>
              </div>
              <div v-if="form.nodeId" class="field">
                <label class="field-label">Country scope</label>
                <DsDropdown v-model="form.country" :options="[{ value: '', label: 'Global (no scope filter)' }, ...COUNTRIES.map(c => ({ value: c.name, label: c.flag + ' ' + c.name }))]" />
              </div>
            </div>
          </div>

          <!-- RIGHT: Preview -->
          <div class="drawer-preview">
            <div class="preview-head">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview
            </div>

            <div class="preview-card">
              <div class="preview-avatar">{{ form.name ? form.name.slice(0,2).toUpperCase() : '??' }}</div>
              <div class="preview-card-name">{{ form.name || 'Full name' }}</div>
              <div class="preview-card-email">{{ form.email || 'email@domain.com' }}</div>
              <span class="role-pill" :class="form.role">{{ ROLE_DEFS.find(r => r.id === form.role)?.label || '—' }}</span>
            </div>

            <div class="preview-rows">
              <div class="preview-row">
                <span class="pr-key">Username</span>
                <span class="pr-val">{{ form.username || (form.email ? form.email.split('@')[0] : '—') }}</span>
              </div>
              <div class="preview-row">
                <span class="pr-key">Language</span>
                <span class="pr-val">{{ LANGUAGES.find(l => l.code === form.language)?.flag }} {{ LANGUAGES.find(l => l.code === form.language)?.label }}</span>
              </div>
              <div class="preview-row" v-if="form.jobTitle">
                <span class="pr-key">Job title</span>
                <span class="pr-val">{{ form.jobTitle }}</span>
              </div>
              <div class="preview-row" v-if="form.department">
                <span class="pr-key">Department</span>
                <span class="pr-val">{{ form.department }}</span>
              </div>
              <div class="preview-row" v-if="form.countryCode">
                <span class="pr-key">Country</span>
                <span class="pr-val">{{ COUNTRIES.find(c => c.code === form.countryCode)?.flag }} {{ COUNTRIES.find(c => c.code === form.countryCode)?.name }}</span>
              </div>
            </div>

            <div v-if="form.nodeId" class="preview-assign">
              <div class="pa-head">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Org Assignment
              </div>
              <div class="pa-node">{{ flatNodes.find(n => n.id === form.nodeId)?.label || '—' }}</div>
              <div class="pa-meta">
                <span class="role-pill sm" :class="form.role">{{ ROLE_DEFS.find(r => r.id === form.role)?.label }}</span>
                <span v-if="form.country" class="pa-country">{{ form.country }}</span>
                <span v-else class="pa-country muted">Global</span>
              </div>
            </div>
            <div v-else class="preview-assign muted-block">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              No org assignment
            </div>

            <div class="preview-checklist">
              <div class="pc-item" :class="{ done: form.name }">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5L20 7"/></svg>
                Full name
              </div>
              <div class="pc-item" :class="{ done: form.email }">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5L20 7"/></svg>
                Email
              </div>
              <div class="pc-item" :class="{ done: form.password }">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5L20 7"/></svg>
                Password
              </div>
            </div>
          </div>
        </div>

        <div v-if="errors.global" class="drawer-err-bar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ errors.global }}
        </div>

        <div class="drawer-foot">
          <DsButton variant="default" @click="close">Cancel</DsButton>
          <DsButton
            variant="primary"
            :disabled="saving || !form.name || !form.email || !form.password"
            @click="submit"
          >
            <svg v-if="!saving" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            <svg v-else class="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
            {{ saving ? 'Creating…' : 'Create User' }}
          </DsButton>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import {
  ROLE_DEFS, LAYER_LABELS, LANGUAGES, COUNTRIES, JOB_TITLES, DEPARTMENTS,
} from '../../composables/useOrgConstants.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  flatNodes:  { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'created'])

const { apiFetch } = useApi()
const { show: showToast } = useToast()

const form = reactive(emptyForm())
const errors = reactive({ name: '', email: '', password: '', global: '' })
const saving = ref(false)

function emptyForm() {
  return {
    name: '', displayName: '', email: '', username: '',
    password: '', language: 'en',
    jobTitle: '', department: '', phone: '', countryCode: '',
    role: 'country_user', nodeId: '', country: '',
  }
}

function resetForm() {
  Object.assign(form, emptyForm())
  Object.assign(errors, { name: '', email: '', password: '', global: '' })
}

watch(() => props.modelValue, (open) => { if (open) resetForm() })

const orgLayerGroups = computed(() => {
  const layers = LAYER_LABELS.map(label => ({ label, nodes: [] }))
  for (const n of props.flatNodes) {
    if (n.depth <= 3) layers[n.depth]?.nodes.push(n)
  }
  return layers.filter(l => l.nodes.length > 0)
})

function close() {
  emit('update:modelValue', false)
  resetForm()
}

async function submit() {
  Object.assign(errors, { name: '', email: '', password: '', global: '' })
  let valid = true
  if (!form.name.trim())     { errors.name     = 'Full name is required'; valid = false }
  if (!form.email.trim())    { errors.email    = 'Email is required';     valid = false }
  if (!form.password)        { errors.password = 'Password is required';  valid = false }
  if (!valid) return

  saving.value = true
  try {
    const created = await apiFetch('/api/admin/users', {
      method: 'POST',
      body: {
        username:  form.username.trim() || form.email.split('@')[0],
        email:     form.email.trim(),
        password:  form.password,
        full_name: form.name.trim(),
      },
    })
    if (form.nodeId) {
      await apiFetch('/api/admin/permissions/assign', {
        method: 'POST',
        body: {
          user_id: created.id,
          node_id: form.nodeId,
          role:    form.role,
          country: form.country || null,
        },
      })
    }
    showToast('User created successfully')
    emit('created', { user: created, nodeId: form.nodeId })
    close()
  } catch (e) {
    errors.global = e?.data?.error || e?.message || 'Failed to create user'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── Backdrop + drawer shell ─────────────────────── */
.drawer-backdrop {
  position: fixed; inset: 0;
  background: color-mix(in oklab, var(--bg) 70%, transparent);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}
.drawer {
  width: min(960px, 95vw);
  height: 100%;
  background: var(--bg-elev);
  border-left: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  box-shadow: -16px 0 40px rgba(0, 0, 0, 0.4);
}

/* Header */
.drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.drawer-title-wrap { display: flex; align-items: center; gap: 9px; color: var(--fg); }
.drawer-title { font-size: 14px; font-weight: 600; letter-spacing: -0.005em; }
.close-btn {
  width: 28px; height: 28px;
  border: 0; background: transparent;
  border-radius: 6px;
  color: var(--fg-mute);
  cursor: pointer;
  display: grid; place-items: center;
  transition: background .12s, color .12s;
}
.close-btn:hover { background: var(--line); color: var(--fg); }

/* Body: form + preview */
.drawer-body {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  flex: 1; min-height: 0;
  overflow: hidden;
}
.drawer-form {
  padding: 20px 24px;
  overflow-y: auto;
  border-right: 1px solid var(--line);
  display: flex; flex-direction: column; gap: 20px;
}
.drawer-preview {
  padding: 20px 22px;
  overflow-y: auto;
  background: var(--bg);
  display: flex; flex-direction: column; gap: 16px;
}

/* Form sections */
.form-section { display: flex; flex-direction: column; gap: 12px; }
.form-section-head {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-mute);
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--line);
}
.section-optional {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--fg-faint);
  text-transform: lowercase;
  background: var(--line);
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: auto;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-dim);
  letter-spacing: 0.01em;
}
.req { color: var(--danger); margin-left: 2px; }
.field-err-msg {
  font-size: 10.5px;
  color: var(--danger);
  margin-top: 1px;
}

/* Native select fallback (org node tree) */
.field-select {
  appearance: none;
  background: var(--bg);
  border: 1px solid var(--line-2);
  color: var(--fg);
  font-size: 12.5px;
  font-family: inherit;
  padding: 7px 28px 7px 10px;
  border-radius: 7px;
  cursor: pointer;
  outline: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.field-select:focus {
  border-color: color-mix(in oklab, var(--accent) 35%, transparent);
  background-color: var(--bg-elev-2);
}
.field-select option { background: var(--bg-elev-2); color: var(--fg); }
.field-select optgroup { color: var(--fg-mute); font-style: normal; }

/* ── Preview pane ───────────────────────────────── */
.preview-head {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-mute);
}
.preview-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 16px 14px;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.preview-avatar {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--bg-elev-3), var(--bg-elev-2));
  border: 1px solid var(--line-2);
  display: grid; place-items: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 0.02em;
}
.preview-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg);
}
.preview-card-email {
  font-size: 11px;
  color: var(--fg-mute);
}

.preview-rows {
  display: flex; flex-direction: column; gap: 2px;
  padding: 4px 0;
}
.preview-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 11.5px;
}
.preview-row:hover { background: var(--line); }
.pr-key { color: var(--fg-mute); }
.pr-val { color: var(--fg); font-weight: 500; max-width: 60%; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.preview-assign {
  padding: 10px 12px;
  background: color-mix(in oklab, var(--accent) 5%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 18%, transparent);
  border-radius: 8px;
  display: flex; flex-direction: column; gap: 5px;
}
.preview-assign.muted-block {
  background: transparent;
  border-style: dashed;
  border-color: var(--line);
  color: var(--fg-mute);
  font-size: 11.5px;
  flex-direction: row;
  align-items: center;
  gap: 7px;
  justify-content: center;
  padding: 14px;
}
.pa-head {
  display: flex; align-items: center; gap: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--accent) 75%, var(--fg-dim));
}
.pa-node { font-size: 12.5px; font-weight: 600; color: var(--fg); }
.pa-meta { display: flex; align-items: center; gap: 8px; }
.pa-country {
  font-size: 10.5px;
  color: var(--fg-mute);
  background: var(--line);
  padding: 1px 7px;
  border-radius: 4px;
}
.pa-country.muted { color: var(--fg-faint); font-style: italic; }

.role-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--line);
  color: var(--fg-dim);
}
.role-pill.sm { font-size: 9px; padding: 1px 6px; }
.role-pill.super_admin   { background: color-mix(in oklab, #a855f7 18%, transparent); color: #c084fc; }
.role-pill.regional_admin{ background: color-mix(in oklab, var(--ok)  18%, transparent); color: var(--ok); }
.role-pill.bu_manager    { background: color-mix(in oklab, var(--info) 18%, transparent); color: var(--info); }
.role-pill.country_user  { background: color-mix(in oklab, var(--warn) 18%, transparent); color: var(--warn); }
.role-pill.vendor        { background: color-mix(in oklab, #f97316 18%, transparent); color: #fb923c; }
.role-pill.viewer        { background: var(--line-2); color: var(--fg-dim); }

.preview-checklist {
  margin-top: auto;
  display: flex; flex-direction: column; gap: 4px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}
.pc-item {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px;
  color: var(--fg-faint);
}
.pc-item svg { opacity: 0.4; }
.pc-item.done { color: var(--ok); }
.pc-item.done svg { opacity: 1; }

/* Error bar + footer */
.drawer-err-bar {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 20px;
  background: color-mix(in oklab, var(--danger) 10%, transparent);
  border-top: 1px solid color-mix(in oklab, var(--danger) 25%, transparent);
  color: var(--danger);
  font-size: 12px;
  flex-shrink: 0;
}
.drawer-foot {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
  background: var(--bg);
  flex-shrink: 0;
}

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Transitions ─────────────────────────────────── */
.drawer-enter-active, .drawer-leave-active {
  transition: opacity .2s ease;
}
.drawer-enter-active .drawer, .drawer-leave-active .drawer {
  transition: transform .25s cubic-bezier(.4, 0, .2, 1);
}
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer, .drawer-leave-to .drawer { transform: translateX(100%); }

/* Responsive: collapse to single column */
@media (max-width: 900px) {
  .drawer-body { grid-template-columns: 1fr; }
  .drawer-form { border-right: 0; border-bottom: 1px solid var(--line); }
  .form-grid-2 { grid-template-columns: 1fr; }
}

@media (max-width: 1024px) {
  .drawer { width: min(860px, 98vw); }
  .drawer-form { padding: 16px 18px; }
  .drawer-preview { padding: 16px 16px; }
}

@media (max-width: 768px) {
  /* Full-width drawer on mobile */
  .drawer {
    width: 100vw;
    border-left: 0;
    border-top: 1px solid var(--line);
    border-radius: 16px 16px 0 0;
  }
  .drawer-backdrop { align-items: flex-end; }

  /* Stack body, hide preview pane to save space */
  .drawer-body { grid-template-columns: 1fr; overflow-y: auto; }
  .drawer-preview { display: none; }
  .drawer-form {
    border-right: 0;
    border-bottom: 0;
    padding: 14px 16px;
  }

  /* Form grids always single column */
  .form-grid-2 { grid-template-columns: 1fr; }

  /* Header */
  .drawer-head { padding: 12px 16px; }
  .drawer-title { font-size: 13px; }
  .close-btn { width: 32px; height: 32px; }

  /* Footer with bigger tap targets */
  .drawer-foot { padding: 12px 16px; gap: 8px; }
}
</style>
