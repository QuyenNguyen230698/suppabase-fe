<template>
  <div class="permissions-page">

    <!-- Teleport Org Nodes into the layout sidebar portal -->
    <Teleport to="#sidebar-portal">
      <div class="perm-org-nav">
        <div class="perm-org-label">Org Nodes</div>
        <a
          v-for="node in flatNodes"
          :key="node.id"
          class="perm-org-item"
          :class="{ active: selectedNode?.id === node.id }"
          :style="{ paddingLeft: (10 + node.depth * 12) + 'px' }"
          href="#"
          @click.prevent="selectNode(node)"
        >
          <span class="perm-org-dot" :class="node.type"></span>
          <span class="perm-org-node-label">{{ node.label }}</span>
          <span v-if="node.userCount" class="perm-org-badge">{{ node.userCount }}</span>
        </a>
      </div>
    </Teleport>

      <!-- Page header -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">{{ t('permissions.title') }}</h1>
          <p class="page-sub">{{ t('permissions.subtitle') }}</p>
        </div>
        <div class="header-right">
          <div class="view-toggle">
            <button class="vt-btn" :class="{ active: view === 'tree' }" @click="view='tree'">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Org Tree
            </button>
            <button v-if="!isScopedActor" class="vt-btn" :class="{ active: view === 'matrix' }" @click="view='matrix'">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Matrix
            </button>
            <button class="vt-btn" :class="{ active: view === 'users' }" @click="view='users'">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              Users
            </button>
            <button v-if="auth.isSuperAdmin" class="vt-btn" :class="{ active: view === 'modules' }" @click="view='modules'">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              Modules
            </button>
          </div>
          <DsInput v-model="search" placeholder="Search nodes, users…" clearable>
            <template #prefix>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </template>
          </DsInput>
          <DsButton v-if="can('permissions', 'create')" variant="primary" @click="showAddUser=true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Add User
          </DsButton>
        </div>
      </div>

      <!-- Stats strip -->
      <div class="stats-strip">
        <div class="stat-item"><span class="stat-val">{{ orgStats.nodes }}</span><span class="stat-lbl">Org Nodes</span></div>
        <div class="stat-sep"></div>
        <div class="stat-item"><span class="stat-val emerald">{{ orgStats.users }}</span><span class="stat-lbl">Users</span></div>
        <div class="stat-sep"></div>
        <div class="stat-item"><span class="stat-val blue">{{ orgStats.superAdmins }}</span><span class="stat-lbl">Super Admins</span></div>
        <div class="stat-sep"></div>
        <div class="stat-item"><span class="stat-val amber">{{ orgStats.regional }}</span><span class="stat-lbl">Regional</span></div>
        <div class="stat-sep"></div>
        <div class="stat-item"><span class="stat-val muted">{{ orgStats.countryUsers }}</span><span class="stat-lbl">Country Users</span></div>
      </div>

      <!-- Body -->
      <div class="body-pane">

        <!-- ORG TREE VIEW -->
        <template v-if="view === 'tree'">
          <div class="tree-pane" :class="{ collapsed: !!selectedNode }">

            <!-- Layers -->
            <div class="tree-scroll">
              <div v-for="layer in orgLayers" :key="layer.label" class="layer-block">
                <div class="layer-label">
                  <span class="layer-line"></span>
                  <span class="layer-text">{{ layer.label }}</span>
                  <span class="layer-line"></span>
                </div>
                <div class="layer-nodes" :class="{ 'layer-wrap': layer.nodes.length > 4 }">
                  <div
                    v-for="node in layer.nodes"
                    :key="node.id"
                    class="org-card"
                    :class="[node.type, { selected: selectedNode?.id === node.id, 'search-match': searchMatch(node) }]"
                    @click="selectNode(node)"
                  >
                    <div class="org-card-head">
                      <div class="org-card-icon" :class="node.type">
                        <svg v-if="node.type==='group'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        <svg v-else-if="node.type==='hq'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        <svg v-else-if="node.type==='bu'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        <svg v-else-if="node.type==='fab'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 20h20M4 20V10l8-6 8 6v10"/><path d="M9 20v-5h6v5"/></svg>
                        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div class="org-card-info">
                        <div class="org-card-name">{{ node.label }}</div>
                        <div class="org-card-sub">{{ node.sub }}</div>
                      </div>
                    </div>
                    <div class="org-card-foot">
                      <span class="role-pill" :class="node.defaultRole">{{ node.defaultRole }}</span>
                      <span v-if="node.userCount" class="user-count">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                        {{ node.userCount }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="table-footer">{{ filteredFlatNodes.length }} nodes · {{ totalUsers }} users</div>
          </div>

          <!-- Node detail panel -->
          <transition name="panel">
            <div v-if="selectedNode" class="detail-panel">
              <div class="detail-head">
                <div class="detail-avatar" :class="selectedNode.type">
                  {{ selectedNode.label.slice(0,2).toUpperCase() }}
                </div>
                <div class="detail-title-block">
                  <div class="detail-name">{{ selectedNode.label }}</div>
                  <div class="detail-prefix">{{ selectedNode.sub }}</div>
                </div>
                <span class="role-pill lg" :class="selectedNode.defaultRole">{{ selectedNode.defaultRole }}</span>
                <button class="close-btn" @click="selectedNode=null">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <!-- Scrollable body -->
              <div class="detail-body">

              <!-- Permission matrix for this node -->
              <div class="detail-section node-perms">
                <div class="section-label">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Permission Matrix — {{ selectedNode.label }}
                  <div v-if="can('permissions', 'create')" class="section-actions-row">
                    <button class="section-action reset" :disabled="settingFullAccess" @click="resetNodeAccess(selectedNode)">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      Reset
                    </button>
                  </div>
                </div>
                <div class="perm-matrix">
                  <div class="perm-head">
                    <span>Module</span>
                    <span>View</span>
                    <span>Create</span>
                    <span>Delete</span>
                    <span>Upload</span>
                  </div>
                  <div v-for="mod in permModules" :key="mod.id" class="perm-row">
                    <div class="perm-module">
                      <span class="perm-mod-icon" :class="mod.color">{{ mod.abbr }}</span>
                      {{ mod.name }}
                    </div>
                    <div v-for="action in ['view','create','delete','upload']" :key="action" class="perm-cell">
                      <button
                        class="perm-toggle"
                        :class="getPermState(selectedNode, mod.id, action)"
                        :disabled="!can('permissions', 'create')"
                        @click="can('permissions', 'create') && togglePerm(selectedNode, mod.id, action)"
                      >
                        <svg v-if="getPermState(selectedNode,mod.id,action)==='full'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5L20 7"/></svg>
                        <svg v-else-if="getPermState(selectedNode,mod.id,action)==='partial'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/></svg>
                        <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Users in this node -->
              <div class="detail-section" style="display:flex;flex-direction:column">
                <div class="section-label">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                  Users in this node
                  <button v-if="can('permissions', 'create')" class="section-action" @click="showAssignToNode=true">+ Add</button>
                </div>
                <div class="user-list">
                  <div v-if="!nodeUsers.length" class="empty-mini">No users assigned to this node.</div>
                  <div v-for="u in nodeUsers" :key="u.id" class="user-row">
                    <div class="user-avatar">{{ (u.name || u.username || u.email || '?').slice(0,2).toUpperCase() }}</div>
                    <div class="user-info">
                      <div class="user-name">{{ u.name || u.username || u.email }}</div>
                      <div class="user-email">{{ u.email }}</div>
                    </div>
                    <DsDropdown :model-value="u.role" :options="assignableRoles.map(r=>({value:r.id,label:r.label}))" size="sm" style="width:130px" :disabled="!can('permissions', 'create')" @change="can('permissions', 'create') && changeRole(u, $event)" />
                    <button v-if="can('permissions', 'delete')" class="icon-btn danger" @click="removeUser(u)" title="Remove">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              </div>

              </div><!-- /detail-body -->

              <div class="detail-footer">
                <span class="detail-path">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 18 6-6-6-6"/></svg>
                  {{ selectedNode.path }}
                </span>
                <DsButton variant="default" size="sm" @click="selectedNode=null">Close</DsButton>
              </div>
            </div>
          </transition>
        </template>

        <!-- PERMISSION MATRIX VIEW -->
        <template v-else-if="view === 'matrix'">
          <div class="matrix-full">
            <div class="matrix-scroll">
              <table class="big-matrix">
                <thead>
                  <tr>
                    <th class="mat-sticky">Module / Action</th>
                    <th v-for="role in roles" :key="role.id" class="mat-role-head">
                      <div class="role-head-inner">
                        <span class="role-dot" :class="role.id"></span>
                        {{ role.label }}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <!-- eslint-disable-next-line vue/no-v-for-template-key -->
                  <template v-for="mod in permModules" :key="mod.id">
                    <tr class="mat-mod-header">
                      <td colspan="99">
                        <span class="perm-mod-icon sm" :class="mod.color">{{ mod.abbr }}</span>
                        {{ mod.name }}
                      </td>
                    </tr>
                    <tr v-for="action in ['view','create','delete','upload']" :key="`${mod.id}-${action}`" class="mat-action-row">
                      <td class="mat-action-label mat-sticky">
                        <span class="action-indent">└</span>
                        {{ action }}
                      </td>
                      <td v-for="role in roles" :key="role.id" class="mat-cell">
                        <button class="mat-perm-chip" :class="getMatrixPerm(role.id, mod.id, action)" :disabled="!can('permissions', 'create')" @click="can('permissions', 'create') && toggleMatrixPerm(role.id, mod.id, action)" :title="`${role.label} · ${mod.name} · ${action}`">
                          <svg v-if="getMatrixPerm(role.id,mod.id,action)==='full'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5L20 7"/></svg>
                          <svg v-else-if="getMatrixPerm(role.id,mod.id,action)==='partial'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/></svg>
                          <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <!-- Legend -->
            <div class="matrix-legend">
              <div class="legend-title">Legend</div>
              <div class="legend-row"><span class="mat-perm-chip full"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5L20 7"/></svg></span> Full access</div>
              <div class="legend-row"><span class="mat-perm-chip partial"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/></svg></span> Scoped (own BU/country)</div>
              <div class="legend-row"><span class="mat-perm-chip none"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></span> No access</div>
              <div class="legend-sep"></div>
              <div class="legend-title">Roles</div>
              <div v-for="r in roles" :key="r.id" class="legend-role">
                <span class="role-dot" :class="r.id"></span>
                <div>
                  <div class="lr-name">{{ r.label }}</div>
                  <div class="lr-desc">{{ r.desc }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- MODULES VIEW -->
        <template v-else-if="view === 'modules'">
          <ModulesEditor @changed="onModulesChanged" />
        </template>

        <!-- USERS VIEW -->
        <template v-else>
          <div class="users-pane" :class="{ collapsed: !!selectedUser }">

            <!-- Users toolbar: search + filters + page size (single row) -->
            <div v-if="!selectedUser" class="users-toolbar">
              <!-- Search -->
              <DsInput v-model="userSearch" placeholder="Search name, email, title, department…" clearable style="flex:1;min-width:180px" @input="onUserSearchInput" @clear="loadUsers(true)">
                <template #prefix>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </template>
              </DsInput>

              <!-- Divider -->
              <div class="toolbar-sep"></div>

              <!-- Role filter -->
              <DsDropdown
                v-model="userFilterRole"
                :options="[{ value: '', label: 'All roles' }, ...assignableRoles.map(r => ({ value: r.id, label: r.label }))]"
                placeholder="All roles"
                size="sm"
                style="width:130px"
                @change="onFilterChange"
              />

              <!-- Node filter (optgroup — native select) -->
              <div class="filter-select-wrap" :class="{ active: userFilterNode }">
                <svg class="filter-select-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <select class="filter-select-input" v-model="userFilterNode" @change="onFilterChange">
                  <option value="">All nodes</option>
                  <optgroup v-for="layer in orgLayerGroups" :key="layer.label" :label="layer.label">
                    <option v-for="n in layer.nodes" :key="n.id" :value="n.id">
                      {{ '·'.repeat(n.depth) }} {{ n.label }}
                    </option>
                  </optgroup>
                </select>
                <button v-if="userFilterNode" class="filter-clear-btn" @click.stop="userFilterNode=''; onFilterChange()">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <!-- Scope filter -->
              <DsDropdown
                v-model="userFilterScope"
                :options="[{ value: '', label: 'All scopes' }, ...SCOPES.map(s => ({ value: s.value, label: s.label }))]"
                placeholder="All scopes"
                size="sm"
                style="width:120px"
                @change="setFilterScope(userFilterScope)"
              />

              <!-- Reset all -->
              <button v-if="activeFilterCount" class="filter-reset-btn" @click="resetFilters" title="Reset all filters">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                <span class="filter-count-badge">{{ activeFilterCount }}</span>
              </button>

              <!-- Divider -->
              <div class="toolbar-sep"></div>

              <!-- Page size -->
              <div class="page-size-group">
                <span class="page-size-lbl">Show</span>
                <button
                  v-for="s in PAGE_SIZES" :key="s"
                  class="page-size-btn"
                  :class="{ active: userPageSize === s }"
                  @click="onPageSizeChange(s)"
                >{{ s }}</button>
              </div>
            </div>

            <div class="table-head" :class="{ compact: !!selectedUser }">
              <template v-if="!selectedUser">
                <span>User</span>
                <span>Role</span>
                <span>Node</span>
                <span>Scope</span>
                <span></span>
              </template>
              <template v-else>
                <span>User</span>
                <span></span>
              </template>
            </div>
            <div class="list-rows">
              <div v-if="!filteredNormalisedUsers.length" class="empty-state">
                <div class="empty-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></div>
                <div class="empty-title">No users found</div>
                <div class="empty-sub">{{ search ? 'Try clearing search.' : 'Add your first user.' }}</div>
              </div>
              <template v-else-if="selectedUser">
                <div v-for="u in filteredNormalisedUsers" :key="u.id" class="compact-row" :class="{ selected: selectedUser?.id===u.id }" @click="selectedUser=u">
                  <div class="compact-avatar">{{ (u.name || u.username || u.email || '?').slice(0,2).toUpperCase() }}</div>
                  <div class="compact-info">
                    <div class="compact-name">{{ u.name || u.username || u.email }}</div>
                    <div class="compact-meta">{{ u.email }}</div>
                  </div>
                  <span class="role-pill" :class="u.role">{{ u.role }}</span>
                </div>
              </template>
              <template v-else>
                <div v-for="u in filteredNormalisedUsers" :key="u.id" class="table-row" :class="{ selected: selectedUser?.id===u.id }" @click="selectedUser=u">
                  <div class="cell-name">
                    <div class="compact-avatar sm">{{ (u.name || u.username || u.email || '?').slice(0,2).toUpperCase() }}</div>
                    {{ u.name || u.username || u.email }}
                  </div>
                  <div><span class="role-pill" :class="u.role">{{ u.role }}</span></div>
                  <div class="cell-meta">{{ u.nodeName }}</div>
                  <div class="cell-meta">{{ u.scope }}</div>
                  <div class="cell-action"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
                </div>
              </template>
            </div>
            <div class="table-footer users-footer">
              <span>{{ filteredNormalisedUsers.length }} / {{ userTotal }} users{{ userSearch ? ' (filtered)' : '' }}</span>
              <button v-if="hasMoreUsers" class="show-more-btn" :disabled="loadingUsers" @click="showMore">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                {{ loadingUsers ? 'Loading…' : `Show more (${userTotal - filteredNormalisedUsers.length} left)` }}
              </button>
            </div>
          </div>

          <!-- User detail -->
          <transition name="panel">
            <div v-if="selectedUser" class="detail-panel">

              <!-- Header -->
              <div class="detail-head">
                <div class="ud-avatar">{{ (selectedUser.name || selectedUser.username || selectedUser.email || '?').slice(0,2).toUpperCase() }}</div>
                <div class="detail-title-block">
                  <div class="detail-name">{{ selectedUser.name || selectedUser.username || selectedUser.email }}</div>
                  <div class="detail-prefix">{{ selectedUser.email }}</div>
                </div>
                <span class="role-pill lg" :class="selectedUser.role">{{ roles.find(r=>r.id===selectedUser.role)?.label || selectedUser.role }}</span>
                <button v-if="can('permissions', 'create')" class="icon-btn" :class="{ active: editingUser }" @click="startEditUser" title="Edit profile">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="close-btn" @click="selectedUser=null">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <!-- Scrollable body -->
              <div class="ud-body">

                <!-- VIEW mode -->
                <template v-if="!editingUser">

                  <!-- Password changed notice -->
                  <transition name="pw-notice">
                    <div v-if="pwChangedNotice" class="ud-pw-notice">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Password updated successfully
                    </div>
                  </transition>

                  <!-- Profile info -->
                  <div class="ud-section">
                    <div class="ud-section-label">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      Profile
                    </div>
                    <div class="ud-grid">
                      <div class="ud-field">
                        <span class="ud-key">Full name</span>
                        <span class="ud-val">{{ selectedUser.full_name || '—' }}</span>
                      </div>
                      <div class="ud-field">
                        <span class="ud-key">Username</span>
                        <span class="ud-val mono">{{ selectedUser.username || '—' }}</span>
                      </div>
                      <div class="ud-field">
                        <span class="ud-key">Email</span>
                        <span class="ud-val">{{ selectedUser.email }}</span>
                      </div>
                      <div class="ud-field">
                        <span class="ud-key">Display name</span>
                        <span class="ud-val">{{ selectedUser.display_name || '—' }}</span>
                      </div>
                      <div class="ud-field">
                        <span class="ud-key">Job title</span>
                        <span class="ud-val">{{ selectedUser.job_title || '—' }}</span>
                      </div>
                      <div class="ud-field">
                        <span class="ud-key">Department</span>
                        <span class="ud-val">{{ selectedUser.department || '—' }}</span>
                      </div>
                      <div class="ud-field">
                        <span class="ud-key">Country</span>
                        <span class="ud-val">{{ selectedUser.country_code ? (COUNTRIES.find(c=>c.code===selectedUser.country_code)?.flag + ' ' + COUNTRIES.find(c=>c.code===selectedUser.country_code)?.name) : '—' }}</span>
                      </div>
                      <div class="ud-field">
                        <span class="ud-key">Status</span>
                        <span class="ud-val">
                          <span class="ud-status" :class="selectedUser.is_active !== false ? 'active' : 'inactive'">
                            {{ selectedUser.is_active !== false ? 'Active' : 'Inactive' }}
                          </span>
                        </span>
                      </div>
                      <div class="ud-field">
                        <span class="ud-key">Member since</span>
                        <span class="ud-val">{{ selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—' }}</span>
                      </div>
                      <div class="ud-field">
                        <span class="ud-key">Password changed</span>
                        <span class="ud-val">{{ selectedUser.password_changed_at ? new Date(selectedUser.password_changed_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'Never' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Org assignments -->
                  <div class="ud-section">
                    <div class="ud-section-label">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Org Assignments
                    </div>
                    <div v-if="!selectedUser.assignments?.length" class="ud-empty">No assignments</div>
                    <div v-for="(asgn, i) in selectedUser.assignments" :key="i" class="ud-asgn-row">
                      <div class="ud-asgn-node">
                        <span class="org-dot" :class="asgn.node_type"></span>
                        {{ asgn.node_label || asgn.node_id }}
                      </div>
                      <div class="ud-asgn-meta">
                        <span class="role-pill" :class="asgn.role">{{ roles.find(r=>r.id===asgn.role)?.label || asgn.role }}</span>
                        <span v-if="asgn.country" class="ud-asgn-country">{{ asgn.country }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Effective permissions -->
                  <div class="ud-section">
                    <div class="ud-section-label">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Effective Permissions
                    </div>
                    <div class="effective-perms">
                      <div v-for="mod in permModules" :key="mod.id" class="ep-mod">
                        <div class="ep-mod-name">
                          <span class="perm-mod-icon sm" :class="mod.color">{{ mod.abbr }}</span>
                          {{ mod.name }}
                        </div>
                        <div class="ep-chips">
                          <span v-for="action in ['view','create','delete','upload']" :key="action" class="ep-chip" :class="getUserEffectivePerm(selectedUser.id, mod.id, action)">{{ action }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </template>

                <!-- EDIT mode -->
                <template v-else>
                  <div class="ud-section">
                    <div class="ud-section-label">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit Profile
                    </div>
                    <div class="edit-grid">
                      <div class="field">
                        <label class="field-label">Full name</label>
                        <DsInput v-model="editUser.full_name" autocomplete="off" placeholder="Full name" />
                      </div>
                      <div class="field">
                        <label class="field-label">Display name</label>
                        <DsInput v-model="editUser.display_name" autocomplete="off" placeholder="Alias / nickname" />
                      </div>
                      <div class="field">
                        <label class="field-label">Email</label>
                        <DsInput v-model="editUser.email" type="email" autocomplete="new-password" placeholder="email@domain.com" />
                      </div>
                      <div class="field">
                        <label class="field-label">Job title</label>
                        <DsDropdown v-model="editUser.job_title" :options="[{value:'',label:'— Select —'},...JOB_TITLES.map(t=>({value:t,label:t}))]" />
                      </div>
                      <div class="field">
                        <label class="field-label">Department</label>
                        <DsDropdown v-model="editUser.department" :options="[{value:'',label:'— Select —'},...DEPARTMENTS.map(d=>({value:d,label:d}))]" />
                      </div>
                      <div class="field">
                        <label class="field-label">Country</label>
                        <DsDropdown v-model="editUser.country_code" :options="[{value:'',label:'— None —'},...COUNTRIES.map(c=>({value:c.code,label:c.flag+' '+c.name}))]" />
                      </div>
                      <div class="field">
                        <label class="field-label">Status</label>
                        <DsDropdown v-model="editUser.is_active" :options="[{value:true,label:'Active'},{value:false,label:'Inactive'}]" />
                      </div>
                      <div class="field" style="grid-column:1/-1">
                        <label class="field-label">
                          New password
                          <span class="pw-hint">— leave blank to keep current</span>
                          <span v-if="editUser.password" class="pw-will-change">will change on save</span>
                        </label>
                        <DsInput v-model="editUser.password" type="password" autocomplete="new-password" placeholder="Enter new password…" :class="{ 'pw-pending': editUser.password }" />
                      </div>
                    </div>
                    <div v-if="editErr" class="field-err-msg" style="margin-top:4px">{{ editErr }}</div>
                  </div>

                  <!-- Section: Org Assignments -->
                  <div class="ud-section">
                    <div class="ud-section-label">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Org Assignments
                    </div>

                    <!-- Existing assignments -->
                    <div v-if="!editAssignments.length" class="ud-empty">No assignments yet</div>
                    <div v-for="(asgn, i) in editAssignments" :key="asgn.node_id" class="ea-row" :class="{ 'ea-row-saving': savingAsgnIds.has(asgn.node_id) }">
                      <span class="org-dot" :class="flatNodes.find(n=>n.id===asgn.node_id)?.type || 'country'"></span>
                      <div class="ea-node">{{ flatNodes.find(n=>n.id===asgn.node_id)?.label || asgn.node_label || asgn.node_id }}</div>
                      <DsDropdown v-model="asgn.role" :options="assignableRoles.map(r=>({value:r.id,label:r.label}))" :disabled="savingAsgnIds.has(asgn.node_id)" size="sm" style="width:120px" @change="onEditAsgnRoleChange(asgn)" />
                      <DsDropdown v-model="asgn.country" :options="[{value:'',label:'Global'},...COUNTRIES.map(c=>({value:c.name,label:c.flag+' '+c.name}))]" :disabled="savingAsgnIds.has(asgn.node_id)" size="sm" style="width:120px" @change="onEditAsgnRoleChange(asgn)" />
                      <svg v-if="savingAsgnIds.has(asgn.node_id)" class="spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--fg-mute);flex-shrink:0"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                      <button v-else class="ea-remove-btn" @click="removeEditAssignment(i, asgn)" title="Remove">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </div>

                    <!-- Add new assignment -->
                    <div class="ea-add-row">
                      <div class="filter-select-wrap" style="flex:1" :class="{ active: newAsgn.node_id }">
                        <svg class="filter-select-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                        <select class="filter-select-input" style="width:100%" v-model="newAsgn.node_id">
                          <option value="">+ Add node…</option>
                          <optgroup v-for="layer in orgLayerGroups" :key="layer.label" :label="layer.label">
                            <option v-for="n in layer.nodes" :key="n.id" :value="n.id"
                              :disabled="editAssignments.some(a=>a.node_id===n.id)">
                              {{ '·'.repeat(n.depth) }} {{ n.label }}
                            </option>
                          </optgroup>
                        </select>
                      </div>
                      <DsDropdown v-model="newAsgn.role" :options="assignableRoles.map(r=>({value:r.id,label:r.label}))" :disabled="!newAsgn.node_id || savingAsgn" size="sm" style="width:120px" />
                      <button class="ea-add-btn" :disabled="!newAsgn.node_id || savingAsgn" @click="addEditAssignment">
                        <svg v-if="!savingAsgn" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        <svg v-else class="spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                        {{ savingAsgn ? '…' : 'Add' }}
                      </button>
                    </div>

                    <div v-if="asgnErr" class="field-err-msg" style="margin-top:4px">{{ asgnErr }}</div>
                  </div>
                </template>

              </div><!-- /ud-body -->

              <!-- Footer -->
              <div class="detail-footer">
                <DsButton v-if="can('permissions', 'delete')" variant="danger" size="sm" @click="removeUserById(selectedUser.id)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  Remove
                </DsButton>
                <div style="display:flex;gap:6px">
                  <template v-if="editingUser && can('permissions', 'create')">
                    <DsButton variant="default" size="sm" @click="cancelEditUser">Cancel</DsButton>
                    <DsButton variant="primary" size="sm" :disabled="savingEdit" @click="saveEditUser">
                      <svg v-if="!savingEdit" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      <svg v-else class="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                      {{ savingEdit ? 'Saving…' : 'Save' }}
                    </DsButton>
                  </template>
                  <DsButton v-else variant="default" size="sm" @click="selectedUser=null">Close</DsButton>
                </div>
              </div>

            </div>
          </transition>
        </template>

      </div><!-- /body-pane -->

    <!-- Add User Drawer (extracted component) -->
    <AddUserDrawer
      v-model="showAddUser"
      :flat-nodes="flatNodes"
      @created="onUserCreated"
    />

    <!-- Assign User to Node Drawer -->
    <transition name="drawer">
      <div v-if="showAssignToNode && selectedNode" class="drawer-backdrop" @click.self="showAssignToNode=false">
        <div class="drawer" style="max-width:520px">

          <div class="drawer-head">
            <div class="drawer-title-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M19 8v6M22 11h-6"/></svg>
              <span class="drawer-title">Assign user → <em style="font-style:normal;color:var(--fg-mute)">{{ selectedNode.label }}</em></span>
            </div>
            <button class="close-btn" @click="showAssignToNode=false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Search -->
          <div style="padding:12px 20px 0">
            <DsInput v-model="assignNodeSearch" placeholder="Search name, email…" clearable>
              <template #prefix>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </template>
            </DsInput>
          </div>

          <!-- User list -->
          <div class="drawer-body" style="flex:1;overflow-y:auto;padding:12px 20px;display:block">
            <div v-if="!assignableUsers.length" class="empty-mini" style="margin-top:24px;text-align:center">
              {{ assignNodeSearch ? 'No matching users found.' : 'All users already belong to this node.' }}
            </div>
            <div v-for="u in assignableUsers" :key="u.id" class="asgn-user-row">
              <div class="user-avatar">{{ (u.name || u.username || u.email || '?').slice(0,2).toUpperCase() }}</div>
              <div class="user-info" style="flex:1;min-width:0">
                <div class="user-name">{{ u.name || u.username || u.email }}</div>
                <div class="user-email">{{ u.email }}</div>
                <div v-if="u.assignments?.length" class="asgn-current-nodes">
                  <span v-for="a in u.assignments" :key="a.node_id" class="asgn-node-tag">
                    <span class="org-dot" :class="flatNodes.find(n=>n.id===a.node_id)?.type||'country'"></span>
                    {{ flatNodes.find(n=>n.id===a.node_id)?.label || a.node_id }}
                  </span>
                </div>
              </div>
              <DsDropdown v-model="assignRoleMap[u.id]" :options="assignableRoles.map(r=>({value:r.id,label:r.label}))" size="sm" style="width:120px" />
              <DsButton v-if="can('permissions', 'create')" variant="primary" size="sm" :disabled="assigningIds.has(u.id)" @click="assignUserToNode(u)">
                <svg v-if="!assigningIds.has(u.id)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                <svg v-else class="spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                Assign
              </DsButton>
            </div>
          </div>

          <div class="drawer-foot">
            <span class="drawer-foot-info">{{ assignableUsers.length }} users available to assign</span>
            <DsButton variant="default" @click="showAssignToNode=false">Close</DsButton>
          </div>

        </div>
      </div>
    </transition>

    <!-- Toast -->

  </div>
</template>

<script setup>
const auth  = useAuthStore()
const { apiFetch } = useApi()
const { can } = usePermission()
const { t } = useI18n()

// true when actor is not a full admin (level > 2) but has been granted entry to this page
// via partial permissions.view. Matrix, audit, module-CRUD tabs are hidden for scoped actors.
// Role level is the authoritative source — does not depend on DB permState value.
const isScopedActor = computed(() => !auth.isAdmin)

// ── UI state ──────────────────────────────────────────────────
const view         = ref('tree')
const search       = ref('')
const selectedNode = ref(null)
const selectedUser = ref(null)
const showAddUser        = ref(false)
const showAssignToNode   = ref(false)
const assignNodeSearch   = ref('')
const assigningIds       = ref(new Set())
const assignRoleMap      = ref({})
const loadingNodes = ref(false)
const loadingUsers = ref(false)
const savingPerm   = ref(false)
const { show: showToast } = useToast()

// ── Static config (imported) ──────────────────────────────────
import {
  ROLE_DEFS as roles,
  LAYER_LABELS, TYPE_DEFAULT_ROLE, SCOPES,
  LANGUAGES, COUNTRIES, JOB_TITLES, DEPARTMENTS,
} from '~/composables/useOrgConstants.js'

// Reactive — populated (and kept in sync) by loadModules() from DB
const permModules = reactive([
  { id: 'chat',        name: 'AI Chat',                  abbr: 'AI', color: 'indigo' },
  { id: 'documents',   name: 'Documents',                abbr: 'DC', color: 'amber'  },
  { id: 'api_tokens',  name: 'API Tokens (Admin)',        abbr: 'TK', color: 'pink'   },
  { id: 'permissions', name: 'Permissions',              abbr: 'PM', color: 'cyan'   },
])

// ── Server data ───────────────────────────────────────────────
const flatNodes    = ref([])
const users        = ref([])
const roleMatrix   = ref({})
const nodePermData = ref({})
const userPermData = ref({})

// ── Pagination, search & filter state ────────────────────────
const userSearch        = ref('')
const userPageSize      = ref(50)
const userTotal         = ref(0)
const userPage          = ref(1)
const userFilterRole    = ref('')
const userFilterNode    = ref('')
const userFilterScope   = ref('')
const PAGE_SIZES        = [50, 100, 200, 500]
let   searchTimer       = null

const activeFilterCount = computed(() =>
  (userFilterRole.value ? 1 : 0) + (userFilterNode.value ? 1 : 0) + (userFilterScope.value ? 1 : 0)
)

function setFilterRole(val) {
  userFilterRole.value = val
  onFilterChange()
}

function setFilterScope(val) {
  userFilterScope.value = val
  // scope is client-side — no reload needed, just recompute
}

function onFilterChange() {
  loadUsers(true)
}

function resetFilters() {
  userFilterRole.value  = ''
  userFilterNode.value  = ''
  userFilterScope.value = ''
  loadUsers(true)
}

// ── Derived ───────────────────────────────────────────────────
const filteredFlatNodes = computed(() => {
  if (!search.value) return flatNodes.value
  const q = search.value.toLowerCase()
  return flatNodes.value.filter(n =>
    n.label.toLowerCase().includes(q) || (n.sub || '').toLowerCase().includes(q)
  )
})

function searchMatch(node) {
  if (!search.value) return false
  const q = search.value.toLowerCase()
  return node.label.toLowerCase().includes(q) || (node.sub || '').toLowerCase().includes(q)
}

const orgLayers = computed(() => {
  const layers = LAYER_LABELS.map(label => ({ label, nodes: [] }))
  for (const n of filteredFlatNodes.value) {
    if (n.depth <= 3) layers[n.depth]?.nodes.push(n)
  }
  return layers.filter(l => l.nodes.length > 0)
})

// Users assigned to the currently selected node (from node detail API response)
const nodeUsers = computed(() => {
  if (!selectedNode.value) return []
  return nodePermData.value[selectedNode.value.id]?.users ?? []
})

const totalUsers = computed(() => users.value.length)

const orgStats = computed(() => ({
  nodes:        flatNodes.value.length,
  users:        users.value.length,
  superAdmins:  users.value.filter(u => u.assignments?.some(a => a.role === 'super_admin')).length,
  regional:     users.value.filter(u => u.assignments?.some(a => a.role === 'regional_admin')).length,
  countryUsers: users.value.filter(u => u.assignments?.some(a => a.role === 'country_user')).length,
}))

// ── Data fetching ─────────────────────────────────────────────
async function loadNodes() {
  loadingNodes.value = true
  try {
    const rows = await apiFetch('/api/admin/org/nodes', { _skipLoader: true })
    flatNodes.value = rows.map(n => ({
      ...n,
      user_count: n.user_count ?? 0,
      // defaultRole used locally for permission display fallback
      defaultRole: TYPE_DEFAULT_ROLE[n.type] ?? 'viewer',
    }))
  } catch (e) {
    showToast('Failed to load org nodes')
  } finally {
    loadingNodes.value = false
  }
}

async function loadUsers(resetPage = false) {
  if (resetPage) userPage.value = 1
  loadingUsers.value = true
  try {
    const params = new URLSearchParams({
      limit: userPageSize.value,
      page:  userPage.value,
    })
    if (userSearch.value.trim())    params.set('search',  userSearch.value.trim())
    if (userFilterRole.value)       params.set('role',    userFilterRole.value)
    if (userFilterNode.value)       params.set('node_id', userFilterNode.value)
    const res = await apiFetch(`/api/admin/users?${params}`, { _skipLoader: true })
    users.value      = res.data
    userTotal.value  = res.total
  } catch {
    showToast('Failed to load user list')
  } finally {
    loadingUsers.value = false
  }
}

function onUserSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadUsers(true), 350)
}

function onPageSizeChange(size) {
  userPageSize.value = size
  loadUsers(true)
}

function showMore() {
  const steps = PAGE_SIZES
  const cur   = userPageSize.value
  const next  = steps.find(s => s > cur) ?? 500
  onPageSizeChange(next)
}

async function loadRoleMatrix() {
  try {
    roleMatrix.value = await apiFetch('/api/admin/permissions/matrix', { _skipLoader: true })
  } catch { /* use empty — getMatrixPerm returns 'none' safely */ }
}

// Lazy-load node detail (users + permission overrides) on demand
async function loadNodeDetail(nodeId, forceRefresh = false) {
  if (nodePermData.value[nodeId] && !forceRefresh) return
  try {
    const [nodeDetail, permDetail] = await Promise.all([
      apiFetch(`/api/admin/org/nodes/${nodeId}`, { _skipLoader: true }),
      apiFetch(`/api/admin/permissions/nodes/${nodeId}`, { _skipLoader: true }),
    ])
    nodePermData.value[nodeId] = {
      users:     nodeDetail.users ?? [],
      overrides: permDetail.overrides ?? {},
      resolved:  permDetail.resolved ?? {},
    }
  } catch {
    nodePermData.value[nodeId] = { users: [], overrides: {}, resolved: {} }
  }
}

// Lazy-load user effective permissions on demand
async function loadUserPerms(userId) {
  if (userPermData.value[userId]) return
  try {
    const data = await apiFetch(`/api/admin/permissions/users/${userId}`, { _skipLoader: true })
    userPermData.value[userId] = data
  } catch {
    userPermData.value[userId] = { assignments: [], permissions: {} }
  }
}

onMounted(() => {
  loadNodes()
  loadUsers()
  loadModules()
  // Matrix is admin-only — skip fetching for scoped actors and reset view if needed
  if (!isScopedActor.value) {
    loadRoleMatrix()
  } else if (view.value === 'matrix') {
    view.value = 'tree'
  }
})

// ── Node selection ────────────────────────────────────────────
async function selectNode(node) {
  selectedNode.value = node
  if (view.value !== 'tree') view.value = 'tree'
  await loadNodeDetail(node.id, true)
}

// ── Permission helpers ────────────────────────────────────────
function getMatrixPerm(roleId, modId, action) {
  return roleMatrix.value[roleId]?.[modId]?.[action] ?? 'none'
}

const savingMatrix = ref(false)

async function toggleMatrixPerm(roleId, modId, action) {
  const cur  = getMatrixPerm(roleId, modId, action)
  const next = cur === 'full' ? 'partial' : cur === 'partial' ? 'none' : 'full'

  // Optimistic update
  if (!roleMatrix.value[roleId]) roleMatrix.value[roleId] = {}
  if (!roleMatrix.value[roleId][modId]) roleMatrix.value[roleId][modId] = {}
  roleMatrix.value[roleId][modId][action] = next

  savingMatrix.value = true
  try {
    await apiFetch('/api/admin/permissions/matrix', {
      method: 'PUT',
      body: { role_id: roleId, module_id: modId, action, state: next },
      _skipLoader: true,
    })
    showToast(`${roleId} · ${modId}.${action} → ${next}`)
  } catch {
    // Revert on failure
    roleMatrix.value[roleId][modId][action] = cur
    showToast('Failed to save permission')
  } finally {
    savingMatrix.value = false
  }
}

function getPermState(node, modId, action) {
  // Use resolved data from API if available (includes overrides)
  const resolved = nodePermData.value[node.id]?.resolved
  if (resolved) {
    // resolved is keyed by role → use the node's defaultRole
    return resolved[node.defaultRole]?.[modId]?.[action] ?? 'none'
  }
  // Fallback to in-memory matrix before API data arrives
  return getMatrixPerm(node.defaultRole, modId, action)
}

async function togglePerm(node, modId, action) {
  const cur  = getPermState(node, modId, action)
  const next = cur === 'full' ? 'partial' : cur === 'partial' ? 'none' : 'full'

  // Optimistic update
  if (!nodePermData.value[node.id]) {
    nodePermData.value[node.id] = { users: [], overrides: {}, resolved: {} }
  }
  const cache = nodePermData.value[node.id]
  if (!cache.overrides[modId]) cache.overrides[modId] = {}
  cache.overrides[modId][action] = next
  // also patch resolved for instant feedback
  for (const role of Object.keys(cache.resolved)) {
    if (!cache.resolved[role][modId]) cache.resolved[role][modId] = {}
    cache.resolved[role][modId][action] = next
  }

  savingPerm.value = true
  try {
    await apiFetch(`/api/admin/permissions/nodes/${node.id}`, {
      method: 'PUT',
      body: { module_id: modId, action, state: next },
      _skipLoader: true,
    })
    showToast(`${node.label} · ${modId}.${action} → ${next}`)
  } catch {
    // Revert optimistic update on failure
    cache.overrides[modId][action] = cur
    showToast('Failed to save permission')
  } finally {
    savingPerm.value = false
  }
}

const settingFullAccess = ref(false)
const ALL_ACTIONS = ['view', 'create', 'delete', 'upload']

// Reset all module overrides back to role defaults for a node
async function resetNodeAccess(node) {
  settingFullAccess.value = true
  try {
    const calls = []
    for (const mod of permModules) {
      for (const action of ALL_ACTIONS) {
        calls.push(apiFetch(
          `/api/admin/permissions/nodes/${node.id}/override?module_id=${mod.id}&action=${action}`,
          { method: 'DELETE', _skipLoader: true }
        ).catch(() => {})) // ignore 404 if override doesn't exist
      }
    }
    await Promise.all(calls)
    // Force reload from server
    await loadNodeDetail(node.id, true)
    showToast(`${node.label} — Permissions reset to role defaults`)
  } catch {
    showToast('Failed to reset permissions')
  } finally {
    settingFullAccess.value = false
  }
}

function getUserEffectivePerm(userId, modId, action) {
  return userPermData.value[userId]?.permissions?.[modId]?.[action] ?? 'none'
}

// When selecting a user, also load their effective permissions
watch(selectedUser, async (u) => {
  // Always reset edit state whenever user changes (including switching to another user)
  editingUser.value     = false
  editErr.value         = ''
  asgnErr.value         = ''
  pwChangedNotice.value = false
  editAssignments.value = []
  if (u) await loadUserPerms(u.id)
})

// ── User helpers ──────────────────────────────────────────────
// Normalise a user row to consistent shape for the template
function normaliseUser(u) {
  const firstAssignment = u.assignments?.[0]
  return {
    ...u,
    // display shorthands the template expects
    name:     u.full_name || u.username,
    role:     firstAssignment?.role     ?? 'viewer',
    nodeId:   firstAssignment?.node_id  ?? '',
    nodeName: firstAssignment?.node_label ?? '—',
    scope:    scopeLabel(firstAssignment?.node_type),
    country:  firstAssignment?.country  ?? 'Global',
  }
}

function scopeLabel(type) {
  if (!type) return 'Global'
  if (type === 'country') return 'Country'
  if (type === 'fab')     return 'Factory'
  if (type === 'bu')      return 'BU'
  return 'Global'
}

const normalisedUsers = computed(() => users.value.map(normaliseUser))

// scope filter is client-side (derived from node_type)
const SCOPE_TYPE_MAP = { global: ['group','hq'], bu: ['bu'], country: ['country'], factory: ['fab'] }
const filteredNormalisedUsers = computed(() => {
  if (!userFilterScope.value) return normalisedUsers.value
  const types = SCOPE_TYPE_MAP[userFilterScope.value] ?? []
  return normalisedUsers.value.filter(u =>
    u.assignments?.some(a => types.includes(a.node_type))
  )
})

const hasMoreUsers = computed(() => users.value.length < userTotal.value)

// Roles the current actor is allowed to assign.
// Scoped actors (partial) cannot assign roles higher (lower level number) than their own.
// auth.roles is [{ name, display_name, level }] — fetched via fetchRoles().
const assignableRoles = computed(() => {
  if (!isScopedActor.value) return roles  // full admins: all roles
  const actorRole = auth.roles?.find(r => r.name === auth.user?.role)
  const actorLevel = actorRole?.level ?? 99
  // Only roles at same level or below (higher number = less privilege)
  return roles.filter(r => {
    const roleDef = auth.roles?.find(ar => ar.name === r.id)
    return (roleDef?.level ?? 99) >= actorLevel
  })
})

// Org nodes grouped by layer for optgroup in select (used by remaining selects in this page)
const orgLayerGroups = computed(() => {
  const layers = LAYER_LABELS.map(label => ({ label, nodes: [] }))
  for (const n of flatNodes.value) {
    if (n.depth <= 3) layers[n.depth]?.nodes.push(n)
  }
  return layers.filter(l => l.nodes.length > 0)
})

// ── Add User callback (drawer is in <AddUserDrawer> component) ─
async function onUserCreated({ nodeId } = {}) {
  if (nodeId) delete nodePermData.value[nodeId]
  await Promise.all([loadUsers(), loadNodes()])
}


// ── Edit user profile ─────────────────────────────────────────
const editingUser     = ref(false)
const savingEdit      = ref(false)
const editErr         = ref('')
const pwChangedNotice = ref(false)
const editUser = reactive({
  full_name: '', display_name: '', email: '',
  job_title: '', department: '', country_code: '',
  is_active: true, password: '',
})

// ── Edit assignments state ────────────────────────────────────
const editAssignments = ref([])   // working copy of assignments in edit mode
const newAsgn         = reactive({ node_id: '', role: 'country_user', country: '' })
const asgnErr         = ref('')
const savingAsgn      = ref(false)
const savingAsgnIds   = ref(new Set())

function startEditUser() {
  const u = selectedUser.value
  if (!u) return
  Object.assign(editUser, {
    full_name:    u.full_name    || '',
    display_name: u.display_name || '',
    email:        u.email        || '',
    job_title:    u.job_title    || '',
    department:   u.department   || '',
    country_code: u.country_code || '',
    is_active:    u.is_active !== false,
    password:     '',
  })
  // Deep-copy assignments so we can mutate freely
  editAssignments.value = (u.assignments || []).map(a => ({ ...a }))
  Object.assign(newAsgn, { node_id: '', role: 'country_user', country: '' })
  editErr.value         = ''
  asgnErr.value         = ''
  pwChangedNotice.value = false
  editingUser.value     = true
}

function cancelEditUser() {
  editingUser.value = false
  editErr.value     = ''
  asgnErr.value     = ''
}

// Immediately persist role/country change on an existing assignment
async function onEditAsgnRoleChange(asgn) {
  asgnErr.value = ''
  savingAsgnIds.value = new Set([...savingAsgnIds.value, asgn.node_id])
  try {
    await apiFetch('/api/admin/permissions/assign', {
      method: 'POST',
      body: { user_id: selectedUser.value.id, node_id: asgn.node_id, role: asgn.role, country: asgn.country || null },
      _skipLoader: true,
    })
    delete userPermData.value[selectedUser.value.id]
  } catch (e) {
    asgnErr.value = e?.data?.error || e?.message || 'Update failed'
  } finally {
    const next = new Set(savingAsgnIds.value)
    next.delete(asgn.node_id)
    savingAsgnIds.value = next
  }
}

async function addEditAssignment() {
  if (!newAsgn.node_id) return
  asgnErr.value = ''
  savingAsgn.value = true
  try {
    await apiFetch('/api/admin/permissions/assign', {
      method: 'POST',
      body: { user_id: selectedUser.value.id, node_id: newAsgn.node_id, role: newAsgn.role, country: newAsgn.country || null },
    })
    const node = flatNodes.value.find(n => n.id === newAsgn.node_id)
    editAssignments.value.push({
      node_id:    newAsgn.node_id,
      node_label: node?.label || newAsgn.node_id,
      node_type:  node?.type  || '',
      role:       newAsgn.role,
      country:    newAsgn.country || '',
    })
    delete userPermData.value[selectedUser.value.id]
    Object.assign(newAsgn, { node_id: '', role: 'country_user', country: '' })
  } catch (e) {
    asgnErr.value = e?.data?.error || e?.message || 'Assign failed'
  } finally {
    savingAsgn.value = false
  }
}

async function removeEditAssignment(index, asgn) {
  asgnErr.value = ''
  savingAsgnIds.value = new Set([...savingAsgnIds.value, asgn.node_id])
  try {
    await apiFetch(`/api/admin/permissions/assign?user_id=${selectedUser.value.id}&node_id=${asgn.node_id}`, {
      method: 'DELETE',
      _skipLoader: true,
    })
    editAssignments.value.splice(index, 1)
    delete userPermData.value[selectedUser.value.id]
  } catch (e) {
    asgnErr.value = e?.data?.error || e?.message || 'Remove failed'
  } finally {
    const next = new Set(savingAsgnIds.value)
    next.delete(asgn.node_id)
    savingAsgnIds.value = next
  }
}

async function saveEditUser() {
  editErr.value = ''
  savingEdit.value = true
  const hadPassword = !!editUser.password
  try {
    const body = {
      full_name:    editUser.full_name    || undefined,
      display_name: editUser.display_name || undefined,
      email:        editUser.email        || undefined,
      job_title:    editUser.job_title    || undefined,
      department:   editUser.department   || undefined,
      country_code: editUser.country_code || undefined,
      is_active:    editUser.is_active,
    }
    if (editUser.password) body.password = editUser.password

    // 1. Save profile
    const updated = await apiFetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'PATCH',
      body,
    })

    delete userPermData.value[selectedUser.value.id]
    const idx = users.value.findIndex(u => u.id === updated.id)
    if (idx !== -1) Object.assign(users.value[idx], updated)
    await loadUsers()
    selectedUser.value = normalisedUsers.value.find(u => u.id === updated.id) || selectedUser.value
    editingUser.value  = false
    editUser.password  = ''
    if (hadPassword) {
      pwChangedNotice.value = true
      setTimeout(() => { pwChangedNotice.value = false }, 4000)
    }
    showToast(hadPassword ? 'Profile & password updated' : 'Profile updated')
  } catch (e) {
    editErr.value = e?.data?.error || e?.message || 'Update failed'
  } finally {
    savingEdit.value = false
  }
}


// ── Change role of user in a node ────────────────────────────
async function changeRole(user, newRole) {
  const nodeId = user.node_id || user.nodeId
  if (!nodeId) return
  try {
    await apiFetch('/api/admin/permissions/assign', {
      method: 'POST',
      body: { user_id: user.id, node_id: nodeId, role: newRole },
    })
    // Invalidate caches for this user & node
    delete userPermData.value[user.id]
    delete nodePermData.value[nodeId]
    await Promise.all([loadUsers(), loadNodeDetail(nodeId)])
    showToast(`Role updated: ${user.full_name || user.username} → ${newRole}`)
  } catch {
    showToast('Failed to update role', 'error')
  }
}

// ── Remove user from node ────────────────────────────────────
async function removeUser(user) {
  const nodeId = user.node_id || user.nodeId
  if (!nodeId) return
  try {
    await apiFetch(`/api/admin/permissions/assign?user_id=${user.id}&node_id=${nodeId}`, {
      method: 'DELETE',
    })
    delete nodePermData.value[nodeId]
    delete userPermData.value[user.id]
    await Promise.all([loadUsers(), loadNodes()])
    showToast('User removed from node')
  } catch {
    showToast('Failed to remove user from node', 'error')
  }
}

async function removeUserById(id) {
  const u = normalisedUsers.value.find(u => u.id === id)
  if (u) await removeUser(u)
  selectedUser.value = null
}

// ── Assign User to Node ───────────────────────────────────────
const assignableUsers = computed(() => {
  if (!selectedNode.value) return []
  const nodeId = selectedNode.value.id
  const alreadyIn = new Set((nodePermData.value[nodeId]?.users ?? []).map(u => u.id))
  const q = assignNodeSearch.value.trim().toLowerCase()
  return normalisedUsers.value.filter(u => {
    if (alreadyIn.has(u.id)) return false
    if (!q) return true
    return (u.name || u.username || '').toLowerCase().includes(q) ||
           (u.email || '').toLowerCase().includes(q)
  })
})

watch(showAssignToNode, (open) => {
  if (open) {
    assignNodeSearch.value = ''
    // default role for each user = node defaultRole
    const defaultRole = selectedNode.value?.defaultRole || 'country_user'
    assignRoleMap.value = Object.fromEntries(
      normalisedUsers.value.map(u => [u.id, u.role || defaultRole])
    )
  }
})

async function assignUserToNode(user) {
  if (!selectedNode.value) return
  const nodeId = selectedNode.value.id
  const role   = assignRoleMap.value[user.id] || selectedNode.value.defaultRole || 'country_user'
  assigningIds.value = new Set([...assigningIds.value, user.id])
  try {
    await apiFetch('/api/admin/permissions/assign', {
      method: 'POST',
      body: { user_id: user.id, node_id: nodeId, role },
      _skipLoader: true,
    })
    // invalidate caches so list refreshes
    delete nodePermData.value[nodeId]
    delete userPermData.value[user.id]
    await Promise.all([loadNodeDetail(nodeId, true), loadUsers()])
    showToast(`${user.name || user.email} assigned to ${selectedNode.value.label}`)
  } catch (e) {
    showToast(e?.data?.error || 'Assign failed', 'error')
  } finally {
    const next = new Set(assigningIds.value)
    next.delete(user.id)
    assigningIds.value = next
  }
}

// ── Modules (handled by <ModulesEditor>) ─────────────────────
// Page still loads modules once on mount so matrix/tree views can
// render the badges. <ModulesEditor> owns its own state internally
// and emits 'changed' when admin edits something so we re-sync.
async function loadModules() {
  try {
    const data = await apiFetch('/api/admin/permissions/modules?all=true', { _skipLoader: true })
    permModules.splice(0, permModules.length, ...data.filter(m => m.is_active).map(m => ({
      id: m.id, name: m.name, abbr: m.abbr, color: m.color,
    })))
  } catch {
    showToast('Failed to load modules', 'error')
  }
}

function onModulesChanged(activeModules) {
  permModules.splice(0, permModules.length, ...activeModules.map(m => ({
    id: m.id, name: m.name, abbr: m.abbr, color: m.color,
  })))
  // Clear cached node/user perms because module list changed
  nodePermData.value = {}
  userPermData.value = {}
  loadRoleMatrix().catch(() => {})
}

</script>

<style scoped>
/* ── Permissions page ────────────────────────────── */
.permissions-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  background: var(--bg);
}

/* ── Page header ─────────────────────────────────── */
.page-header { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding:20px 24px 16px; background:var(--bg-elev); border-bottom:1px solid var(--line); flex-shrink:0; }
.page-title { font-size:20px; font-weight:800; letter-spacing:-0.02em; margin:0 0 2px; background:linear-gradient(135deg,var(--fg) 0%,var(--accent) 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.page-sub { font-size:12px; color:var(--fg-mute); margin:0; }
.header-right { display:flex; align-items:center; gap:8px; }

/* View toggle */
.view-toggle { display:flex; background:var(--line); border:1px solid var(--line-2); border-radius:8px; overflow:hidden; }
.vt-btn { display:flex; align-items:center; gap:5px; height:30px; padding:0 10px; background:transparent; border:0; border-right:1px solid var(--line); font-size:11px; font-weight:600; color:var(--fg-mute); cursor:pointer; transition:background .12s,color .12s; font-family:inherit; white-space:nowrap; }
.vt-btn:last-child { border-right:0; }
.vt-btn:hover { color:var(--fg); background:var(--line); }
.vt-btn.active { color:var(--accent); background:color-mix(in oklab, var(--accent) 8%, transparent); }


/* ── Stats strip ─────────────────────────────────── */
.stats-strip { display:flex; align-items:center; padding:10px 24px; background:var(--bg-elev); border-bottom:1px solid var(--line); flex-shrink:0; gap:0; }
.stat-item { display:flex; align-items:baseline; gap:7px; padding:0 16px 0 0; }
.stat-item:first-child { padding-left:0; }
.stat-val { font-size:18px; font-weight:800; letter-spacing:-0.02em; color:var(--fg); }
.stat-val.emerald { color:var(--ok); }
.stat-val.blue { color:#60a5fa; }
.stat-val.amber { color:var(--warn); }
.stat-val.muted { color:var(--fg-faint); }
.stat-lbl { font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--fg-mute); }
.stat-sep { width:1px; height:20px; background:var(--line-2); margin:0 16px; }

/* ── Body pane ───────────────────────────────────── */
.body-pane { display:flex; flex:1; min-height:0; gap:0; padding:14px 18px; align-items:stretch; overflow:hidden; }

/* ── TREE VIEW ───────────────────────────────────── */
.tree-pane {
  flex:1; min-width:0; background:var(--bg-elev); border:1px solid var(--line);
  border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.15);
  transition:flex .3s cubic-bezier(.4,0,.2,1), margin .3s cubic-bezier(.4,0,.2,1);
  display:flex; flex-direction:column;
}
.tree-pane.collapsed { flex:0 0 340px; margin-right:14px; }
.tree-scroll { flex:1; overflow-y:auto; overflow-x:hidden; min-height:0; padding:16px; display:flex; flex-direction:column; gap:20px; }

/* Layer block */
.layer-block { display:flex; flex-direction:column; gap:10px; }
.layer-label { display:flex; align-items:center; gap:10px; }
.layer-text { font-size:10px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:var(--fg-faint); white-space:nowrap; }
.layer-line { flex:1; height:1px; background:var(--line); }
.layer-nodes { display:flex; flex-wrap:wrap; gap:10px; }
.layer-wrap { flex-wrap:wrap; }

/* Org card */
.org-card {
  flex:0 1 200px; min-width:160px; max-width:220px;
  background:var(--line); border:1px solid var(--line-2);
  border-radius:10px; padding:12px; cursor:pointer;
  transition:background .12s,border-color .15s,transform .12s;
  position:relative;
}
.org-card::before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; border-radius:10px 0 0 10px; opacity:0; transition:opacity .15s; }
.org-card:hover { background:var(--bg-elev-2); transform:translateY(-1px); }
.org-card.selected { background:color-mix(in oklab, var(--accent) 4%, transparent); border-color:color-mix(in oklab, var(--accent) 25%, transparent); }
.org-card.selected::before { opacity:1; background:var(--accent); }
.org-card.search-match { border-color:color-mix(in oklab, var(--warn) 40%, transparent); background:color-mix(in oklab, var(--warn) 4%, transparent); }

/* Card type border colors */
.org-card.group::before { background:#afa9ec; }
.org-card.hq::before { background:#5dcaa5; }
.org-card.bu::before { background:#85b7eb; }
.org-card.fab::before { background:#f09b7b; }
.org-card.country::before { background:#ef9f27; }
.org-card:hover::before { opacity:0.6; }
.org-card.selected::before { opacity:1 !important; }

.org-card-head { display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; }
.org-card-icon { width:28px; height:28px; border-radius:8px; display:grid; place-items:center; flex-shrink:0; }
.org-card-icon.group { background:rgba(175,169,236,0.15); color:#afa9ec; }
.org-card-icon.hq { background:rgba(93,202,165,0.15); color:#5dcaa5; }
.org-card-icon.bu { background:rgba(133,183,235,0.15); color:#85b7eb; }
.org-card-icon.fab { background:rgba(240,155,123,0.15); color:#f09b7b; }
.org-card-icon.country { background:rgba(239,159,39,0.15); color:#ef9f27; }
.org-card-info { flex:1; min-width:0; }
.org-card-name { font-size:12px; font-weight:700; color:var(--fg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.org-card-sub { font-size:10px; color:var(--fg-mute); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
.org-card-foot { display:flex; align-items:center; justify-content:space-between; }
.user-count { display:flex; align-items:center; gap:3px; font-size:10px; color:var(--fg-faint); }

/* ── Role pills ──────────────────────────────────── */
.role-pill {
  display:inline-flex; align-items:center; gap:4px;
  font-size:9px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
  padding:2px 7px; border-radius:999px;
  border:1px solid transparent;
}
.role-pill.super_admin { background:rgba(175,169,236,0.15); color:#afa9ec; border-color:rgba(175,169,236,0.3); }
.role-pill.regional_admin { background:rgba(93,202,165,0.15); color:#5dcaa5; border-color:rgba(93,202,165,0.3); }
.role-pill.bu_manager { background:rgba(133,183,235,0.15); color:#85b7eb; border-color:rgba(133,183,235,0.3); }
.role-pill.country_user { background:rgba(239,159,39,0.15); color:#ef9f27; border-color:rgba(239,159,39,0.3); }
.role-pill.vendor { background:rgba(251,146,60,0.15); color:#fb923c; border-color:rgba(251,146,60,0.3); }
.role-pill.viewer { background:var(--line); color:var(--fg-mute); border-color:var(--line-2); }
.role-pill.lg { font-size:10px; padding:3px 9px; }

/* ── Permission matrix ───────────────────────────── */
.detail-body { flex:1; overflow-y:auto; min-height:0; }
.node-perms { flex-shrink:0; }
.perm-matrix { background:var(--line); border:1px solid var(--line-2); border-radius:8px; overflow:hidden; }
.perm-head { display:grid; grid-template-columns:1.8fr repeat(5,1fr); gap:0; padding:8px 12px; background:var(--line); border-bottom:1px solid var(--line-2); font-size:9px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:var(--fg-mute); }
.perm-row { display:grid; grid-template-columns:1.8fr repeat(5,1fr); gap:0; padding:7px 12px; border-bottom:1px solid var(--line); align-items:center; }
.perm-row:last-child { border-bottom:0; }
.perm-module { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; color:var(--fg-dim); }
.perm-mod-icon { width:20px; height:20px; border-radius:5px; display:grid; place-items:center; font-size:9px; font-weight:800; flex-shrink:0; }
.perm-mod-icon.sm { width:16px; height:16px; font-size:8px; }
.perm-mod-icon.purple { background:rgba(167,139,250,0.15); color:#a78bfa; }
.perm-mod-icon.green  { background:rgba(52,211,153,0.15);  color:#34d399; }
.perm-mod-icon.blue   { background:rgba(96,165,250,0.15);  color:#60a5fa; }
.perm-mod-icon.red    { background:rgba(248,113,113,0.15); color:#f87171; }
.perm-mod-icon.orange { background:rgba(251,146,60,0.15);  color:#fb923c; }
.perm-mod-icon.teal   { background:rgba(45,212,191,0.15);  color:#2dd4bf; }
.perm-mod-icon.amber  { background:rgba(251,191,36,0.15);  color:#fbbf24; }
.perm-mod-icon.indigo { background:rgba(129,140,248,0.15); color:#818cf8; }
.perm-mod-icon.pink   { background:rgba(244,114,182,0.15); color:#f472b6; }
.perm-mod-icon.cyan   { background:rgba(34,211,238,0.15);  color:#22d3ee; }
.perm-cell { display:grid; place-items:center; }
.perm-toggle { width:24px; height:24px; border-radius:6px; border:1px solid transparent; display:grid; place-items:center; cursor:pointer; transition:background .12s,border-color .12s,color .12s; }
.perm-toggle.full    { background:color-mix(in oklab, var(--ok) 12%, transparent); border-color:color-mix(in oklab, var(--ok) 30%, transparent); color:var(--ok); }
.perm-toggle.partial { background:color-mix(in oklab, var(--warn) 12%, transparent); border-color:color-mix(in oklab, var(--warn) 30%, transparent); color:var(--warn); }
.perm-toggle.none    { background:var(--line); border-color:var(--line-2); color:var(--fg-faint); }
.perm-toggle:hover { opacity:0.8; transform:scale(1.1); }

/* ── MATRIX VIEW ─────────────────────────────────── */
.matrix-full { flex:1; min-width:0; display:flex; gap:14px; overflow:hidden; }
.matrix-scroll { flex:1; overflow:auto; background:var(--bg-elev); border:1px solid var(--line); border-radius:12px; }
.big-matrix { width:100%; border-collapse:collapse; }
.big-matrix th, .big-matrix td { padding:0; }
.mat-sticky { position:sticky; left:0; background:var(--bg-elev); z-index:2; }
.big-matrix thead tr { position:sticky; top:0; z-index:3; }
.big-matrix thead th { background:var(--bg-elev); }
.mat-role-head { text-align:center; padding:12px 8px; border-bottom:1px solid var(--line); background:var(--bg-elev); white-space:nowrap; }
.big-matrix thead th.mat-sticky { z-index:4; }
.role-head-inner { display:flex; flex-direction:column; align-items:center; gap:4px; }
.role-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.role-dot.super_admin { background:#afa9ec; }
.role-dot.regional_admin { background:#5dcaa5; }
.role-dot.bu_manager { background:#85b7eb; }
.role-dot.country_user { background:#ef9f27; }
.role-dot.vendor { background:#fb923c; }
.role-dot.viewer { background:var(--fg-mute); }
.mat-role-head > .role-head-inner > span:last-child { font-size:9px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:var(--fg-mute); }
.mat-mod-header td { padding:10px 14px; background:var(--line); border-top:1px solid var(--line); border-bottom:1px solid var(--line); font-size:11px; font-weight:700; color:var(--fg-dim); display:flex; align-items:center; gap:7px; }
.mat-action-row td { border-bottom:1px solid var(--line); }
.mat-action-label { padding:7px 14px; font-size:11px; color:var(--fg-mute); white-space:nowrap; }
.action-indent { color:var(--fg-faint); margin-right:4px; }
.mat-cell { text-align:center; padding:6px 8px; }
.mat-perm-chip { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:6px; cursor:pointer; transition:filter 0.15s, transform 0.1s; padding:0; }
.mat-perm-chip.full    { background:color-mix(in oklab, var(--ok) 12%, transparent); color:var(--ok); border:1px solid color-mix(in oklab, var(--ok) 25%, transparent); }
.mat-perm-chip.partial { background:color-mix(in oklab, var(--warn) 12%, transparent); color:var(--warn); border:1px solid color-mix(in oklab, var(--warn) 25%, transparent); }
.mat-perm-chip.none    { background:var(--line); color:var(--fg-faint); border:1px solid var(--line-2); }
.mat-perm-chip:hover   { filter:brightness(1.3); transform:scale(1.15); }
.mat-perm-chip:active  { transform:scale(0.95); }

/* Matrix legend */
.matrix-legend { width:200px; flex-shrink:0; background:var(--bg-elev); border:1px solid var(--line); border-radius:12px; padding:16px; overflow-y:auto; }
.legend-title { font-size:10px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:var(--fg-faint); margin-bottom:10px; }
.legend-row { display:flex; align-items:center; gap:8px; font-size:11px; color:var(--fg-mute); margin-bottom:6px; }
.legend-sep { height:1px; background:var(--line); margin:12px 0; }
.legend-role { display:flex; align-items:flex-start; gap:8px; margin-bottom:10px; }
.lr-name { font-size:11px; font-weight:700; color:var(--fg); }
.lr-desc { font-size:10px; color:var(--fg-mute); line-height:1.4; }

/* ── USERS VIEW ──────────────────────────────────── */
.users-pane {
  flex:1; min-width:0; background:var(--bg-elev); border:1px solid var(--line);
  border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.15);
  transition:flex .3s cubic-bezier(.4,0,.2,1),margin .3s cubic-bezier(.4,0,.2,1);
  display:flex; flex-direction:column;
}
.users-pane.collapsed { flex:0 0 320px; margin-right:14px; }
.list-rows { flex:1; overflow-y:auto; }
.table-head { display:grid; grid-template-columns:2fr 1fr 1.2fr 0.8fr 28px; gap:12px; padding:10px 16px; background:var(--line); border-bottom:1px solid var(--line); font-size:10px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:var(--fg-mute); flex-shrink:0; }
.table-head.compact { grid-template-columns:1fr auto; padding:10px 14px; }
.table-row { display:grid; grid-template-columns:2fr 1fr 1.2fr 0.8fr 28px; gap:12px; align-items:center; padding:11px 16px; border-bottom:1px solid var(--line); cursor:pointer; position:relative; transition:background .1s; }
.table-row::before { content:""; position:absolute; left:0; top:20%; bottom:20%; width:2px; border-radius:0 2px 2px 0; background:var(--accent); opacity:0; transition:opacity .15s; }
.table-row:hover { background:var(--line); }
.table-row:hover::before { opacity:0.5; }
.table-row.selected { background:color-mix(in oklab, var(--accent) 4%, transparent); }
.table-row.selected::before { opacity:1; }
.table-row:last-child { border-bottom:0; }
.cell-name { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--fg); }
.cell-meta { font-size:11px; color:var(--fg-mute); }
.cell-action { display:grid; place-items:center; color:var(--fg-faint); transition:color .12s,transform .12s; }
.table-row:hover .cell-action { color:var(--accent); transform:translateX(2px); }
.compact-row { display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid var(--line); cursor:pointer; position:relative; transition:background .1s; }
.compact-row::before { content:""; position:absolute; left:0; top:0; bottom:0; width:2px; border-radius:0 2px 2px 0; background:var(--accent); opacity:0; transition:opacity .15s; }
.compact-row:hover { background:var(--line); }
.compact-row.selected { background:color-mix(in oklab, var(--accent) 5%, transparent); }
.compact-row.selected::before { opacity:1; }
.compact-row:last-child { border-bottom:0; }
.compact-avatar { width:30px; height:30px; border-radius:8px; background:color-mix(in oklab, var(--accent) 10%, transparent); color:var(--accent); font-size:10px; font-weight:800; display:grid; place-items:center; flex-shrink:0; }
.compact-avatar.sm { width:22px; height:22px; font-size:8px; border-radius:5px; }
.compact-info { flex:1; min-width:0; }
.compact-name { font-size:12px; font-weight:600; color:var(--fg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.compact-meta { font-size:10px; font-family:var(--font-mono); color:var(--fg-mute); }
/* ── Users toolbar (single row) ──────────────────── */
.users-toolbar {
  display:flex; align-items:center; gap:7px;
  padding:8px 14px;
  border-bottom:1px solid var(--line);
  flex-shrink:0; background:var(--bg-elev);
}
.toolbar-sep { width:1px; height:18px; background:var(--line-2); flex-shrink:0; margin:0 2px; }


/* Reset button — compact icon+badge only */
.filter-reset-btn {
  display:inline-flex; align-items:center; gap:4px;
  height:28px; padding:0 8px; flex-shrink:0;
  border:1px solid color-mix(in oklab, var(--danger) 20%, transparent); border-radius:6px;
  background:color-mix(in oklab, var(--danger) 5%, transparent); color:var(--danger);
  font-size:10px; font-weight:700; font-family:inherit; cursor:pointer;
  transition:background .12s,border-color .12s;
}
.filter-reset-btn:hover { background:color-mix(in oklab, var(--danger) 10%, transparent); border-color:color-mix(in oklab, var(--danger) 40%, transparent); }
.filter-count-badge {
  min-width:15px; height:15px; padding:0 3px;
  background:color-mix(in oklab, var(--danger) 25%, transparent); border-radius:999px;
  font-size:9px; font-weight:800; color:var(--danger);
  display:grid; place-items:center;
}
.page-size-group { display:flex; align-items:center; gap:4px; flex-shrink:0; }
.page-size-lbl { font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--fg-faint); margin-right:2px; }
.page-size-btn { height:28px; padding:0 10px; border-radius:6px; border:1px solid var(--line-2); background:transparent; color:var(--fg-mute); font-size:11px; font-weight:700; cursor:pointer; transition:background .12s,color .12s,border-color .12s; }
.page-size-btn:hover { background:var(--line); color:var(--fg-dim); }
.page-size-btn.active { background:color-mix(in oklab, var(--accent) 10%, transparent); border-color:color-mix(in oklab, var(--accent) 30%, transparent); color:var(--accent); }

/* Users footer with show more */
.users-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.show-more-btn { display:inline-flex; align-items:center; gap:5px; height:24px; padding:0 10px; border-radius:6px; border:1px solid color-mix(in oklab, var(--accent) 25%, transparent); background:color-mix(in oklab, var(--accent) 6%, transparent); color:var(--accent); font-size:10px; font-weight:700; cursor:pointer; transition:background .12s,border-color .12s; }
.show-more-btn:hover:not(:disabled) { background:color-mix(in oklab, var(--accent) 12%, transparent); border-color:color-mix(in oklab, var(--accent) 40%, transparent); }
.show-more-btn:disabled { opacity:0.5; cursor:not-allowed; }

.table-footer { padding:8px 16px; border-top:1px solid var(--line); font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--fg-mute); background:var(--line); flex-shrink:0; }
.empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px 20px; gap:8px; }
.empty-icon { width:44px; height:44px; border-radius:10px; border:1px dashed var(--line-2); display:grid; place-items:center; color:var(--fg-faint); margin-bottom:4px; }
.empty-title { font-size:11px; font-weight:800; color:var(--fg-mute); }
.empty-sub { font-size:11px; color:var(--fg-faint); text-align:center; }

/* ── Detail panel ────────────────────────────────── */
.detail-panel {
  flex:1; min-width:0; background:var(--bg-elev); border:1px solid var(--line);
  border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.15);
  display:flex; flex-direction:column; max-height:100%;
}
.detail-head { display:flex; align-items:center; gap:11px; padding:14px 16px; border-bottom:1px solid var(--line); flex-shrink:0; }
.detail-avatar { width:36px; height:36px; border-radius:10px; display:grid; place-items:center; font-size:11px; font-weight:800; flex-shrink:0; }
.detail-avatar.group  { background:rgba(175,169,236,0.15); color:#afa9ec; }
.detail-avatar.hq     { background:rgba(93,202,165,0.15); color:#5dcaa5; }
.detail-avatar.bu     { background:rgba(133,183,235,0.15); color:#85b7eb; }
.detail-avatar.fab    { background:rgba(240,155,123,0.15); color:#f09b7b; }
.detail-avatar.country { background:rgba(239,159,39,0.15); color:#ef9f27; }
.detail-title-block { flex:1; min-width:0; }
.detail-name { font-size:13px; font-weight:700; color:var(--fg); }
.detail-prefix { font-size:10px; font-family:var(--font-mono); color:var(--fg-mute); }
.close-btn { background:transparent; border:0; color:var(--fg-mute); width:28px; height:28px; border-radius:6px; display:grid; place-items:center; cursor:pointer; transition:color .12s,background .12s; }
.close-btn:hover { color:var(--fg); background:var(--line); }

.detail-section { padding:14px 16px; display:flex; flex-direction:column; gap:8px; flex-shrink:0; }
.detail-section.node-perms { border-bottom:1px solid var(--line); }
.section-label { display:flex; align-items:center; gap:6px; font-size:10px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:var(--fg-mute); margin-bottom:6px; }
.section-action { margin-left:auto; font-size:10px; font-weight:700; color:var(--accent); background:color-mix(in oklab, var(--accent) 8%, transparent); border:1px solid color-mix(in oklab, var(--accent) 20%, transparent); padding:2px 8px; border-radius:5px; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; gap:4px; }
.section-action:hover { background:color-mix(in oklab, var(--accent) 14%, transparent); }
.section-action:disabled { opacity:0.45; cursor:not-allowed; }
.section-action.reset { color:var(--fg-dim); background:color-mix(in oklab, var(--fg-dim) 7%, transparent); border-color:color-mix(in oklab, var(--fg-dim) 18%, transparent); }
.section-action.reset:hover { background:color-mix(in oklab, var(--fg-dim) 13%, transparent); }
.section-actions-row { margin-left:auto; display:flex; align-items:center; gap:6px; }

/* User list in node detail */
.user-list { display:flex; flex-direction:column; gap:4px; }
.empty-mini { font-size:11px; color:var(--fg-faint); text-align:center; padding:20px; }
.user-row { display:flex; align-items:center; gap:8px; padding:8px 10px; background:var(--line); border:1px solid var(--line-2); border-radius:8px; }
.user-avatar { width:26px; height:26px; border-radius:7px; background:color-mix(in oklab, var(--accent) 8%, transparent); color:var(--accent); font-size:9px; font-weight:800; display:grid; place-items:center; flex-shrink:0; }
.user-info { flex:1; min-width:0; }
.user-name { font-size:12px; font-weight:600; color:var(--fg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.user-email { font-size:10px; color:var(--fg-mute); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.icon-btn { width:24px; height:24px; border-radius:5px; border:1px solid transparent; background:transparent; display:grid; place-items:center; cursor:pointer; transition:background .12s,color .12s; }
.icon-btn.danger { color:var(--fg-faint); }
.icon-btn.danger:hover { background:color-mix(in oklab, var(--danger) 10%, transparent); color:var(--danger); border-color:color-mix(in oklab, var(--danger) 20%, transparent); }

/* Detail meta */
.detail-meta { padding:12px 16px; border-bottom:1px solid var(--line); display:flex; flex-direction:column; gap:6px; flex-shrink:0; }
.meta-row { display:flex; justify-content:space-between; align-items:center; }
.meta-key { font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--fg-mute); }
.meta-val { font-size:12px; color:var(--fg-dim); }

/* Effective permissions */
.effective-perms { display:flex; flex-direction:column; gap:8px; overflow-y:auto; }
.ep-mod { display:flex; align-items:center; gap:8px; padding:7px 10px; background:var(--line); border:1px solid var(--line-2); border-radius:8px; }
.ep-mod-name { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; color:var(--fg-dim); min-width:160px; flex-shrink:0; }
.ep-chips { display:flex; flex-wrap:wrap; gap:4px; }
.ep-chip { font-size:9px; font-weight:700; letter-spacing:0.05em; padding:2px 7px; border-radius:5px; text-transform:uppercase; }
.ep-chip.full    { background:color-mix(in oklab, var(--ok) 12%, transparent); color:var(--ok); border:1px solid color-mix(in oklab, var(--ok) 20%, transparent); }
.ep-chip.partial { background:color-mix(in oklab, var(--warn) 12%, transparent); color:var(--warn); border:1px solid color-mix(in oklab, var(--warn) 20%, transparent); }
.ep-chip.none    { background:var(--line); color:var(--fg-faint); border:1px solid var(--line-2); text-decoration:line-through; opacity:0.5; }

/* Detail footer */
.detail-footer { padding:12px 16px; border-top:1px solid var(--line); background:var(--line); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
.detail-path { font-size:10px; font-family:var(--font-mono); color:var(--fg-faint); display:flex; align-items:center; gap:4px; }

/* ── User detail panel ───────────────────────────── */
/* Avatar in user detail (distinct from org node avatar) */
.ud-avatar {
  width:36px; height:36px; border-radius:10px; flex-shrink:0;
  background:color-mix(in oklab, var(--accent) 12%, transparent);
  border:1px solid color-mix(in oklab, var(--accent) 20%, transparent);
  color:var(--accent); font-size:11px; font-weight:800;
  display:grid; place-items:center;
}

/* Edit icon-btn active state */
.icon-btn.active { background:color-mix(in oklab, var(--accent) 10%, transparent); color:var(--accent); border-color:color-mix(in oklab, var(--accent) 25%, transparent); }
.icon-btn { color:var(--fg-mute); }
.icon-btn:hover:not(.danger) { background:var(--line); color:var(--fg); }

/* Scrollable body */
.ud-body { flex:1; overflow-y:auto; min-height:0; display:flex; flex-direction:column; }

/* Sections inside ud-body */
.ud-section { padding:14px 16px; border-bottom:1px solid var(--line); display:flex; flex-direction:column; gap:10px; }
.ud-section:last-child { border-bottom:0; flex:1; }
.ud-section-label { display:flex; align-items:center; gap:6px; font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-mute); }

/* Info grid — 2 columns */
.ud-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; }
.ud-field { display:flex; flex-direction:column; gap:3px; }
.ud-key { font-size:10px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--fg-faint); }
.ud-val { font-size:12px; color:var(--fg-dim); word-break:break-word; }
.ud-val.mono { font-family:var(--font-mono); font-size:11px; }

/* Status badge inline */
.ud-status { display:inline-block; font-size:10px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; padding:2px 8px; border-radius:999px; }
.ud-status.active   { background:color-mix(in oklab, var(--ok) 10%, transparent); color:var(--ok); border:1px solid color-mix(in oklab, var(--ok) 20%, transparent); }
.ud-status.inactive { background:color-mix(in oklab, var(--danger) 8%, transparent); color:var(--danger); border:1px solid color-mix(in oklab, var(--danger) 20%, transparent); }

/* Org assignment rows */
.ud-empty { font-size:11px; color:var(--fg-faint); padding:4px 0; }
.ud-asgn-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; background:var(--line); border:1px solid var(--line-2); border-radius:8px; }
.ud-asgn-node { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:600; color:var(--fg-dim); min-width:0; }
.ud-asgn-meta { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.ud-asgn-country { font-size:10px; color:var(--fg-mute); }

/* Edit form grid */
.edit-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

/* Edit assignment rows */
.ea-row {
  display:flex; align-items:center; gap:7px;
  padding:7px 10px;
  background:var(--line); border:1px solid var(--line-2);
  border-radius:8px;
}
.ea-row-saving { opacity:0.6; pointer-events:none; }
.ea-node {
  flex:1; min-width:0; font-size:12px; font-weight:600; color:var(--fg-dim);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.ea-remove-btn {
  width:22px; height:22px; border-radius:5px; flex-shrink:0;
  border:1px solid transparent; background:transparent;
  display:grid; place-items:center; cursor:pointer; color:var(--fg-faint);
  transition:background .12s,color .12s,border-color .12s;
}
.ea-remove-btn:hover { background:color-mix(in oklab, var(--danger) 10%, transparent); color:var(--danger); border-color:color-mix(in oklab, var(--danger) 20%, transparent); }

/* Add assignment row */
.ea-add-row {
  display:flex; align-items:center; gap:7px;
  padding:6px 0 2px;
  border-top:1px dashed var(--line-2);
  margin-top:4px;
}
.ea-add-btn {
  display:inline-flex; align-items:center; gap:5px;
  height:28px; padding:0 10px; flex-shrink:0;
  background:color-mix(in oklab, var(--accent) 8%, transparent); border:1px solid color-mix(in oklab, var(--accent) 20%, transparent);
  border-radius:6px; color:var(--accent);
  font-size:10px; font-weight:700; font-family:inherit; cursor:pointer;
  transition:background .12s,border-color .12s;
}
.ea-add-btn:hover:not(:disabled) { background:color-mix(in oklab, var(--accent) 14%, transparent); border-color:color-mix(in oklab, var(--accent) 35%, transparent); }
.ea-add-btn:disabled { opacity:0.35; cursor:not-allowed; }

/* Password changed notice */
.ud-pw-notice {
  display:flex; align-items:center; gap:8px;
  margin:12px 16px 0; padding:9px 12px;
  background:color-mix(in oklab, var(--ok) 8%, transparent); border:1px solid color-mix(in oklab, var(--ok) 20%, transparent);
  border-radius:8px; color:var(--ok); font-size:12px; font-weight:600;
  flex-shrink:0;
}
.pw-notice-enter-active { transition:opacity .25s ease,transform .25s ease; }
.pw-notice-leave-active { transition:opacity .2s ease,transform .2s ease; }
.pw-notice-enter-from   { opacity:0; transform:translateY(-6px); }
.pw-notice-leave-to     { opacity:0; transform:translateY(-4px); }

/* Password field hints */
.pw-hint      { font-size:10px; font-weight:400; color:var(--fg-faint); margin-left:6px; }
.pw-will-change {
  font-size:10px; font-weight:700; letter-spacing:.04em;
  color:var(--warn); background:color-mix(in oklab, var(--warn) 10%, transparent); border:1px solid color-mix(in oklab, var(--warn) 20%, transparent);
  padding:1px 6px; border-radius:4px; margin-left:6px;
}
.field-input.pw-pending {
  border-color:color-mix(in oklab, var(--warn) 45%, transparent);
  box-shadow:0 0 0 3px color-mix(in oklab, var(--warn) 7%, transparent);
}


/* ── Modal ───────────────────────────────────────── */
/* ── Drawer (split-panel) ─────────────────────────── */
.drawer-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex; align-items: stretch; justify-content: flex-end;
  z-index: 100; backdrop-filter: blur(3px);
}
.drawer {
  width: min(820px, 90vw);
  background: var(--bg-elev);
  border-left: 1px solid var(--line);
  box-shadow: -24px 0 80px rgba(0,0,0,0.3);
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* Drawer header */
.drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0; background: var(--line);
}
.drawer-title-wrap { display:flex; align-items:center; gap:9px; color:var(--fg); }
.drawer-title { font-size:14px; font-weight:700; color:var(--fg); }

/* Drawer body = split */
.drawer-body {
  flex: 1; display: flex; min-height: 0; overflow: hidden;
}

/* Left form pane */
.drawer-form {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column;
  border-right: 1px solid var(--line);
}

/* Right preview pane */
.drawer-preview {
  width: 240px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 0;
  background: var(--line);
  overflow-y: auto; padding: 0;
}
.preview-head {
  display: flex; align-items: center; gap: 7px;
  font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--fg-faint);
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--line);
}

/* Avatar card */
.preview-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid var(--line);
}
.preview-avatar {
  width: 52px; height: 52px; border-radius: 14px;
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 20%, transparent);
  color: var(--accent); font-size: 16px; font-weight: 800;
  display: grid; place-items: center; flex-shrink: 0;
}
.preview-card-name { font-size: 13px; font-weight: 700; color: var(--fg); text-align: center; }
.preview-card-email { font-size: 11px; color: var(--fg-mute); text-align: center; word-break: break-all; }

/* Preview rows */
.preview-rows {
  display: flex; flex-direction: column;
  padding: 12px 16px; gap: 8px;
  border-bottom: 1px solid var(--line);
}
.preview-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.pr-key { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--fg-faint); flex-shrink: 0; }
.pr-val { font-size: 11px; color: var(--fg-dim); text-align: right; }

/* Org assignment */
.preview-assign {
  padding: 12px 16px; display: flex; flex-direction: column; gap: 6px;
  border-bottom: 1px solid var(--line);
}
.preview-assign.muted-block {
  flex-direction: row; align-items: center; gap: 8px;
  color: var(--fg-faint); font-size: 11px;
}
.pa-head { display:flex; align-items:center; gap:6px; font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-faint); }
.pa-node { font-size: 12px; font-weight: 700; color: var(--fg); }
.pa-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.pa-country { font-size: 10px; color: var(--fg-mute); }
.pa-country.muted { color: var(--fg-faint); }
.role-pill.sm { font-size: 8px; padding: 1px 5px; }

/* Checklist */
.preview-checklist {
  padding: 12px 16px; display: flex; flex-direction: column; gap: 6px;
}
.pc-item {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; color: var(--fg-faint); transition: color .15s;
}
.pc-item svg { opacity: 0.2; flex-shrink: 0; transition: opacity .15s; }
.pc-item.done { color: var(--ok); }
.pc-item.done svg { opacity: 1; }

/* Form sections */
.form-section { padding: 16px 20px; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 12px; }
.form-section:last-child { border-bottom: 0; }
.form-section-head { display:flex; align-items:center; gap:7px; font-size:11px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:var(--fg-mute); margin-bottom:2px; }
.section-optional { font-size:10px; font-weight:600; color:var(--fg-faint); text-transform:none; letter-spacing:0; margin-left:4px; }
.form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }


/* Field error state */
.field-input.field-error { border-color:color-mix(in oklab, var(--danger) 50%, transparent); box-shadow:0 0 0 3px color-mix(in oklab, var(--danger) 7%, transparent); }
.field-err-msg { font-size:11px; color:var(--danger); margin-top:4px; }
.req { color:var(--danger); margin-left:2px; }

/* Error bar + footer */
.drawer-err-bar { display:flex; align-items:center; gap:8px; padding:10px 20px; background:color-mix(in oklab, var(--danger) 8%, transparent); border-top:1px solid color-mix(in oklab, var(--danger) 15%, transparent); color:var(--danger); font-size:12px; flex-shrink:0; }
.drawer-foot { display:flex; justify-content:flex-end; align-items:center; gap:8px; padding:14px 20px; border-top:1px solid var(--line); background:var(--line); flex-shrink:0; }
.drawer-foot-info { flex:1; font-size:11px; color:var(--fg-mute); }
.asgn-user-row { display:flex; align-items:center; gap:8px; padding:8px 10px; background:var(--line); border:1px solid var(--line-2); border-radius:8px; margin-bottom:6px; }
.asgn-current-nodes { display:flex; flex-wrap:wrap; gap:4px; margin-top:3px; }
.asgn-node-tag { display:inline-flex; align-items:center; gap:3px; font-size:9px; color:var(--fg-mute); background:var(--line); border:1px solid var(--line-2); border-radius:4px; padding:1px 5px; }

/* Spin */
@keyframes spin { to { transform:rotate(360deg); } }
.spin { animation:spin .7s linear infinite; }

/* Drawer slide-in transition */
/* Backdrop fade */
.drawer-enter-active { transition: background .35s ease, backdrop-filter .35s ease; }
.drawer-leave-active { transition: background .25s ease, backdrop-filter .25s ease; }
.drawer-enter-from { background: rgba(0,0,0,0); backdrop-filter: blur(0px); }
.drawer-leave-to   { background: rgba(0,0,0,0); backdrop-filter: blur(0px); }

/* Drawer panel slide — animate the .drawer child */
.drawer-enter-active .drawer { transition: transform .38s cubic-bezier(.16,1,.3,1); }
.drawer-leave-active .drawer { transition: transform .28s cubic-bezier(.4,0,1,1); }
.drawer-enter-from .drawer   { transform: translateX(100%); }
.drawer-leave-to   .drawer   { transform: translateX(100%); }
.field { display:flex; flex-direction:column; gap:6px; }
.field-label { font-size:10px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:var(--fg-mute); }

/* Native select styled to match DsDropdown */
.field-select {
  width:100%; height:36px; padding:0 30px 0 10px;
  background:var(--bg-elev-2);
  border:1px solid var(--line-2); border-radius:8px;
  color:var(--fg); font-size:12px; font-family:inherit;
  appearance:none; -webkit-appearance:none; cursor:pointer;
  transition:border-color .15s, box-shadow .15s;
}
.field-select:focus { outline:none; border-color:color-mix(in oklab, var(--accent) 35%, transparent); box-shadow:0 0 0 3px color-mix(in oklab, var(--accent) 7%, transparent); }
.field-select option { background:var(--bg-elev-2); color:var(--fg); }
.field-select optgroup { background:var(--bg-elev-2); color:var(--fg-mute); font-size:10px; }

/* Filter select (node picker with icon inside) */
.filter-select-wrap {
  position:relative; display:flex; align-items:center;
  background:var(--line); border:1px solid var(--line-2); border-radius:8px;
  transition:border-color .15s;
}
.filter-select-wrap.active { border-color:color-mix(in oklab, var(--accent) 30%, transparent); }
.filter-select-icon {
  position:absolute; left:9px; top:50%; transform:translateY(-50%);
  color:var(--fg-mute); pointer-events:none; flex-shrink:0;
}
.filter-select-input {
  width:100%; height:32px; padding:0 10px 0 26px;
  background:transparent; border:none; outline:none;
  color:var(--fg); font-size:12px; font-family:inherit;
  appearance:none; -webkit-appearance:none; cursor:pointer;
}
.filter-select-input option { background:var(--bg-elev-2); color:var(--fg); }
.filter-select-input optgroup { background:var(--bg-elev-2); color:var(--fg-mute); font-size:10px; }

/* ── Transitions ─────────────────────────────────── */
.panel-enter-active { transition:opacity .25s ease,transform .28s cubic-bezier(.4,0,.2,1); }
.panel-leave-active { transition:opacity .18s ease,transform .18s ease; }
.panel-enter-from { opacity:0; transform:translateX(16px); }
.panel-leave-to   { opacity:0; transform:translateX(12px); }

/* ── Modules view — same split-panel pattern as users view ─── */

/* Left card: list of modules (mirrors .users-pane) */
.mod-list-pane {
  flex:1; min-width:0;
  background:var(--bg-elev); border:1px solid var(--line);
  border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.15);
  transition:flex .3s cubic-bezier(.4,0,.2,1), margin .3s cubic-bezier(.4,0,.2,1);
  display:flex; flex-direction:column;
}
.mod-list-pane.collapsed { flex:0 0 320px; margin-right:14px; }

.mod-list-head {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 16px;
  background:var(--line); border-bottom:1px solid var(--line);
  flex-shrink:0;
}
.mod-list-count { font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-mute); }

.mod-new-btn {
  display:flex; align-items:center; gap:6px;
  height:28px; padding:0 10px;
  background:color-mix(in oklab, var(--accent) 10%, transparent); border:1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  color:var(--accent); border-radius:7px; font-size:11px; font-weight:600;
  cursor:pointer; transition:background .12s, border-color .12s;
}
.mod-new-btn:hover { background:color-mix(in oklab, var(--accent) 18%, transparent); border-color:color-mix(in oklab, var(--accent) 40%, transparent); }

/* Module rows (mirrors .table-row) */
.mod-row {
  display:flex; align-items:center; gap:10px;
  padding:11px 16px; border-bottom:1px solid var(--line);
  cursor:pointer; position:relative; transition:background .1s;
}
.mod-row::before {
  content:""; position:absolute; left:0; top:20%; bottom:20%;
  width:2px; border-radius:0 2px 2px 0;
  background:var(--accent); opacity:0; transition:opacity .15s;
}
.mod-row:hover { background:var(--line); }
.mod-row:hover::before { opacity:0.5; }
.mod-row.selected { background:color-mix(in oklab, var(--accent) 4%, transparent); }
.mod-row.selected::before { opacity:1; }
.mod-row:last-child { border-bottom:0; }
.mod-row.inactive { opacity:0.45; }

.mod-row-badge {
  width:30px; height:30px; border-radius:8px; flex-shrink:0;
  display:grid; place-items:center;
  font-family:var(--ds-font-mono,monospace); font-size:10px; font-weight:700;
}
.mod-row-info { flex:1; min-width:0; }
.mod-row-name { font-size:12px; font-weight:600; color:var(--fg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mod-row-route { font-size:10.5px; color:var(--fg-mute); font-family:var(--font-mono); margin-top:1px; }
.mod-inactive-tag {
  font-size:9.5px; font-family:var(--font-mono);
  padding:1px 6px; border-radius:4px;
  background:var(--line); color:var(--fg-mute);
}
.mod-row-delete {
  opacity:0; flex-shrink:0;
  width:26px; height:26px; border-radius:6px; border:none;
  background:transparent; color:var(--fg-mute); cursor:pointer;
  display:grid; place-items:center;
  transition:opacity .15s, background .15s, color .15s;
}
.mod-row:hover .mod-row-delete { opacity:1; }
.mod-row-delete:hover:not(:disabled) { background:color-mix(in oklab, var(--danger) 15%, transparent); color:var(--danger); }
.mod-row-delete:disabled { cursor:not-allowed; opacity:0.5; }
@keyframes spin { to { transform:rotate(360deg); } }
.spin { animation:spin .8s linear infinite; }

/* Right card: form panel — reuses .detail-panel from above, only unique parts here */
.mod-form-close {
  background:transparent; border:0; color:var(--fg-mute); cursor:pointer;
  width:28px; height:28px; border-radius:6px; display:grid; place-items:center;
  transition:background .1s, color .1s; margin-left:auto; flex-shrink:0;
}
.mod-form-close:hover { background:var(--line); color:var(--fg); }

.mod-form-body { flex:1; overflow-y:auto; padding:16px 20px; display:flex; flex-direction:column; gap:14px; }
.mod-field { display:flex; flex-direction:column; gap:5px; }
.mod-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.mod-label { font-size:11px; font-weight:600; color:var(--fg-mute); letter-spacing:0.04em; text-transform:uppercase; }
.mod-label-hint { font-size:10px; font-weight:400; color:var(--fg-faint); text-transform:none; letter-spacing:0; margin-left:4px; }

.mod-preview {
  background:var(--line); border:1px solid var(--line-2);
  border-radius:8px; padding:12px 14px; display:flex; flex-direction:column; gap:8px;
}
.mod-preview-row { display:flex; align-items:center; gap:9px; }
.mod-preview-name { font-size:13px; font-weight:600; color:var(--fg); }
.mod-preview-route { font-size:11px; font-family:var(--font-mono); color:var(--fg-mute); margin-left:4px; }

.mod-active-row { flex-direction:row !important; align-items:center; gap:10px; }
.mod-active-toggle {
  width:36px; height:20px; border-radius:999px;
  background:var(--line-2); border:1px solid var(--line-2);
  cursor:pointer; position:relative; transition:background .15s; flex-shrink:0;
}
.mod-active-toggle.on { background:color-mix(in oklab, var(--accent) 25%, transparent); border-color:color-mix(in oklab, var(--accent) 40%, transparent); }
.mod-active-knob {
  position:absolute; top:2px; left:2px;
  width:14px; height:14px; border-radius:50%;
  background:var(--fg-mute); transition:left .15s, background .15s;
}
.mod-active-toggle.on .mod-active-knob { left:18px; background:var(--accent); }
.mod-active-label { font-size:12px; color:var(--fg-mute); }

.mod-form-foot {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 20px 16px; border-top:1px solid var(--line); flex-shrink:0;
}
.mod-form-foot-right { display:flex; gap:8px; }
.mod-cancel-btn {
  height:32px; padding:0 14px; border-radius:7px;
  background:transparent; border:1px solid var(--line-2);
  color:var(--fg-mute); font-size:12px; font-weight:600; cursor:pointer;
  transition:border-color .12s, color .12s;
}
.mod-cancel-btn:hover { border-color:var(--fg-faint); color:var(--fg-dim); }
.mod-save-btn {
  height:32px; padding:0 16px; border-radius:7px;
  background:color-mix(in oklab, var(--accent) 12%, transparent); border:1px solid color-mix(in oklab, var(--accent) 30%, transparent);
  color:var(--accent); font-size:12px; font-weight:600; cursor:pointer; transition:background .12s;
}
.mod-save-btn:hover:not(:disabled) { background:color-mix(in oklab, var(--accent) 20%, transparent); }
.mod-save-btn:disabled { opacity:0.4; cursor:not-allowed; }
.mod-delete-btn {
  height:32px; padding:0 14px; border-radius:7px;
  background:color-mix(in oklab, var(--danger) 8%, transparent); border:1px solid color-mix(in oklab, var(--danger) 20%, transparent);
  color:var(--danger); font-size:12px; font-weight:600; cursor:pointer; transition:background .12s;
}
.mod-delete-btn:hover:not(:disabled) { background:color-mix(in oklab, var(--danger) 15%, transparent); }
.mod-delete-btn:disabled { opacity:0.4; cursor:not-allowed; }

/* Confirm modal buttons */
.cm-btn {
  height:34px; padding:0 16px; border-radius:8px;
  font-size:13px; font-weight:600; cursor:pointer; transition:background .12s, border-color .12s;
}
.cm-btn-cancel {
  background:transparent; border:1px solid var(--line-2); color:var(--fg-dim);
}
.cm-btn-cancel:hover { background:var(--line); border-color:var(--fg-faint); color:var(--fg); }
.cm-btn-danger {
  background:color-mix(in oklab, var(--danger) 15%, transparent); border:1px solid color-mix(in oklab, var(--danger) 30%, transparent); color:var(--danger);
}
.cm-btn-danger:hover { background:color-mix(in oklab, var(--danger) 25%, transparent); border-color:color-mix(in oklab, var(--danger) 50%, transparent); }

/* perm-mod-icon color variants for preview (missing from base) */
.perm-mod-icon.gray        { background:rgba(148,163,184,0.12); color:#94a3b8; }
.perm-mod-icon.purple      { background:rgba(167,139,250,0.12); color:#a78bfa; }
.perm-mod-icon.orange      { background:rgba(251,146,60,0.12);  color:#fb923c; }
.perm-mod-icon.red         { background:rgba(248,113,113,0.12); color:#f87171; }
.perm-mod-icon.teal        { background:rgba(45,212,191,0.12);  color:#2dd4bf; }

/* mod-row-badge reuses same color tokens as perm-mod-icon */
.mod-row-badge.gray        { background:rgba(148,163,184,0.12); color:#94a3b8; }
.mod-row-badge.indigo      { background:rgba(99,102,241,0.12);  color:#818cf8; }
.mod-row-badge.amber       { background:rgba(251,191,36,0.12);  color:#fbbf24; }
.mod-row-badge.pink        { background:rgba(244,114,182,0.12); color:#f472b6; }
.mod-row-badge.cyan        { background:rgba(34,211,238,0.12);  color:#22d3ee; }
.mod-row-badge.green       { background:rgba(74,222,128,0.12);  color:#4ade80; }
.mod-row-badge.blue        { background:rgba(96,165,250,0.12);  color:#60a5fa; }
.mod-row-badge.purple      { background:rgba(167,139,250,0.12); color:#a78bfa; }
.mod-row-badge.orange      { background:rgba(251,146,60,0.12);  color:#fb923c; }
.mod-row-badge.teal        { background:rgba(45,212,191,0.12);  color:#2dd4bf; }
.mod-row-badge.red         { background:rgba(248,113,113,0.12); color:#f87171; }

/* ── Tablet (≤1024px) ── */
@media (max-width: 1024px) {
  .page-header { padding: 16px 18px 14px; flex-wrap: wrap; gap: 10px; }
  .header-right { flex-wrap: wrap; gap: 6px; }
  .stats-strip { padding: 8px 18px; overflow-x: auto; flex-wrap: nowrap; gap: 0; }
  .stat-sep { flex-shrink: 0; }
  .body-pane { padding: 12px 14px; gap: 12px; }
  .view-toggle .vt-btn span { display: inline; }
  .org-card { flex: 0 1 calc(50% - 6px); min-width: 0; max-width: none; }
  /* Tree/Users panes stay full width — detail becomes popup */
  .tree-pane,
  .tree-pane.collapsed { flex: 1; margin-right: 0; }
  .users-pane,
  .users-pane.collapsed { flex: 1; margin-right: 0; }

  .detail-panel {
    position: fixed;
    inset: 0 0 0 auto;
    z-index: 40;
    width: 100% !important;
    max-width: 720px !important;
    min-height: 100vh;
    max-height: none;
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
  .table-head { grid-template-columns: 2fr 1fr 1fr 28px; gap: 10px; }
  .table-row  { grid-template-columns: 2fr 1fr 1fr 28px; gap: 10px; }
  .table-head > *:nth-child(4),
  .table-row  > *:nth-child(4) { display: none; }
  .matrix-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .matrix-full { min-width: 0; overflow: hidden; }
}

/* ── Mobile (≤768px) ── */
@media (max-width: 768px) {
  .permissions-page { font-size: 13px; }
  .page-header {
    padding: 14px 16px 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .page-title { font-size: 18px; }
  .page-sub { font-size: 11.5px; }
  .header-right {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .header-right > :deep(.ds-input),
  .header-right > :deep(.ds-input-wrap) { flex: 1 1 100%; width: 100% !important; min-width: 0; }
  .header-right :deep(input) { width: 100% !important; }

  .view-toggle {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    scrollbar-width: none;
  }
  .view-toggle::-webkit-scrollbar { display: none; }
  .view-toggle .vt-btn { flex-shrink: 0; }
  .view-toggle .vt-btn span { display: inline; }

  .stats-strip {
    padding: 8px 14px;
    overflow-x: auto;
    flex-wrap: nowrap;
    gap: 0;
    -webkit-overflow-scrolling: touch;
  }
  .stat-val { font-size: 16px; }
  .stat-item { padding: 0 12px 0 0; }
  .stat-sep { margin: 0 12px; flex-shrink: 0; }

  .body-pane {
    padding: 10px;
    flex-direction: column;
    gap: 10px;
    overflow: visible;
  }

  .tree-pane,
  .tree-pane.collapsed,
  .users-pane,
  .users-pane.collapsed {
    flex: none;
    width: 100%;
    max-height: none;
    margin: 0;
    border-radius: 10px;
  }

  /* Mobile: fullscreen popup */
  .detail-panel {
    position: fixed;
    inset: 0;
    z-index: 40;
    width: 100% !important;
    max-width: 100% !important;
    min-height: 100vh;
    max-height: none;
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

  .org-list { flex-wrap: wrap; gap: 8px; padding: 0; }
  .org-card {
    flex: 0 0 100%;
    min-width: 0;
    max-width: 100%;
  }

  .table-head { display: none !important; }
  .table-row {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch;
    text-align: left;
    grid-template-columns: none !important;
    gap: 6px;
    padding: 12px 14px;
    position: relative;
    min-height: 56px;
  }
  .table-row > * {
    display: block !important;
    width: auto;
    text-align: left;
  }
  .table-row > *:first-child { font-weight: 600; font-size: 13px; padding-right: 32px; }
  .table-row > *:not(:first-child):not(:last-child) {
    font-size: 11.5px;
    color: var(--fg-mute);
  }
  .table-row > *:last-child {
    position: absolute;
    top: 14px; right: 12px;
    display: grid !important;
    place-items: center;
  }

  .matrix-full {
    overflow: hidden;
    padding: 0;
    flex-direction: column;
    gap: 10px;
  }
  .matrix-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
    flex: 1;
    min-width: 0;
  }
  .big-matrix { min-width: 520px; font-size: 11px; }
  .matrix-legend { width: 100%; max-width: 100%; }

  .drawer { width: 100% !important; max-width: 100% !important; border-radius: 16px 16px 0 0; }

  .perm-head { display: none; }
  .perm-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 12px;
  }
  .perm-row > *:nth-child(1) { flex: 1; min-width: 0; font-weight: 600; }

  /* Selected detail card under tree on mobile */
  :deep(.permission-matrix-card) { border-radius: 10px; }
}

/* ── Small mobile (≤480px) ── */
@media (max-width: 480px) {
  .page-header { padding: 12px 12px 10px; }
  .page-title { font-size: 16px; }
  .body-pane { padding: 8px; gap: 8px; }
  .tree-pane, .users-pane, .detail-panel { border-radius: 8px; }
  .stats-strip { padding: 6px 12px; }
  .view-toggle .vt-btn { padding: 6px 10px; font-size: 11px; }
}
</style>

<!-- Teleport styles: unscoped, prefixed with .perm-org-nav to avoid leaking -->
<style>
.perm-org-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  scrollbar-width: none;
}
.perm-org-nav::-webkit-scrollbar { display: none; }

.perm-org-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-faint);
  padding: 10px 10px 5px;
  white-space: nowrap;
}

.perm-org-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 7px;
  color: var(--fg-mute);
  text-decoration: none;
  font-size: 12px;
  cursor: pointer;
  transition: background .1s, color .1s;
  white-space: nowrap;
  overflow: hidden;
}
.perm-org-item:hover {
  background: var(--line);
  color: var(--fg-dim);
}
.perm-org-item.active {
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  color: var(--accent);
  font-weight: 600;
}

.perm-org-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.perm-org-dot.group   { background: #afa9ec; }
.perm-org-dot.hq      { background: #5dcaa5; }
.perm-org-dot.bu      { background: #85b7eb; }
.perm-org-dot.fab     { background: #f09b7b; }
.perm-org-dot.country { background: #ef9f27; }

.perm-org-node-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.perm-org-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  background: var(--line-2);
  color: var(--fg-faint);
  padding: 1px 6px;
  border-radius: 999px;
  flex-shrink: 0;
}
.perm-org-item.active .perm-org-badge {
  background: var(--accent);
  color: var(--accent-fg);
}
</style>
