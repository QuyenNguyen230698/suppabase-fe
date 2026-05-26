<template>
  <div class="me-page">
    <header class="me-head">
      <h1>{{ t('me.myAccount') }}</h1>
      <p>{{ t('me.profile') }}</p>
    </header>

    <div v-if="loading" class="me-state">{{ t('common.loading') }}</div>
    <div v-else-if="!me" class="me-state">Failed to load profile</div>

    <div v-else class="me-layout">
      <!-- Side nav -->
      <nav class="me-nav">
        <button v-for="t in tabs" :key="t.id"
          :class="{ active: tab === t.id }"
          @click="tab = t.id">
          <span class="me-nav-ic" v-html="t.icon" />
          {{ t.label }}
        </button>
      </nav>

      <!-- Content -->
      <section class="me-section">

        <!-- Profile -->
        <template v-if="tab === 'profile'">
          <div class="me-card">
            <h2>{{ t('me.tabProfile') }}</h2>
            <div class="profile-split">
              <AvatarUploader v-model="me.avatar_url" :initials="initials" @change="onAvatarChange" />
              <div class="profile-fields">
                <div class="row-2">
                  <div class="field">
                    <label>{{ t('me.fullName') }}</label>
                    <DsInput v-model="form.full_name" />
                  </div>
                  <div class="field">
                    <label>{{ t('me.displayName') }}</label>
                    <DsInput v-model="form.display_name" :placeholder="t('me.displayNameHint')" />
                  </div>
                </div>
                <div class="row-2">
                  <div class="field">
                    <label>{{ t('me.username') }}</label>
                    <DsInput :model-value="me.username" disabled />
                  </div>
                  <div class="field">
                    <label>{{ t('me.email') }}</label>
                    <DsInput :model-value="me.email" disabled />
                  </div>
                </div>
                <div class="row-2">
                  <div class="field">
                    <label>{{ t('me.phone') }}</label>
                    <DsInput v-model="form.phone" placeholder="+84 90 000 0000" />
                  </div>
                  <div class="field">
                    <label>{{ t('me.country') }}</label>
                    <DsDropdown
                      v-model="form.country_code"
                      :options="[{ value: '', label: t('me.countryNone') }, ...COUNTRIES.map(c => ({ value: c.code, label: c.flag + ' ' + c.name }))]"
                    />
                  </div>
                </div>
                <div class="row-2">
                  <div class="field">
                    <label>{{ t('me.jobTitle') }}</label>
                    <DsInput :model-value="me.job_title || '—'" disabled />
                  </div>
                  <div class="field">
                    <label>{{ t('me.department') }}</label>
                    <DsInput :model-value="me.department || '—'" disabled />
                  </div>
                </div>
                <small class="field-hint">{{ t('me.adminManagedHint') }}</small>
              </div>
            </div>
            <div class="card-foot">
              <span v-if="profileDirty" class="dirty">{{ t('me.unsavedChanges') }}</span>
              <DsButton variant="primary" :disabled="!profileDirty || savingProfile" @click="saveProfile">
                {{ savingProfile ? t('me.saving') : t('me.saveProfile') }}
              </DsButton>
            </div>
          </div>

          <!-- Quick info -->
          <div class="me-card slim">
            <h2>{{ t('me.accountSection') }}</h2>
            <dl class="info-grid">
              <dt>{{ t('me.role') }}</dt>          <dd>{{ roleLabel }}</dd>
              <dt>{{ t('me.employeeId') }}</dt>    <dd>{{ me.employee_id || '—' }}</dd>
              <dt>{{ t('me.manager') }}</dt>       <dd>{{ me.manager?.full_name || me.manager?.username || '—' }}</dd>
              <dt>{{ t('me.hireDate') }}</dt>      <dd>{{ formatDate(me.hire_date) }}</dd>
              <dt>{{ t('me.contract') }}</dt>      <dd>{{ me.contract_type || '—' }}</dd>
              <dt>{{ t('me.memberSince') }}</dt>   <dd>{{ formatDate(me.created_at) }}</dd>
              <dt>{{ t('me.lastLogin') }}</dt>     <dd>{{ formatDate(me.last_login_at) }}</dd>
              <dt>{{ t('me.logins') }}</dt>        <dd>{{ me.login_count }}</dd>
            </dl>
          </div>
        </template>

        <!-- Security -->
        <template v-else-if="tab === 'security'">
          <div class="me-card">
            <h2>{{ t('me.passwordSection') }}</h2>
            <p class="me-card-help">
              <template v-if="me.password_must_change">
                <strong>{{ t('me.passwordMustChange') }}</strong>
              </template>
              <template v-else-if="me.password_must_change_soon">
                {{ t('me.passwordExpiringIn', { age: me.password_age_days }) }}
              </template>
              <template v-else>
                {{ me.password_changed_at ? t('me.passwordLastChanged', { date: formatDate(me.password_changed_at) }) : t('me.passwordNeverChanged') }}
              </template>
            </p>
            <ChangePasswordForm @changed="onPasswordChanged" />
          </div>
        </template>

        <!-- Memories -->
        <template v-else-if="tab === 'memories'">
          <div class="me-card">
            <h2>{{ t('me.memoriesTitle') }}</h2>
            <p class="me-card-help">{{ t('me.memoriesHelp') }}</p>

            <!-- Add manual -->
            <div class="mem-add">
              <DsInput v-model="memDraft" :placeholder="t('memories.addPlaceholder')" @keydown.enter="addMemory" />
              <DsButton variant="primary" size="sm" :disabled="!memDraft.trim() || addingMemory" @click="addMemory">
                {{ addingMemory ? t('me.adding') : t('memories.addButton') }}
              </DsButton>
            </div>

            <!-- List -->
            <div v-if="loadingMems" class="me-card-help">{{ t('common.loading') }}</div>
            <div v-else-if="!activeMems.length && !inactiveMems.length" class="mem-empty">
              <p>{{ t('memories.empty') }}</p>
            </div>

            <div v-else class="mem-list">
              <div v-for="m in activeMems" :key="m.id" class="mem-row">
                <span class="mem-origin" :class="m.origin">{{ m.origin }}</span>
                <div class="mem-content">{{ m.content }}</div>
                <button class="mem-del" :title="t('common.delete')" @click="deleteMemory(m.id)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <details v-if="inactiveMems.length" class="mem-inactive">
                <summary>{{ t('memories.archived', { n: inactiveMems.length }) }}</summary>
                <div v-for="m in inactiveMems" :key="m.id" class="mem-row inactive">
                  <span class="mem-origin">{{ m.origin }}</span>
                  <div class="mem-content">{{ m.content }}</div>
                </div>
                <button class="mem-purge" @click="purgeInactive">{{ t('memories.purgeArchived') }}</button>
              </details>
            </div>
          </div>
        </template>

        <!-- Appearance -->
        <template v-else-if="tab === 'appearance'">
          <!-- Theme -->
          <div class="me-card">
            <h2>{{ t('theme.title') }}</h2>
            <p class="me-card-help">{{ t('me.themeHelp') }}</p>
            <div class="theme-grid">
              <button
                v-for="opt in themeOptions"
                :key="opt.value"
                class="theme-card"
                :class="[`theme-card-${opt.value}`, { active: theme === opt.value }]"
                @click="setTheme(opt.value)"
              >
                <div class="theme-preview" :class="`tp-${opt.value}`">
                  <div class="tp-sidebar"></div>
                  <div class="tp-main">
                    <div class="tp-bar"></div>
                    <div class="tp-line"></div>
                    <div class="tp-line short"></div>
                  </div>
                </div>
                <span class="theme-label">{{ opt.label }}</span>
                <span v-if="theme === opt.value" class="theme-check">✓</span>
              </button>
            </div>
          </div>

          <!-- Density + Motion + Language -->
          <div class="me-card">
            <h2>{{ t('me.interfaceSection') }}</h2>
            <div class="appearance-grid">
              <div class="field">
                <label>{{ t('theme.density') }}</label>
                <DsDropdown
                  :model-value="density"
                  :options="[
                    { value: 'comfortable', label: t('theme.comfortable') },
                    { value: 'compact',     label: t('theme.compact') },
                  ]"
                  @update:model-value="setDensity"
                />
              </div>
              <div class="field">
                <label>{{ t('theme.motion') }}</label>
                <DsDropdown
                  :model-value="motion"
                  :options="[
                    { value: 'system',  label: t('theme.motionFollowSystem') },
                    { value: 'full',    label: t('theme.motionFull') },
                    { value: 'reduced', label: t('theme.motionReduced') },
                  ]"
                  @update:model-value="setMotion"
                />
              </div>
              <div class="field">
                <label>{{ t('me.language') }}</label>
                <DsDropdown
                  :model-value="form.language || 'en'"
                  :options="[{value:'en', label:'🇬🇧 English'},{value:'vi', label:'🇻🇳 Tiếng Việt'}]"
                  @update:model-value="setLanguage"
                />
              </div>
              <div class="field">
                <label>{{ t('me.timezone') }}</label>
                <DsInput v-model="form.timezone" placeholder="Asia/Ho_Chi_Minh" />
              </div>
            </div>
            <div class="card-foot">
              <span v-if="profileDirty" class="dirty">{{ t('me.unsavedChanges') }}</span>
              <DsButton variant="primary" :disabled="!profileDirty || savingProfile" @click="saveProfile">
                {{ t('common.save') }}
              </DsButton>
            </div>
          </div>
        </template>

        <!-- API Keys -->
        <template v-else-if="tab === 'api'">
          <div class="me-card">
            <h2>{{ t('me.tabApiKeys') }}</h2>
            <p class="me-card-help">
              {{ t('me.apiKeysHelp') }}
              <NuxtLink v-if="canApi" to="/api-token">{{ t('me.openApiTokens') }}</NuxtLink>
              <span v-else>{{ t('me.apiKeysNoPermission') }}</span>
            </p>
          </div>
        </template>

      </section>
    </div>
  </div>
</template>

<script setup>
import { COUNTRIES } from '~/composables/useOrgConstants.js'

const { apiFetch } = useApi()
const { show: showToast } = useToast()
const { t, setLocale } = useI18n()
const { can } = usePermission()
const auth = useAuthStore()
const { theme, density, motion, setTheme, setDensity, setMotion } = useTheme()

const themeOptions = computed(() => [
  { value: 'system', label: t('theme.system') },
  { value: 'light',  label: t('theme.light') },
  { value: 'dark',   label: t('theme.dark') },
])

// ── Memories ──────────────────────────────────────────────
const memories      = ref([])
const loadingMems   = ref(false)
const memDraft      = ref('')
const addingMemory  = ref(false)

const activeMems   = computed(() => memories.value.filter(m => m.is_active))
const inactiveMems = computed(() => memories.value.filter(m => !m.is_active))

async function loadMemories() {
  loadingMems.value = true
  try {
    const data = await apiFetch('/api/me/memories', { _skipLoader: true })
    memories.value = data.items || []
  } finally {
    loadingMems.value = false
  }
}

async function addMemory() {
  const text = memDraft.value.trim()
  if (!text) return
  addingMemory.value = true
  try {
    const m = await apiFetch('/api/me/memories', {
      method: 'POST', body: { content: text }, _skipLoader: true,
    })
    memories.value.unshift(m)
    memDraft.value = ''
    showToast(t('memories.added'), 'success')
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  } finally {
    addingMemory.value = false
  }
}

async function deleteMemory(id) {
  try {
    await apiFetch(`/api/me/memories/${id}`, { method: 'DELETE', _skipLoader: true })
    const m = memories.value.find(x => x.id === id)
    if (m) m.is_active = false
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  }
}

async function purgeInactive() {
  try {
    await apiFetch('/api/me/memories', { method: 'DELETE', _skipLoader: true })
    memories.value = memories.value.filter(m => m.is_active)
    showToast(t('memories.purged'), 'success')
  } catch (e) {
    showToast(e?.data?.error || 'Failed', 'error')
  }
}

const me = ref(null)
const loading = ref(true)
const tab = ref('profile')

watch(tab, (v) => {
  if (v === 'memories' && !memories.value.length) loadMemories()
})
const savingProfile = ref(false)

const tabs = computed(() => [
  { id: 'profile',    label: t('me.tabProfile'),    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>' },
  { id: 'security',   label: t('me.tabSecurity'),   icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
  { id: 'memories',   label: t('me.tabMemories'),   icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M19 4h2M20 3v2M19 11h2M20 10v2"/></svg>' },
  { id: 'appearance', label: t('me.tabAppearance'), icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>' },
  { id: 'api',        label: t('me.tabApiKeys'),    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="9" r="5"/><path d="m14 14 7 7M14 9h7M17.5 5.5v7"/></svg>' },
])

const form = reactive({
  full_name: '', display_name: '', phone: '',
  country_code: '', timezone: '', language: 'en',
})

const profileDirty = computed(() => {
  if (!me.value) return false
  return ['full_name','display_name','phone','country_code','timezone','language']
    .some(k => (form[k] || '') !== (me.value[k] || ''))
})

const initials = computed(() => {
  const u = me.value?.display_name || me.value?.full_name || me.value?.username || ''
  return (u || '??').slice(0, 2).toUpperCase()
})

const roleLabel = computed(() => {
  const role = auth.user?.role
  if (!role) return '—'
  const r = (auth.roles ?? []).find(x => x.name === role)
  return r?.display_name || role
})

const canApi = computed(() => can('api_tokens', 'view'))

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

function fillForm() {
  form.full_name    = me.value.full_name || ''
  form.display_name = me.value.display_name || ''
  form.phone        = me.value.phone || ''
  form.country_code = me.value.country_code || ''
  form.timezone     = me.value.timezone || ''
  form.language     = me.value.language || 'en'
}

async function load() {
  loading.value = true
  try {
    me.value = await apiFetch('/api/me', { _skipLoader: true })
    fillForm()
    if (me.value.password_must_change) tab.value = 'security'
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  savingProfile.value = true
  try {
    const updated = await apiFetch('/api/me', {
      method: 'PATCH', body: { ...form }, _skipLoader: true,
    })
    me.value = { ...me.value, ...updated }
    fillForm()
    // sync into auth store snapshot
    if (auth.user) {
      auth.user = { ...auth.user, language: updated.language, display_name: updated.display_name }
    }
    showToast(t('me.profileSaved'), 'success')
  } catch (e) {
    showToast(e?.data?.error || 'Failed to save', 'error')
  } finally {
    savingProfile.value = false
  }
}

async function setLanguage(lang) {
  form.language = lang
  setLocale(lang)
}

async function onPasswordChanged() {
  // After change, BE bumped permission_version → next API call may 401.
  // Reload my profile to refresh password_changed_at.
  await load()
}

function onAvatarChange(url) {
  if (auth.user) auth.user = { ...auth.user, avatar_url: url || null }
}

onMounted(load)
</script>

<style scoped>
.me-page { max-width: 960px; margin: 0 auto; padding: 28px 32px 64px; }
.me-head { margin-bottom: 22px; }
.me-head h1 {
  font-family: var(--font-serif); font-weight: 400; font-size: 26px;
  margin: 0 0 4px;
}
.me-head p { margin: 0; color: var(--fg-dim); font-size: 13px; }

.me-state { padding: 60px; text-align: center; color: var(--fg-mute); }

.me-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 28px;
}

.me-nav {
  display: flex; flex-direction: column; gap: 2px;
  position: sticky; top: 24px; align-self: start;
}
.me-nav button {
  appearance: none; background: transparent; border: 0;
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--fg-dim);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  transition: color .12s, background .12s;
  font-family: inherit;
}
.me-nav button:hover { color: var(--fg); background: rgba(255,255,255,0.04); }
.me-nav button.active {
  color: var(--accent);
  background: rgba(216,255,91,0.07);
}
.me-nav-ic { display: grid; place-items: center; flex-shrink: 0; }

.me-section { display: flex; flex-direction: column; gap: 18px; }

.me-card {
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 22px 24px;
}
.me-card.slim { padding: 18px 22px; }
.me-card h2 {
  margin: 0 0 18px;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 18px;
}
.me-card-help {
  color: var(--fg-dim);
  font-size: 12.5px;
  margin: 0 0 14px;
}
.me-card-help a { color: var(--accent); }

.profile-split {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 28px;
  align-items: start;
}
.profile-fields { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.field label {
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--fg-mute);
}
.field-hint {
  color: var(--fg-faint); font-size: 10.5px; margin-top: 4px;
}

.card-foot {
  margin-top: 18px;
  display: flex; align-items: center; gap: 12px;
  justify-content: flex-end;
}
.dirty {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--warn);
}

.info-grid {
  display: grid;
  grid-template-columns: 130px 1fr;
  row-gap: 8px;
  column-gap: 16px;
  margin: 0;
  font-size: 12.5px;
}
.info-grid dt {
  color: var(--fg-mute);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.info-grid dd { margin: 0; color: var(--fg); }

/* ── Theme picker cards ─────────────────────────────────── */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.theme-card {
  appearance: none;
  background: var(--bg-elev);
  border: 2px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  display: flex; flex-direction: column;
  align-items: stretch; gap: 8px;
  text-align: left;
  position: relative;
  transition: border-color .15s, transform .15s;
}
.theme-card:hover { border-color: var(--line-2); }
.theme-card.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 12%, transparent);
}
.theme-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--fg);
}
.theme-check {
  position: absolute;
  top: 8px; right: 10px;
  color: var(--accent);
  font-weight: 800;
  font-size: 13px;
}

/* Mini-preview painted with fixed colors so the card always looks right
   regardless of current global theme. */
.theme-preview {
  display: grid;
  grid-template-columns: 22px 1fr;
  height: 60px;
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
}
.tp-dark .tp-sidebar { background: #0f0f11; border-right: 1px solid rgba(255,255,255,0.06); }
.tp-dark .tp-main    { background: #131316; padding: 6px; display: flex; flex-direction: column; gap: 5px; }
.tp-dark .tp-bar     { height: 6px; background: #d8ff5b; border-radius: 2px; width: 50%; }
.tp-dark .tp-line    { height: 4px; background: rgba(237,237,236,0.18); border-radius: 2px; }
.tp-dark .tp-line.short { width: 60%; }

.tp-light .tp-sidebar { background: #f4f4ef; border-right: 1px solid rgba(0,0,0,0.05); }
.tp-light .tp-main    { background: #ffffff; padding: 6px; display: flex; flex-direction: column; gap: 5px; }
.tp-light .tp-bar     { height: 6px; background: #5b8a00; border-radius: 2px; width: 50%; }
.tp-light .tp-line    { height: 4px; background: rgba(0,0,0,0.15); border-radius: 2px; }
.tp-light .tp-line.short { width: 60%; }

.tp-system { background: linear-gradient(135deg, #131316 0%, #131316 49%, #ffffff 51%, #ffffff 100%); position: relative; }
.tp-system .tp-sidebar { background: linear-gradient(135deg, #0f0f11 0%, #0f0f11 49%, #f4f4ef 51%, #f4f4ef 100%); border: 0; }
.tp-system .tp-main    { padding: 6px; display: flex; flex-direction: column; gap: 5px; background: transparent; }
.tp-system .tp-bar     {
  height: 6px; width: 50%; border-radius: 2px;
  background: linear-gradient(90deg, #d8ff5b 0%, #d8ff5b 49%, #5b8a00 51%, #5b8a00 100%);
}
.tp-system .tp-line    {
  height: 4px; border-radius: 2px;
  background: linear-gradient(90deg, rgba(237,237,236,0.25) 0%, rgba(237,237,236,0.25) 49%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0.15) 100%);
}
.tp-system .tp-line.short { width: 60%; }

/* Appearance grid */
.appearance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

/* Memories */
.mem-add {
  display: flex; gap: 8px;
  margin-bottom: 16px;
}
.mem-add > :first-child { flex: 1; min-width: 0; }

.mem-empty {
  padding: 24px;
  text-align: center;
  color: var(--fg-mute);
  font-size: 12.5px;
}

.mem-list { display: flex; flex-direction: column; gap: 4px; }
.mem-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--line);
  border-radius: 8px;
  transition: background .12s;
}
.mem-row:hover { background: rgba(255,255,255,0.04); }
.mem-row.inactive { opacity: 0.55; }

.mem-origin {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.mem-origin.auto   { background: rgba(216,255,91,0.08); color: var(--accent); }
.mem-origin.manual { background: rgba(96,165,250,0.1);  color: var(--info); }

.mem-content {
  flex: 1; min-width: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--fg);
}
.mem-del {
  background: transparent; border: 0;
  color: var(--fg-mute);
  width: 24px; height: 24px;
  border-radius: 6px;
  cursor: pointer;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.mem-del:hover { background: rgba(239,68,68,0.1); color: var(--danger); }

.mem-inactive {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.mem-inactive summary {
  cursor: pointer;
  font-size: 11.5px;
  color: var(--fg-mute);
  margin-bottom: 8px;
}
.mem-purge {
  margin-top: 10px;
  background: transparent; border: 1px solid rgba(239,68,68,0.25);
  color: var(--danger);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
}
.mem-purge:hover { background: rgba(239,68,68,0.08); }

@media (max-width: 1024px) {
  .me-page { padding: 20px 20px 48px; }
  .me-layout { grid-template-columns: 160px 1fr; gap: 20px; }
}

@media (max-width: 768px) {
  .me-page { padding: 16px 12px 40px; }
  .me-layout { grid-template-columns: 1fr; gap: 0; }
  .me-nav {
    flex-direction: row; flex-wrap: wrap;
    position: static;
    gap: 4px;
    margin-bottom: 16px;
  }
  .me-nav button { width: auto; padding: 6px 12px; }
  .profile-split { grid-template-columns: 1fr; gap: 16px; }
  .row-2 { grid-template-columns: 1fr; }
  .me-card { padding: 16px; }
}
</style>
