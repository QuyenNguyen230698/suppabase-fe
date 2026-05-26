<template>
  <div class="design-page">

      <!-- Page header -->
      <div class="page-header">
        <div class="header-left">
<h1 class="page-title">Design System</h1>
          <p class="page-sub">Click any component to open the live editor.</p>
        </div>
        <div class="header-right">
          <DsInput v-model="search" placeholder="Search components…" :clearable="true" style="min-width:200px">
            <template #prefix>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </template>
          </DsInput>
        </div>
      </div>

      <!-- Split pane body -->
      <div class="body-pane">

        <!-- LEFT: component list -->
        <div class="list-panel" :class="{ collapsed: !!selected }">

          <!-- List header -->
          <div class="table-head" :class="{ compact: !!selected }">
            <template v-if="!selected">
              <span>Component</span>
              <span>Category</span>
              <span>Props</span>
              <span></span>
            </template>
            <template v-else>
              <span>Component</span>
              <span></span>
            </template>
          </div>

          <!-- Rows -->
          <div class="list-rows">
            <!-- Compact rows (when detail open) -->
            <template v-if="selected">
              <div
                v-for="item in filteredItems"
                :key="item.id"
                class="compact-row"
                :class="{ selected: selected?.id === item.id }"
                @click="selectItem(item)"
              >
                <div class="compact-avatar">{{ item.abbr }}</div>
                <div class="compact-info">
                  <div class="compact-name">{{ item.label }}</div>
                  <div class="compact-meta">{{ item.group }}</div>
                </div>
                <span class="status-badge" :class="item.groupClass">{{ item.group }}</span>
              </div>
            </template>

            <!-- Full rows -->
            <template v-else>
              <div
                v-for="item in filteredItems"
                :key="item.id"
                class="table-row"
                :class="{ selected: selected?.id === item.id }"
                @click="selectItem(item)"
              >
                <div class="cell-name">
                  <span class="cell-abbr">{{ item.abbr }}</span>
                  {{ item.label }}
                </div>
                <div><span class="status-badge" :class="item.groupClass">{{ item.group }}</span></div>
                <div class="cell-meta">{{ item.props }}</div>
                <div class="cell-action">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </div>
            </template>
          </div>

          <div class="table-footer">
            {{ filteredItems.length }} component{{ filteredItems.length !== 1 ? 's' : '' }}
          </div>
        </div>

        <!-- RIGHT: detail / editor panel -->
        <transition name="panel">
          <div v-if="selected" class="detail-panel">

            <!-- Panel header -->
            <div class="detail-head">
              <div class="detail-avatar">{{ selected.abbr }}</div>
              <div class="detail-title-block">
                <div class="detail-name">{{ selected.label }}</div>
                <div class="detail-prefix">{{ selected.group }} · {{ selected.props }}</div>
              </div>
              <span class="status-badge lg" :class="selected.groupClass">{{ selected.group }}</span>
              <button class="close-btn" @click="selected = null" title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Scrollable detail body -->
            <div class="detail-body">

              <!-- ── BUTTON ── -->
              <template v-if="selected.id === 'button'">
                <div class="detail-preview">
                  <DsButton :variant="btn.variant" :size="btn.size" :disabled="btn.disabled">
                    <svg v-if="btn.icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    {{ btn.label }}
                  </DsButton>
                </div>
                <div class="detail-controls">
                  <div class="ctrl-row"><span class="ctrl-label">variant</span>
                    <div class="ctrl-options">
                      <button v-for="v in ['default','primary','danger','ghost-danger']" :key="v" class="ctrl-opt" :class="{ active: btn.variant===v }" @click="btn.variant=v">{{ v }}</button>
                    </div>
                  </div>
                  <div class="ctrl-row"><span class="ctrl-label">size</span>
                    <div class="ctrl-options">
                      <button v-for="v in ['md','sm']" :key="v" class="ctrl-opt" :class="{ active: btn.size===v }" @click="btn.size=v">{{ v }}</button>
                    </div>
                  </div>
                  <div class="ctrl-row"><span class="ctrl-label">label</span><input class="ctrl-text" v-model="btn.label" /></div>
                  <div class="ctrl-row"><span class="ctrl-label">icon</span><button class="ctrl-toggle" :class="{ on: btn.icon }" @click="btn.icon=!btn.icon">{{ btn.icon?'on':'off' }}</button></div>
                  <div class="ctrl-row"><span class="ctrl-label">disabled</span><button class="ctrl-toggle" :class="{ on: btn.disabled }" @click="btn.disabled=!btn.disabled">{{ btn.disabled?'on':'off' }}</button></div>
                </div>
                <div class="detail-variants">
                  <div class="dv-label">All variants — click to copy code</div>
                  <div class="dv-row">
                    <DsClickCode code='<DsButton variant="primary">Primary</DsButton>'><DsButton variant="primary">Primary</DsButton></DsClickCode>
                    <DsClickCode code='<DsButton>Default</DsButton>'><DsButton>Default</DsButton></DsClickCode>
                    <DsClickCode code='<DsButton variant="danger">Danger</DsButton>'><DsButton variant="danger">Danger</DsButton></DsClickCode>
                    <DsClickCode code='<DsButton variant="ghost-danger">Ghost</DsButton>'><DsButton variant="ghost-danger">Ghost</DsButton></DsClickCode>
                    <DsClickCode code='<DsButton disabled>Disabled</DsButton>'><DsButton disabled>Disabled</DsButton></DsClickCode>
                  </div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    Generated code
                  </div>
                  <DsCodeBlock :code="generatedBtnCode" />
                </div>
              </template>

              <!-- ── BADGE ── -->
              <template v-else-if="selected.id === 'badge'">
                <div class="detail-preview">
                  <DsBadge :status="badge.status" :size="badge.size" :dot="badge.dot">{{ badge.label }}</DsBadge>
                </div>
                <div class="detail-controls">
                  <div class="ctrl-row"><span class="ctrl-label">status</span>
                    <div class="ctrl-options">
                      <button v-for="v in ['default','active','revoked']" :key="v" class="ctrl-opt" :class="{ active: badge.status===v }" @click="badge.status=v">{{ v }}</button>
                    </div>
                  </div>
                  <div class="ctrl-row"><span class="ctrl-label">size</span>
                    <div class="ctrl-options">
                      <button v-for="v in ['sm','lg']" :key="v" class="ctrl-opt" :class="{ active: badge.size===v }" @click="badge.size=v">{{ v }}</button>
                    </div>
                  </div>
                  <div class="ctrl-row"><span class="ctrl-label">label</span><input class="ctrl-text" v-model="badge.label" /></div>
                  <div class="ctrl-row"><span class="ctrl-label">dot</span><button class="ctrl-toggle" :class="{ on: badge.dot }" @click="badge.dot=!badge.dot">{{ badge.dot?'on':'off' }}</button></div>
                </div>
                <div class="detail-variants">
                  <div class="dv-label">All variants — click to copy code</div>
                  <div class="dv-row">
                    <DsClickCode code='<DsBadge status="active">active</DsBadge>'><DsBadge status="active">active</DsBadge></DsClickCode>
                    <DsClickCode code='<DsBadge status="revoked">revoked</DsBadge>'><DsBadge status="revoked">revoked</DsBadge></DsClickCode>
                    <DsClickCode code='<DsBadge>default</DsBadge>'><DsBadge>default</DsBadge></DsClickCode>
                    <DsClickCode code='<DsBadge status="active" size="lg">active lg</DsBadge>'><DsBadge status="active" size="lg">active lg</DsBadge></DsClickCode>
                  </div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Generated code</div>
                  <DsCodeBlock :code="generatedBadgeCode" />
                </div>
              </template>

              <!-- ── INPUT ── -->
              <template v-else-if="selected.id === 'input'">
                <div class="detail-preview" style="flex-direction:column;gap:10px;align-items:stretch;padding:20px">
                  <DsInput v-model="inputDemo.value" :placeholder="inputDemo.placeholder" :clearable="inputDemo.clearable" :type="inputDemo.type" :error="inputDemo.error" style="width:260px">
                    <template v-if="inputDemo.icon" #prefix>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    </template>
                  </DsInput>
                </div>
                <div class="detail-controls">
                  <div class="ctrl-row"><span class="ctrl-label">type</span>
                    <div style="display:flex;gap:6px">
                      <button class="ctrl-chip" :class="{active:inputDemo.type==='text'}"     @click="inputDemo.type='text'">text</button>
                      <button class="ctrl-chip" :class="{active:inputDemo.type==='password'}" @click="inputDemo.type='password'">password</button>
                      <button class="ctrl-chip" :class="{active:inputDemo.type==='email'}"    @click="inputDemo.type='email'">email</button>
                    </div>
                  </div>
                  <div class="ctrl-row"><span class="ctrl-label">placeholder</span><input class="ctrl-text" v-model="inputDemo.placeholder" /></div>
                  <div class="ctrl-row"><span class="ctrl-label">icon</span><button class="ctrl-toggle" :class="{ on: inputDemo.icon }" @click="inputDemo.icon=!inputDemo.icon">{{ inputDemo.icon?'on':'off' }}</button></div>
                  <div class="ctrl-row"><span class="ctrl-label">clearable</span><button class="ctrl-toggle" :class="{ on: inputDemo.clearable }" @click="inputDemo.clearable=!inputDemo.clearable">{{ inputDemo.clearable?'on':'off' }}</button></div>
                  <div class="ctrl-row"><span class="ctrl-label">error</span><button class="ctrl-toggle" :class="{ on: inputDemo.error }" @click="inputDemo.error=!inputDemo.error">{{ inputDemo.error?'on':'off' }}</button></div>
                </div>
                <div class="detail-variants">
                  <div class="dv-label">Filter chip — click to copy code</div>
                  <div class="dv-row">
                    <DsClickCode code='<div class="filter-chip">Status</div>'><div class="filter-chip">Status</div></DsClickCode>
                    <DsClickCode code='<div class="filter-chip active">active <button class="chip-clear">×</button></div>'><div class="filter-chip active">active <button class="chip-clear"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div></DsClickCode>
                  </div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Generated code</div>
                  <DsCodeBlock :code="generatedInputCode" />
                </div>
              </template>

              <!-- ── CARD ── -->
              <template v-else-if="selected.id === 'card'">
                <div class="detail-preview" style="align-items:flex-start;padding:20px">
                  <DsCard style="width:100%" :flush="card.flush">
                    <template v-if="card.header" #header>
                      <div style="width:36px;height:36px;border-radius:10px;background:rgba(216,255,91,0.1);color:var(--ds-accent,#d8ff5b);font-size:11px;font-weight:800;display:grid;place-items:center;flex-shrink:0">NK</div>
                      <div style="flex:1;min-width:0">
                        <div style="font-size:13px;font-weight:700;color:#e2e8f0">Production Token</div>
                        <div style="font-size:10px;font-family:ui-monospace,monospace;color:#475569">nk_live_Xk9…</div>
                      </div>
                      <DsBadge status="active">active</DsBadge>
                    </template>
                    <div v-if="card.body" style="display:flex;flex-direction:column;gap:6px">
                      <div style="display:flex;justify-content:space-between"><span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#475569">Created</span><span style="font-size:12px;color:#cbd5e1;font-family:ui-monospace,monospace">Jan 12, 2025</span></div>
                      <div style="display:flex;justify-content:space-between"><span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#475569">Expires</span><span style="font-size:12px;color:#cbd5e1;font-family:ui-monospace,monospace">Never</span></div>
                    </div>
                    <template v-if="card.footer" #footer>
                      <DsButton variant="danger" size="sm"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg> Revoke</DsButton>
                    </template>
                  </DsCard>
                </div>
                <div class="detail-controls">
                  <div class="ctrl-row"><span class="ctrl-label">header</span><button class="ctrl-toggle" :class="{ on: card.header }" @click="card.header=!card.header">{{ card.header?'on':'off' }}</button></div>
                  <div class="ctrl-row"><span class="ctrl-label">body</span><button class="ctrl-toggle" :class="{ on: card.body }" @click="card.body=!card.body">{{ card.body?'on':'off' }}</button></div>
                  <div class="ctrl-row"><span class="ctrl-label">footer</span><button class="ctrl-toggle" :class="{ on: card.footer }" @click="card.footer=!card.footer">{{ card.footer?'on':'off' }}</button></div>
                  <div class="ctrl-row"><span class="ctrl-label">flush</span><button class="ctrl-toggle" :class="{ on: card.flush }" @click="card.flush=!card.flush">{{ card.flush?'on':'off' }}</button></div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Usage</div>
                  <DsCodeBlock :code="cardCode" />
                </div>
              </template>

              <!-- ── EMPTY STATE ── -->
              <template v-else-if="selected.id === 'empty'">
                <div class="detail-preview">
                  <div class="demo-box" style="width:300px;min-height:180px">
                    <DsEmptyState :title="empty.title" :sub="empty.sub">
                      <template #action>
                        <DsButton v-if="empty.cta" variant="primary" size="sm" style="margin-top:8px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> New Token</DsButton>
                      </template>
                    </DsEmptyState>
                  </div>
                </div>
                <div class="detail-controls">
                  <div class="ctrl-row"><span class="ctrl-label">title</span><input class="ctrl-text" v-model="empty.title" /></div>
                  <div class="ctrl-row"><span class="ctrl-label">sub</span><input class="ctrl-text" v-model="empty.sub" /></div>
                  <div class="ctrl-row"><span class="ctrl-label">CTA</span><button class="ctrl-toggle" :class="{ on: empty.cta }" @click="empty.cta=!empty.cta">{{ empty.cta?'on':'off' }}</button></div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Usage</div>
                  <DsCodeBlock :code="emptyCode" />
                </div>
              </template>

              <!-- ── TOAST ── -->
              <template v-else-if="selected.id === 'toast'">
                <div class="detail-preview" style="flex-direction:column;gap:10px;align-items:flex-start">
                  <div v-for="v in toastVariants" :key="v.variant" class="toast-demo" :class="`toast-demo--${v.variant}`">
                    <span class="toast-ic" v-html="v.icon" />
                    <span>{{ v.label }}</span>
                    <button class="toast-demo-close" aria-label="close">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
                    <DsButton v-for="v in toastVariants" :key="v.variant" variant="ghost" size="sm" @click="fireToast(v.variant)">{{ v.variant }} →</DsButton>
                  </div>
                </div>
                <div class="detail-controls">
                  <div class="ctrl-row"><span class="ctrl-label">message</span><input class="ctrl-text" v-model="toast.message" /></div>
                  <div class="ctrl-row">
                    <span class="ctrl-label">variant</span>
                    <div style="display:flex;gap:6px">
                      <button v-for="v in toastVariants" :key="v.variant"
                        class="ctrl-chip" :class="{ active: toast.variant === v.variant }"
                        @click="toast.variant = v.variant">{{ v.variant }}</button>
                    </div>
                  </div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Usage</div>
                  <DsCodeBlock :code="toastCode" />
                </div>
              </template>

              <!-- ── DROPDOWN ── -->
              <template v-else-if="selected.id === 'dropdown'">
                <div class="detail-preview" style="flex-direction:column;gap:12px;align-items:flex-start;min-height:180px">
                  <div style="width:220px">
                    <DsDropdown v-model="dd.value" :options="dd.options" :placeholder="dd.placeholder" :size="dd.size" :disabled="dd.disabled" />
                  </div>
                  <div style="font-size:11px;color:#475569">selected: <span style="color:#d8ff5b">{{ dd.value ?? 'null' }}</span></div>
                </div>
                <div class="detail-controls">
                  <div class="ctrl-row"><span class="ctrl-label">size</span>
                    <div style="display:flex;gap:6px">
                      <button class="ctrl-chip" :class="{active:dd.size==='md'}" @click="dd.size='md'">md</button>
                      <button class="ctrl-chip" :class="{active:dd.size==='sm'}" @click="dd.size='sm'">sm</button>
                    </div>
                  </div>
                  <div class="ctrl-row"><span class="ctrl-label">disabled</span><input type="checkbox" v-model="dd.disabled" /></div>
                  <div class="ctrl-row"><span class="ctrl-label">placeholder</span><input class="ctrl-text" v-model="dd.placeholder" /></div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Usage</div>
                  <DsCodeBlock :code="dropdownCode" />
                </div>
              </template>

              <!-- ── MODAL ── -->
              <template v-else-if="selected.id === 'modal'">
                <div class="detail-preview" style="flex-direction:column;gap:10px;align-items:flex-start">
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <DsButton variant="default" size="sm" @click="modalDemo.size='sm';modalDemo.open=true">Open sm</DsButton>
                    <DsButton variant="default" size="sm" @click="modalDemo.size='md';modalDemo.open=true">Open md</DsButton>
                    <DsButton variant="default" size="sm" @click="modalDemo.size='lg';modalDemo.open=true">Open lg</DsButton>
                  </div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Usage</div>
                  <DsCodeBlock :code="modalCode" />
                </div>
              </template>

              <!-- ── CONFIRM ── -->
              <template v-else-if="selected.id === 'confirm'">
                <div class="detail-preview" style="flex-direction:column;gap:10px;align-items:flex-start">
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <DsButton variant="default" size="sm" @click="demoConfirm('default')">Confirm (default)</DsButton>
                    <DsButton variant="danger"  size="sm" @click="demoConfirm('danger')">Confirm (danger)</DsButton>
                  </div>
                  <div style="font-size:11px;color:#475569">result: <span style="color:#d8ff5b">{{ confirmResult ?? '—' }}</span></div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Usage</div>
                  <DsCodeBlock :code="confirmCode" />
                </div>
              </template>

              <!-- ── CODE BLOCK ── -->
              <template v-else-if="selected.id === 'codeblock'">
                <div class="detail-preview" style="align-items:flex-start;padding:20px">
                  <DsCodeBlock :code="codeblock.code" style="width:100%" />
                </div>
                <div class="detail-controls">
                  <div class="ctrl-row" style="align-items:flex-start">
                    <span class="ctrl-label">code</span>
                    <textarea class="ctrl-text ctrl-textarea" v-model="codeblock.code" rows="5"></textarea>
                  </div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Usage</div>
                  <DsCodeBlock :code="codeBlockUsage" />
                </div>
              </template>

              <!-- ── COLORS ── -->
              <template v-else-if="selected.id === 'colors'">
                <div class="detail-section-inner">
                  <div class="ds-block-title">Accent token</div>
                  <div class="token-editor">
                    <input type="color" v-model="accentColor" class="color-picker" />
                    <code class="token-val">--ds-accent: {{ accentColor }}</code>
                    <DsButton size="sm" @click="accentColor='#d8ff5b'">Reset</DsButton>
                  </div>
                  <div class="ds-block-title" style="margin-top:18px">Surfaces</div>
                  <div class="color-grid">
                    <div v-for="s in colorSurfaces" :key="s.name" class="color-swatch" :style="s.style" @click="copyText(s.css)" title="Click to copy">
                      <span class="swatch-label">{{ s.hex }}<br><small>{{ s.name }}</small></span>
                    </div>
                  </div>
                  <div class="ds-block-title" style="margin-top:18px">Semantic</div>
                  <div class="color-grid">
                    <div v-for="s in colorSemantic" :key="s.name" class="color-swatch" :style="s.style" @click="copyText(s.css)" title="Click to copy">
                      <span class="swatch-label">{{ s.hex }}<br><small>{{ s.name }}</small></span>
                    </div>
                  </div>
                  <div class="ds-block-title" style="margin-top:18px">Text</div>
                  <div class="color-grid">
                    <div v-for="t in colorText" :key="t.name" class="color-swatch text-swatch" @click="copyText(t.css)" title="Click to copy">
                      <span :style="{ color: t.hex, fontSize:'18px', fontWeight:'700' }">Aa</span>
                      <span class="swatch-label">{{ t.hex }}<br><small>{{ t.name }}</small></span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- ── TYPOGRAPHY ── -->
              <template v-else-if="selected.id === 'typography'">
                <div class="detail-section-inner">
                  <div class="ds-block-title">Type scale — click row to copy CSS</div>
                  <div class="type-stack">
                    <div v-for="t in typeScale" :key="t.name" class="type-row" @click="copyText(t.css)" title="Click to copy">
                      <span class="type-sample" :style="t.style">{{ t.label }}</span>
                      <div class="type-meta-group">
                        <span class="type-tag">{{ t.name }}</span>
                        <span class="type-spec">{{ t.spec }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="ds-block-title" style="margin-top:18px">Font stacks</div>
                  <div class="font-stack-list">
                    <div class="font-stack-row" @click="copyText('font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;')" title="Click to copy"><span class="font-stack-name">Sans</span><code class="font-stack-val">ui-sans-serif, system-ui, -apple-system, sans-serif</code></div>
                    <div class="font-stack-row" @click="copyText('font-family: ui-monospace, monospace;')" title="Click to copy"><span class="font-stack-name">Mono</span><code class="font-stack-val">ui-monospace, monospace</code></div>
                  </div>
                </div>
              </template>

              <!-- ── SPACING ── -->
              <template v-else-if="selected.id === 'spacing'">
                <div class="detail-section-inner">
                  <div class="ds-block-title">4px base grid — click row to copy</div>
                  <div class="spacing-list">
                    <div v-for="s in spacingScale" :key="s.px" class="spacing-row clickable" @click="copyText(`padding: ${s.px}px; /* space-${s.name} */`)" title="Click to copy">
                      <span class="spacing-token">{{ s.name }}</span>
                      <div class="spacing-bar-wrap"><div class="spacing-bar" :style="{ width: s.px*3+'px' }"></div></div>
                      <span class="spacing-px">{{ s.px }}px</span>
                      <span class="spacing-rem">{{ (s.px/16).toFixed(3).replace(/\.?0+$/,'') }}rem</span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- ── TABLE ── -->
              <template v-else-if="selected.id === 'table'">
                <div class="detail-section-inner">
                  <div class="ds-block-title">Full rows</div>
                  <div class="demo-box">
                    <div class="table-head-demo"><span>Name</span><span>Prefix</span><span>Status</span><span></span></div>
                    <div class="table-row-demo selected"><div class="cell-name">Production</div><div class="cell-mono">nk_live_X9…</div><div><DsBadge status="active">active</DsBadge></div><div class="cell-action"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div></div>
                    <div class="table-row-demo"><div class="cell-name">Staging</div><div class="cell-mono">nk_live_Y3…</div><div><DsBadge status="revoked">revoked</DsBadge></div><div class="cell-action"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div></div>
                  </div>
                  <div class="ds-block-title" style="margin-top:18px">Compact rows</div>
                  <div class="demo-box">
                    <div class="compact-row selected"><div class="compact-avatar">PR</div><div class="compact-info"><div class="compact-name">Production</div><div class="compact-meta">nk_live_X9…</div></div><DsBadge status="active">active</DsBadge></div>
                    <div class="compact-row"><div class="compact-avatar">ST</div><div class="compact-info"><div class="compact-name">Staging</div><div class="compact-meta">nk_live_Y3…</div></div><DsBadge status="revoked">revoked</DsBadge></div>
                  </div>
                </div>
                <div class="detail-code-section">
                  <div class="dcs-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Table row</div>
                  <DsCodeBlock :code="tableRowCode" />
                </div>
              </template>

            </div><!-- /detail-body -->

          </div><!-- /detail-panel -->
        </transition>

      </div><!-- /body-pane -->


    <!-- Modal demo -->
    <DsModal v-model="modalDemo.open" title="Modal preview" :size="modalDemo.size">
      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">This is a <strong style="color:#e2e8f0">{{ modalDemo.size }}</strong> modal. Click outside or press Esc to close.</p>
      <template #footer>
        <DsButton variant="ghost" @click="modalDemo.open=false">Cancel</DsButton>
        <DsButton variant="primary" @click="modalDemo.open=false">Confirm</DsButton>
      </template>
    </DsModal>

    <!-- Copy feedback toast -->
    <transition name="panel">
      <div v-if="copyFeedback" class="copy-feedback">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>
        Copied!
      </div>
    </transition>

  </div>
</template>

<script setup>

const search = ref('')
const selected = ref(null)

// accent CSS var
const accentColor = ref('#d8ff5b')
watch(accentColor, val => {
  if (import.meta.client) document.documentElement.style.setProperty('--ds-accent', val)
}, { immediate: true })

// ── Component list ────────────────────────────────
const allItems = [
  { id: 'colors',     label: 'Colors',      abbr: 'CL', group: 'Foundation', groupClass: 'foundation', props: 'accent, surface, semantic, text' },
  { id: 'typography', label: 'Typography',  abbr: 'TY', group: 'Foundation', groupClass: 'foundation', props: 'scale, font-stack, letter-spacing' },
  { id: 'spacing',    label: 'Spacing',     abbr: 'SP', group: 'Foundation', groupClass: 'foundation', props: '4px grid, 10 steps' },
  { id: 'button',     label: 'Button',      abbr: 'Bt', group: 'Component',  groupClass: 'component',  props: 'variant, size, disabled, iconOnly' },
  { id: 'badge',      label: 'Badge',       abbr: 'Bd', group: 'Component',  groupClass: 'component',  props: 'status, size, dot' },
  { id: 'input',      label: 'Input',       abbr: 'In', group: 'Component',  groupClass: 'component',  props: 'v-model, type, clearable, error' },
  { id: 'dropdown',   label: 'Dropdown',    abbr: 'Dd', group: 'Component',  groupClass: 'component',  props: 'v-model, options, size, align' },
  { id: 'modal',      label: 'Modal',       abbr: 'Mo', group: 'Component',  groupClass: 'component',  props: 'v-model, title, size sm/md/lg' },
  { id: 'card',       label: 'Card',        abbr: 'Cd', group: 'Component',  groupClass: 'component',  props: 'header, body, footer, flush' },
  { id: 'table',      label: 'Table',       abbr: 'Tb', group: 'Component',  groupClass: 'component',  props: 'full-row, compact-row, selected' },
  { id: 'codeblock',  label: 'Code Block',  abbr: 'CB', group: 'Component',  groupClass: 'component',  props: 'code, copy button' },
  { id: 'empty',      label: 'Empty State', abbr: 'ES', group: 'Pattern',    groupClass: 'pattern',    props: 'title, sub, action slot' },
  { id: 'toast',      label: 'Toast',       abbr: 'To', group: 'Pattern',    groupClass: 'pattern',    props: 'variant, auto-dismiss, queue max 3' },
  { id: 'confirm',    label: 'Confirm',     abbr: 'Cf', group: 'Pattern',    groupClass: 'pattern',    props: 'title, message, variant, Promise' },
]

const filteredItems = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return allItems
  return allItems.filter(i =>
    i.label.toLowerCase().includes(q) ||
    i.group.toLowerCase().includes(q) ||
    i.props.toLowerCase().includes(q)
  )
})

function selectItem(item) {
  selected.value = item
}

// ── Color data ────────────────────────────────────
const colorSurfaces = [
  { name: 'shell',    hex: '#0b0b0c', css: 'background: #0b0b0c;',  style: 'background:#0b0b0c;border:1px solid rgba(255,255,255,0.07)' },
  { name: 'panel',    hex: '#111113', css: 'background: #111113;',  style: 'background:#111113;border:1px solid rgba(255,255,255,0.07)' },
  { name: 'elevated', hex: '#1c1c22', css: 'background: #1c1c22;', style: 'background:#1c1c22;border:1px solid rgba(255,255,255,0.07)' },
  { name: 'code-bg',  hex: '#08080a', css: 'background: #08080a;', style: 'background:#08080a;border:1px solid rgba(255,255,255,0.07)' },
]
const colorSemantic = [
  { name: 'success', hex: '#34d399', css: 'color: #34d399;\nbackground: rgba(52,211,153,0.1);\nborder-color: rgba(52,211,153,0.25);', style: 'background:rgba(52,211,153,0.15);border:1px solid rgba(52,211,153,0.3)' },
  { name: 'danger',  hex: '#f87171', css: 'color: #f87171;\nbackground: rgba(239,68,68,0.05);\nborder-color: rgba(248,113,113,0.25);', style: 'background:rgba(239,68,68,0.12);border:1px solid rgba(248,113,113,0.3)' },
  { name: 'warning', hex: '#fbbf24', css: 'color: #fbbf24;\nbackground: rgba(251,191,36,0.1);\nborder-color: rgba(251,191,36,0.25);', style: 'background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3)' },
  { name: 'info',    hex: '#60a5fa', css: 'color: #60a5fa;\nbackground: rgba(96,165,250,0.1);\nborder-color: rgba(96,165,250,0.25);', style: 'background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.3)' },
]
const colorText = [
  { name: 'primary',   hex: '#e2e8f0', css: 'color: #e2e8f0; /* text-primary */' },
  { name: 'secondary', hex: '#94a3b8', css: 'color: #94a3b8; /* text-secondary */' },
  { name: 'muted',     hex: '#475569', css: 'color: #475569; /* text-muted */' },
  { name: 'disabled',  hex: '#334155', css: 'color: #334155; /* text-disabled */' },
]

// ── Type scale ────────────────────────────────────
const typeScale = [
  { name: 'display',  label: 'Display — 28 / 800',     spec: '28px · 800 · -0.03em', css: 'font-size: 28px;\nfont-weight: 800;\nletter-spacing: -0.03em;', style: { fontSize:'28px', fontWeight:'800', letterSpacing:'-0.03em', color:'#e2e8f0' } },
  { name: 'h1',       label: 'Heading — 22 / 800',     spec: '22px · 800 · -0.02em', css: 'font-size: 22px;\nfont-weight: 800;\nletter-spacing: -0.02em;', style: { fontSize:'22px', fontWeight:'800', letterSpacing:'-0.02em', color:'#e2e8f0' } },
  { name: 'h2',       label: 'Title — 16 / 700',       spec: '16px · 700',           css: 'font-size: 16px;\nfont-weight: 700;', style: { fontSize:'16px', fontWeight:'700', color:'#e2e8f0' } },
  { name: 'body',     label: 'Body — 14 / 600',        spec: '14px · 600',           css: 'font-size: 14px;\nfont-weight: 600;', style: { fontSize:'14px', fontWeight:'600', color:'#e2e8f0' } },
  { name: 'small',    label: 'Small — 13 / 500',       spec: '13px · 500',           css: 'font-size: 13px;\nfont-weight: 500;', style: { fontSize:'13px', fontWeight:'500', color:'#e2e8f0' } },
  { name: 'caption',  label: 'Caption — 12 / 400',     spec: '12px · 400',           css: 'font-size: 12px;\ncolor: #94a3b8;', style: { fontSize:'12px', color:'#94a3b8' } },
  { name: 'mono',     label: 'Mono — 11px',            spec: '11px · ui-monospace',  css: 'font-size: 11px;\nfont-family: ui-monospace, monospace;\ncolor: #64748b;', style: { fontSize:'11px', fontFamily:'ui-monospace,monospace', color:'#64748b' } },
  { name: 'label',    label: 'LABEL — 10 / 800 CAPS',  spec: '10px · 800 · +0.1em',  css: 'font-size: 10px;\nfont-weight: 800;\nletter-spacing: 0.1em;\ntext-transform: uppercase;\ncolor: #475569;', style: { fontSize:'10px', fontWeight:'800', letterSpacing:'0.1em', textTransform:'uppercase', color:'#475569' } },
]

// ── Spacing ───────────────────────────────────────
const spacingScale = [
  { name:'1', px:4 },{ name:'2', px:8 },{ name:'3', px:12 },{ name:'4', px:16 },
  { name:'5', px:20 },{ name:'6', px:24 },{ name:'7', px:28 },{ name:'8', px:32 },
  { name:'10', px:40 },{ name:'12', px:48 },
]

// ── Live editor state ─────────────────────────────
const btn = reactive({ variant:'primary', size:'md', label:'New Token', icon:true, disabled:false })
const badge = reactive({ status:'active', size:'sm', label:'active', dot:true })
const inputDemo = reactive({ value:'', placeholder:'Search tokens…', icon:true, clearable:true, type:'text', error:false })
const card = reactive({ header:true, body:true, footer:true, flush:false })
const empty = reactive({ title:'No tokens found', sub:'Create your first token to use the API.', cta:true })
const toast = reactive({ message: 'Token created', variant: 'success' })

const toastVariants = [
  { variant: 'success', label: 'Token created successfully', icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>` },
  { variant: 'error',   label: 'Something went wrong',       icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>` },
  { variant: 'warning', label: 'Token expires in 24h',        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
  { variant: 'info',    label: 'New update available',        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>` },
]
const codeblock = reactive({ code:`curl -X POST https://api.nocturne.app/v1/chat \\\n  -H "Authorization: Bearer nk_live_Xk9..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"nocturne-1","messages":[{"role":"user","content":"Hello"}]}'` })

// ── Generated code ────────────────────────────────
const generatedBtnCode = computed(() => {
  const icon = btn.icon ? '\n  <PlusIcon width="13" height="13" />' : ''
  const dis = btn.disabled ? ' disabled' : ''
  const size = btn.size !== 'md' ? ` size="${btn.size}"` : ''
  const variant = btn.variant !== 'default' ? ` variant="${btn.variant}"` : ''
  return `<DsButton${variant}${size}${dis}>${icon}\n  ${btn.label}\n</DsButton>`
})

const generatedBadgeCode = computed(() => {
  const s = badge.status !== 'default' ? ` status="${badge.status}"` : ''
  const sz = badge.size !== 'sm' ? ` size="${badge.size}"` : ''
  const d = !badge.dot ? ' :dot="false"' : ''
  return `<DsBadge${s}${sz}${d}>${badge.label}</DsBadge>`
})

const generatedInputCode = computed(() => {
  const icon = inputDemo.icon ? `\n  <template #prefix>\n    <SearchIcon />\n  </template>` : ''
  const clear = inputDemo.clearable ? ' :clearable="true"' : ''
  return `<DsInput v-model="q" placeholder="${inputDemo.placeholder}"${clear}>${icon}\n</DsInput>`
})

// ── Static code snippets ──────────────────────────
const cardCode = `<DsCard>
  <template #header>
    <!-- avatar + title + badge -->
  </template>

  <!-- body content -->

  <template #footer>
    <DsButton variant="danger" size="sm">Revoke</DsButton>
  </template>
</DsCard>`

const emptyCode = `<DsEmptyState
  title="No tokens found"
  sub="Create your first token."
>
  <template #action>
    <DsButton variant="primary" size="sm">New Token</DsButton>
  </template>
</DsEmptyState>`

const toastCode = `<!-- add once — renders via Teleport, no props needed -->
<DsToast />

<!-- anywhere in script -->
const { show } = useToast()

// variant: 'success' | 'error' | 'warning' | 'info'
show('Token created')
show('Something went wrong', 'error')
show('Expires soon', 'warning')
show('Update available', 'info')`

const tableRowCode = `<div class="table-row" :class="{ selected }" @click="select(item)">
  <div class="cell-name">{{ item.name }}</div>
  <div class="cell-mono">{{ item.prefix }}</div>
  <div>
    <DsBadge :status="item.is_active ? 'active' : 'revoked'">
      {{ item.is_active ? 'active' : 'revoked' }}
    </DsBadge>
  </div>
  <div class="cell-action">›</div>
</div>`

const codeBlockUsage = `<DsCodeBlock :code="myCode" />

<!-- myCode is just a string -->
const myCode = \`curl -X POST https://api.example.com \\
  -H "Authorization: Bearer token"\``

// ── Dropdown ──────────────────────────────────────
const dd = reactive({
  value: null, size: 'md', disabled: false, placeholder: 'Select option…',
  options: [
    { value: 'apple',  label: '🍎 Apple' },
    { value: 'banana', label: '🍌 Banana' },
    { value: 'cherry', label: '🍒 Cherry' },
    { value: 'durian', label: '🙈 Durian', disabled: true },
  ],
})
const dropdownCode = `<DsDropdown
  v-model="selected"
  :options="[{ value: 'a', label: 'Option A' }, ...]"
  placeholder="Select…"
  size="md"   <!-- md | sm -->
  align="left"  <!-- left | right -->
/>`

// ── Modal ─────────────────────────────────────────
const modalDemo = reactive({ open: false, size: 'md' })
const modalCode = `<DsModal v-model="open" title="Title" size="md">
  <!-- body content -->

  <template #footer>
    <DsButton variant="ghost" @click="open=false">Cancel</DsButton>
    <DsButton variant="primary" @click="save">Save</DsButton>
  </template>
</DsModal>`

// ── Confirm ───────────────────────────────────────
const { ask: askConfirm } = useConfirm()
const confirmResult = ref(null)
async function demoConfirm(variant) {
  const ok = await askConfirm({
    title:        variant === 'danger' ? 'Delete item?' : 'Confirm action?',
    message:      variant === 'danger' ? 'This cannot be undone.' : 'Do you want to proceed?',
    confirmLabel: variant === 'danger' ? 'Delete' : 'Confirm',
    variant,
  })
  confirmResult.value = ok ? 'confirmed ✓' : 'cancelled ✗'
}
const confirmCode = `const { ask } = useConfirm()

const ok = await ask({
  title:        'Delete item?',
  message:      'This cannot be undone.',
  confirmLabel: 'Delete',
  variant:      'danger',  // default | danger
})
if (ok) { /* proceed */ }`

// ── Toast ─────────────────────────────────────────
const { show: showToast } = useToast()
function fireToast(variant) {
  if (variant) toast.variant = variant
  showToast(toast.message || 'Token created', toast.variant || 'success')
}

// ── Copy feedback ─────────────────────────────────
const copyFeedback = ref(false)
let copyTimer = null
async function copyText(text) {
  await navigator.clipboard.writeText(text).catch(() => {})
  copyFeedback.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copyFeedback.value = false), 1400)
}
</script>

<style scoped>
/* ── Design page ─────────────────────────────────── */
.design-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  background: var(--bg);
}

/* ── Page header ─────────────────────────────────── */
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding: 24px 28px 18px; background: var(--bg-elev); border-bottom: 1px solid var(--line); flex-shrink: 0; }
.page-title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 3px; background: linear-gradient(135deg,var(--fg) 0%,var(--accent) 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.page-sub { font-size: 12px; color: var(--fg-mute); margin: 0; }
.header-right { display: flex; align-items: center; gap: 8px; }

/* ── Body pane ───────────────────────────────────── */
.body-pane { display: flex; flex: 1; min-height: 0; gap: 0; padding: 16px 20px; align-items: flex-start; overflow: hidden; }

/* ── List panel ──────────────────────────────────── */
.list-panel {
  flex: 1; min-width: 0;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.18);
  transition: flex .3s cubic-bezier(.4,0,.2,1), margin .3s cubic-bezier(.4,0,.2,1);
  display: flex; flex-direction: column;
  max-height: 100%;
}
.list-panel.collapsed { flex: 0 0 280px; margin-right: 14px; }
.list-rows { flex: 1; overflow-y: auto; min-height: 0; }

/* Table head */
.table-head {
  display: grid; grid-template-columns: 2fr 1fr 1.5fr 32px;
  gap: 12px; padding: 10px 16px;
  background: var(--bg-elev-2);
  border-bottom: 1px solid var(--line);
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg-mute);
  flex-shrink: 0;
}
.table-head.compact { grid-template-columns: 1fr auto; padding: 10px 14px; }

/* Full table rows */
.table-row {
  display: grid; grid-template-columns: 2fr 1fr 1.5fr 32px;
  gap: 12px; align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  cursor: pointer; position: relative; transition: background .1s;
}
.table-row::before { content:""; position:absolute; left:0; top:20%; bottom:20%; width:2px; border-radius:0 2px 2px 0; background:var(--accent); opacity:0; transition:opacity .15s; }
.table-row:hover { background: var(--bg-elev-2); }
.table-row:hover::before { opacity: 0.5; }
.table-row.selected { background: color-mix(in oklab, var(--accent) 8%, transparent); }
.table-row.selected::before { opacity: 1; }
.table-row:last-child { border-bottom: 0; }

.cell-name { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--fg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cell-abbr { width:26px; height:26px; border-radius:7px; background:color-mix(in oklab, var(--accent) 12%, transparent); color:var(--accent); font-size:9px; font-weight:800; display:grid; place-items:center; flex-shrink:0; }
.cell-mono { font-family:ui-monospace,monospace; font-size:11px; color:var(--fg-mute); }
.cell-meta { font-size:11px; color:var(--fg-mute); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cell-action { display:grid; place-items:center; color:var(--fg-faint); transition:color .12s,transform .12s; }
.table-row:hover .cell-action { color:var(--ds-accent,#d8ff5b); transform:translateX(2px); }
.table-row.selected .cell-action { color:var(--ds-accent,#d8ff5b); }

/* Compact rows */
.compact-row { display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid var(--line); cursor:pointer; position:relative; transition:background .1s; }
.compact-row::before { content:""; position:absolute; left:0; top:0; bottom:0; width:2px; border-radius:0 2px 2px 0; background:var(--accent); opacity:0; transition:opacity .15s; }
.compact-row:hover { background: var(--bg-elev-2); }
.compact-row.selected { background: color-mix(in oklab, var(--accent) 8%, transparent); }
.compact-row.selected::before { opacity: 1; }
.compact-row:last-child { border-bottom: 0; }
.compact-avatar { width:30px; height:30px; border-radius:8px; background:color-mix(in oklab, var(--accent) 12%, transparent); color:var(--accent); font-size:10px; font-weight:800; display:grid; place-items:center; flex-shrink:0; }
.compact-info { flex:1; min-width:0; }
.compact-name { font-size:12px; font-weight:600; color:var(--fg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.compact-meta { font-size:10px; font-family:ui-monospace,monospace; color:var(--fg-mute); }

/* Table footer */
.table-footer { padding:8px 16px; border-top:1px solid var(--line); font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--fg-mute); background:var(--bg-elev-2); flex-shrink:0; }

/* Status badge */
.status-badge { display:inline-flex; align-items:center; gap:5px; font-size:9px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; padding:2px 7px; border-radius:999px; background:var(--bg-elev-2); color:var(--fg-mute); border:1px solid var(--line-2); }
.status-badge.lg { font-size:10px; padding:3px 9px; }
.status-badge.foundation { background:rgba(96,165,250,0.1); color:#60a5fa; border-color:rgba(96,165,250,0.25); }
.status-badge.component  { background:rgba(216,255,91,0.08); color:var(--ds-accent,#d8ff5b); border-color:rgba(216,255,91,0.2); }
.status-badge.pattern    { background:rgba(167,139,250,0.1); color:#a78bfa; border-color:rgba(167,139,250,0.25); }
.badge-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }

/* ── Detail panel ────────────────────────────────── */
.detail-panel {
  flex: 1; min-width: 0;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.18);
  display: flex; flex-direction: column;
  max-height: 100%;
}

.detail-head { display:flex; align-items:center; gap:11px; padding:14px 16px; border-bottom:1px solid var(--line); flex-shrink:0; }
.detail-avatar { width:36px; height:36px; border-radius:10px; background:color-mix(in oklab, var(--accent) 12%, transparent); color:var(--accent); font-size:11px; font-weight:800; display:grid; place-items:center; flex-shrink:0; }
.detail-title-block { flex:1; min-width:0; }
.detail-name { font-size:13px; font-weight:700; color:var(--fg); }
.detail-prefix { font-size:10px; font-family:ui-monospace,monospace; color:var(--fg-mute); }
.close-btn { background:transparent; border:0; color:var(--fg-mute); width:28px; height:28px; border-radius:6px; display:grid; place-items:center; cursor:pointer; transition:color .12s,background .12s; }
.close-btn:hover { color:var(--fg); background:var(--bg-elev-2); }

.detail-body { flex:1; overflow-y:auto; display:flex; flex-direction:column; }

/* preview area */
.detail-preview {
  display: flex; align-items: center; justify-content: center;
  padding: 32px 24px;
  background: var(--bg-elev-2);
  border-bottom: 1px solid var(--line);
  min-height: 120px; flex-shrink: 0;
}

/* controls area */
.detail-controls {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  display: flex; flex-direction: column; gap: 10px;
  flex-shrink: 0;
}
.ctrl-row { display:flex; align-items:center; gap:10px; }
.ctrl-label { font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--fg-dim); width:64px; flex-shrink:0; }
.ctrl-options { display:flex; gap:4px; flex-wrap:wrap; }
.ctrl-opt { padding:3px 8px; border-radius:5px; font-size:10px; font-weight:600; font-family:ui-monospace,monospace; border:1px solid var(--line-2); background:transparent; color:var(--fg-mute); cursor:pointer; transition:background .1s,color .1s,border-color .1s; }
.ctrl-opt:hover { border-color:var(--line-3); color:var(--fg); }
.ctrl-opt.active { background:color-mix(in oklab, var(--accent) 12%, transparent); border-color:color-mix(in oklab, var(--accent) 40%, transparent); color:var(--accent); }
.ctrl-text { flex:1; height:26px; padding:0 8px; background:var(--bg-elev-2); border:1px solid var(--line-2); border-radius:5px; color:var(--fg); font-size:11px; font-family:inherit; outline:none; }
.ctrl-text:focus { border-color:color-mix(in oklab, var(--accent) 50%, transparent); }
.ctrl-textarea { height:auto; padding:6px 8px; resize:vertical; }
.ctrl-toggle { padding:3px 10px; border-radius:5px; font-size:10px; font-weight:700; font-family:ui-monospace,monospace; letter-spacing:.04em; border:1px solid var(--line-2); background:transparent; color:var(--fg-mute); cursor:pointer; transition:background .1s,color .1s,border-color .1s; }
.ctrl-toggle.on { background:color-mix(in oklab, var(--ok) 12%, transparent); border-color:color-mix(in oklab, var(--ok) 40%, transparent); color:var(--ok); }

/* variants strip */
.detail-variants { padding:14px 18px; border-bottom:1px solid var(--line); flex-shrink:0; }
.dv-label { font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-dim); margin-bottom:10px; }
.dv-row { display:flex; align-items:flex-start; flex-wrap:wrap; gap:8px; }

/* code section */
.detail-code-section { padding:14px 18px 20px; flex:1; display:flex; flex-direction:column; gap:8px; }
.dcs-label { display:flex; align-items:center; gap:6px; font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-mute); }

/* inner section (for foundation items) */
.detail-section-inner { padding:18px; flex:1; display:flex; flex-direction:column; gap:0; overflow-y:auto; }
.ds-block-title { font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-dim); margin-bottom:12px; }

/* Colors */
.token-editor { display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--bg-elev-2); border:1px solid var(--line); border-radius:10px; }
.color-picker { width:36px; height:36px; border-radius:8px; border:1px solid var(--line-2); cursor:pointer; padding:0; background:transparent; }
.token-val { font-family:ui-monospace,monospace; font-size:12px; color:var(--fg-mute); flex:1; }
.color-grid { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:4px; }
.color-swatch { width:88px; height:72px; border-radius:10px; display:flex; flex-direction:column; justify-content:flex-end; padding:7px 9px; cursor:pointer; transition:transform .1s,outline .1s; outline:2px solid transparent; outline-offset:2px; }
.color-swatch:hover { transform:translateY(-2px); outline-color:color-mix(in oklab, var(--accent) 40%, transparent); }
.swatch-label { font-size:9px; font-weight:700; font-family:ui-monospace,monospace; color:rgba(255,255,255,0.6); line-height:1.45; }
.swatch-label small { font-size:8px; opacity:.7; display:block; }
.text-swatch { background:var(--bg-elev-3); border:1px solid var(--line); align-items:center; justify-content:center; gap:5px; flex-direction:column; }

/* Typography */
.type-stack { display:flex; flex-direction:column; }
.type-row { display:flex; align-items:baseline; justify-content:space-between; padding:10px 12px; border-radius:8px; border-bottom:1px solid var(--line); cursor:pointer; transition:background .1s; }
.type-row:last-child { border-bottom:0; }
.type-row:hover { background:var(--bg-elev-2); outline:1px solid color-mix(in oklab, var(--accent) 20%, transparent); }
.type-meta-group { display:flex; align-items:center; gap:8px; flex-shrink:0; margin-left:16px; }
.type-tag { font-size:10px; font-weight:700; font-family:ui-monospace,monospace; color:var(--accent); background:color-mix(in oklab, var(--accent) 10%, transparent); border:1px solid color-mix(in oklab, var(--accent) 25%, transparent); padding:1px 6px; border-radius:4px; }
.type-spec { font-size:9px; font-family:ui-monospace,monospace; color:var(--fg-dim); white-space:nowrap; }
.font-stack-list { display:flex; flex-direction:column; gap:6px; }
.font-stack-row { display:flex; align-items:center; gap:12px; padding:10px 12px; background:var(--bg-elev-2); border:1px solid var(--line); border-radius:8px; cursor:pointer; transition:background .1s; }
.font-stack-row:hover { background:var(--bg-elev-3); outline:1px solid color-mix(in oklab, var(--accent) 20%, transparent); }
.font-stack-name { font-size:11px; font-weight:700; color:var(--accent); width:36px; flex-shrink:0; }
.font-stack-val { font-family:ui-monospace,monospace; font-size:10px; color:var(--fg-mute); }

/* Spacing */
.spacing-list { display:flex; flex-direction:column; gap:8px; }
.spacing-row { display:flex; align-items:center; gap:12px; border-radius:6px; padding:4px 6px; }
.spacing-row.clickable { cursor:pointer; transition:background .1s; }
.spacing-row.clickable:hover { background:var(--bg-elev-2); outline:1px solid color-mix(in oklab, var(--accent) 20%, transparent); }
.spacing-token { font-size:11px; font-weight:700; font-family:ui-monospace,monospace; color:var(--fg-mute); width:24px; text-align:right; }
.spacing-bar-wrap { flex:1; max-width:200px; }
.spacing-bar { height:13px; background:color-mix(in oklab, var(--accent) 22%, transparent); border-right:2px solid color-mix(in oklab, var(--accent) 60%, transparent); border-radius:0 2px 2px 0; transition:width .2s; }
.spacing-px { font-size:11px; font-family:ui-monospace,monospace; color:var(--fg); width:34px; }
.spacing-rem { font-size:10px; font-family:ui-monospace,monospace; color:var(--fg-dim); }

/* Table demo */
.demo-box { background:var(--bg-elev); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
.table-head-demo { display:grid; grid-template-columns:1.4fr 1fr 1fr 28px; gap:10px; padding:9px 14px; background:var(--bg-elev-2); border-bottom:1px solid var(--line); font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-mute); }
.table-row-demo { display:grid; grid-template-columns:1.4fr 1fr 1fr 28px; gap:10px; align-items:center; padding:10px 14px; border-bottom:1px solid var(--line); position:relative; }
.table-row-demo::before { content:""; position:absolute; left:0; top:20%; bottom:20%; width:2px; border-radius:0 2px 2px 0; background:var(--accent); opacity:0; transition:opacity .15s; }
.table-row-demo.selected { background:color-mix(in oklab, var(--accent) 8%, transparent); }
.table-row-demo.selected::before { opacity:1; }
.table-row-demo:last-child { border-bottom:0; }

/* Filter chip */
.filter-chip { display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 10px; background:var(--bg-elev-2); border:1px solid var(--line-2); border-radius:8px; font-size:11px; font-weight:600; color:var(--fg-mute); cursor:pointer; white-space:nowrap; transition:border-color .12s,background .12s,color .12s; user-select:none; }
.filter-chip:hover { border-color:color-mix(in oklab, var(--accent) 40%, transparent); background:color-mix(in oklab, var(--accent) 6%, transparent); color:var(--fg); }
.filter-chip.active { border-color:color-mix(in oklab, var(--accent) 45%, transparent); background:color-mix(in oklab, var(--accent) 10%, transparent); color:var(--accent); font-weight:700; }
.chip-clear { background:transparent; border:0; color:var(--accent); cursor:pointer; padding:0; display:grid; place-items:center; opacity:.6; transition:opacity .12s; }
.chip-clear:hover { opacity:1; }

/* Toast preview */
.toast-demo { display:inline-flex; align-items:center; gap:8px; padding:11px 12px 11px 14px; border-radius:10px; font-size:12px; font-weight:600; border-left:3px solid transparent; min-width:240px; }
.toast-demo--success { background:color-mix(in oklab, var(--ok) 12%, var(--bg-elev)); border-left-color:var(--ok); color:var(--ok); box-shadow:0 4px 16px color-mix(in oklab, var(--ok) 12%, transparent); }
.toast-demo--success .toast-ic { color:var(--ok); }
.toast-demo--error   { background:color-mix(in oklab, var(--danger) 12%, var(--bg-elev)); border-left-color:var(--danger); color:var(--danger); box-shadow:0 4px 16px color-mix(in oklab, var(--danger) 12%, transparent); }
.toast-demo--error   .toast-ic { color:var(--danger); }
.toast-demo--warning { background:color-mix(in oklab, var(--warn) 12%, var(--bg-elev)); border-left-color:var(--warn); color:var(--warn); box-shadow:0 4px 16px color-mix(in oklab, var(--warn) 12%, transparent); }
.toast-demo--warning .toast-ic { color:var(--warn); }
.toast-demo--info    { background:color-mix(in oklab, var(--info) 12%, var(--bg-elev)); border-left-color:var(--info); color:var(--info); box-shadow:0 4px 16px color-mix(in oklab, var(--info) 12%, transparent); }
.toast-demo--info    .toast-ic { color:var(--info); }
.toast-ic { display:grid; place-items:center; flex-shrink:0; }
.toast-demo-close { display:grid; place-items:center; margin-left:auto; padding:2px; background:none; border:none; cursor:pointer; color:var(--fg-faint); border-radius:4px; }
.toast-demo-close:hover { color:var(--fg); }
.ctrl-chip { padding:3px 10px; border-radius:6px; border:1px solid var(--line-2); background:transparent; color:var(--fg-mute); font-size:11px; font-weight:600; cursor:pointer; transition:all .15s; }
.ctrl-chip:hover { color:var(--fg); border-color:var(--line-3); }
.ctrl-chip.active { background:var(--bg-elev-2); color:var(--fg); border-color:var(--line-3); }

/* Copy feedback */
.copy-feedback { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); display:inline-flex; align-items:center; gap:7px; padding:8px 16px; background:var(--bg-elev); border:1px solid color-mix(in oklab, var(--ok) 40%, transparent); color:var(--ok); border-radius:999px; font-size:12px; font-weight:600; box-shadow:0 4px 20px rgba(0,0,0,0.15); z-index:200; pointer-events:none; }

/* Panel slide-in transition */
.panel-enter-active { transition: opacity .25s ease, transform .28s cubic-bezier(.4,0,.2,1); }
.panel-leave-active { transition: opacity .18s ease, transform .18s ease; }
.panel-enter-from { opacity:0; transform:translateX(16px); }
.panel-leave-to   { opacity:0; transform:translateX(12px); }

/* ── Tablet (≤1024px) ── */
@media (max-width: 1024px) {
  .page-header { padding: 16px 18px 14px; flex-wrap: wrap; gap: 10px; }
  .body-pane { padding: 12px 14px; }
  /* List stays full width — detail becomes popup drawer */
  .list-panel,
  .list-panel.collapsed { flex: 1; margin-right: 0; }
  .table-head,
  .table-row { grid-template-columns: 1fr auto; }
  .table-head > *:nth-child(n+3),
  .table-row > *:nth-child(n+3) { display: none; }

  .detail-panel {
    position: fixed;
    inset: 0 0 0 auto;
    z-index: 40;
    width: 100% !important;
    max-width: 720px !important;
    min-height: 100vh;
    margin: 0;
    border-radius: 0;
    border: 0;
    border-left: 1px solid var(--line);
    background: var(--bg);
    box-shadow: -8px 0 32px rgba(0,0,0,0.4);
    overflow-y: auto;
    animation: detail-pop-in .22s cubic-bezier(.4,0,.2,1);
  }
  .body-pane:has(.detail-panel)::before {
    content: "";
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 39;
    animation: backdrop-fade .2s ease;
  }
  @keyframes detail-pop-in {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes backdrop-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
}

/* ── Mobile (≤768px) ── */
@media (max-width: 768px) {
  .page-header { padding: 14px 16px 12px; flex-direction: column; align-items: stretch; gap: 10px; }
  .header-right { flex-wrap: wrap; gap: 6px; }
  .body-pane { padding: 10px; flex-direction: column; gap: 10px; }
  .list-panel, .list-panel.collapsed { flex: 1; margin-right: 0; width: 100%; border-radius: 10px; }

  .detail-panel {
    position: fixed;
    inset: 0;
    z-index: 40;
    width: 100% !important;
    max-width: 100% !important;
    min-height: 100vh;
    margin: 0;
    border-radius: 0;
    border: 0;
    background: var(--bg);
    box-shadow: none;
    overflow-y: auto;
    animation: detail-pop-in-mobile .22s cubic-bezier(.4,0,.2,1);
  }
  @keyframes detail-pop-in-mobile {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}

/* ── Small mobile (≤480px) ── */
@media (max-width: 480px) {
  .page-header { padding: 12px 12px 10px; }
  .body-pane { padding: 8px; }
  .list-panel, .list-panel.collapsed { border-radius: 8px; }
}
</style>
