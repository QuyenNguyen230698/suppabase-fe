// Route access tiers — see auth.global.ts strategy doc.
//   PUBLIC           → no auth required
//   AUTH_ONLY        → requires login only (self-service / generic user routes)
//   ADMIN_ONLY       → requires role level ≤ 2
//   PERMISSION_GATED → requires module view permission (full or partial) — allows BU Manager / Country User with partial access
//   DEV_ONLY         → only mounted in dev builds
// All other routes are module-gated by the active `modules` list from BE.
const PUBLIC_PREFIXES = ['/login', '/permission-error', '/share/'];

const AUTH_ONLY_PATHS = new Set<string>([
  '/',
  '/me',
  '/team',
  '/projects',
  '/pro-plan',
  '/chat',
  '/c',
]);

const ADMIN_ONLY_PATHS = new Set<string>([
  '/api-token',
]);

const ADMIN_ONLY_PREFIXES = ['/admin/'];

// Routes where any user with view permission (full OR partial) on the mapped module can enter.
// 'partial' means scoped access (own BU/country) — the page itself enforces data boundaries.
const PERMISSION_GATED_PATHS = new Map<string, string>([
  ['/permissions', 'permissions'],
]);

const DEV_ONLY_PREFIXES  = ['/design', '/design-builder'];

function isPublic(path: string) {
  return PUBLIC_PREFIXES.some(p => path === p || path.startsWith(p));
}
function isAuthOnly(path: string) {
  // /projects, /projects/:id, /me, /me/anything …
  if (AUTH_ONLY_PATHS.has(path)) return true;
  for (const p of AUTH_ONLY_PATHS) {
    if (path.startsWith(p + '/')) return true;
  }
  return false;
}
function isAdminOnly(path: string) {
  if (ADMIN_ONLY_PATHS.has(path)) return true;
  return ADMIN_ONLY_PREFIXES.some(p => path.startsWith(p));
}
function getPermissionGatedModule(path: string): string | null {
  return PERMISSION_GATED_PATHS.get(path) ?? null;
}
function isDevOnly(path: string) {
  return DEV_ONLY_PREFIXES.some(p => path === p || path.startsWith(p + '/'));
}

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  if (isPublic(to.path)) return;

  if (!auth.isLoggedIn) return navigateTo('/login');

  // Load permissions + modules + roles once per session
  const pending: Promise<void>[] = [];
  if (!auth.permissions) pending.push(auth.fetchPermissions());
  if (!auth.modules)     pending.push(auth.fetchModules());
  if (!auth.roles)       pending.push(auth.fetchRoles());
  if (pending.length)    await Promise.all(pending);

  // Tier 1: auth-only routes — any logged-in user
  if (isAuthOnly(to.path)) return;

  // Tier 2: admin-only routes
  if (isAdminOnly(to.path)) {
    if (!auth.isAdmin) {
      return navigateTo({ path: '/permission-error', query: { from: to.path } });
    }
    return;
  }

  // Tier 2.5: permission-gated routes — requires module view permission (full or partial).
  // 'partial' grants entry; the page and BE enforce data-scope boundaries for non-admins.
  const gatedModule = getPermissionGatedModule(to.path);
  if (gatedModule !== null) {
    // Permissions must be loaded before we can check — fetchPermissions() was called above.
    const state = auth.permissions?.[gatedModule]?.view;
    if (state !== 'full' && state !== 'partial') {
      return navigateTo({ path: '/permission-error', query: { from: to.path } });
    }
    return;
  }

  // Tier 3: dev-only routes — visible in dev, locked in prod
  if (isDevOnly(to.path)) {
    if (!import.meta.dev) {
      return navigateTo({ path: '/permission-error', query: { from: to.path } });
    }
    return;
  }

  // Tier 4: module-gated routes.
  // BE strips disallowed modules from `auth.modules`, so the cached list
  // represents exactly what the user can view. If the current path matches
  // an allowed module route → pass.
  const moduleRoutes = (auth.modules ?? [])
    .map((m: { route: string | null }) => m.route)
    .filter((r): r is string => !!r);

  if (moduleRoutes.some(r => to.path === r || to.path.startsWith(r + '/'))) {
    return;
  }

  // Unknown / disallowed module route → permission-error
  // (Truly missing pages still surface as 404 via the page layer.)
  return navigateTo({ path: '/permission-error', query: { from: to.path } });
});
