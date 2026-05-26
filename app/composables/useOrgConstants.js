// Org-wide constants shared by permissions / profile / admin pages.
// Pure data, no reactivity — safe to import anywhere.

export const ROLE_DEFS = [
  { id: 'super_admin',    label: 'Super Admin',    desc: 'PEB Group / HQ — full system access' },
  { id: 'regional_admin', label: 'Regional Admin', desc: 'Regional director — sees the whole BU' },
  { id: 'bu_manager',     label: 'BU Manager',     desc: 'Division / department head — manages a single BU' },
  { id: 'country_user',   label: 'Country User',   desc: 'Office staff — sees only their country' },
  { id: 'vendor',         label: 'Vendor',         desc: 'Contractor / partner — limited per-project access' },
  { id: 'viewer',         label: 'Viewer',         desc: 'Read-only, cannot edit' },
]

export const LAYER_LABELS = [
  'Tier 1 — Parent company (Group)',
  'Tier 2 — Regional HQ',
  'Tier 3 — Business Units',
  'Tier 4 — Country offices / Factories',
]

export const TYPE_DEFAULT_ROLE = {
  group: 'super_admin', hq: 'super_admin',
  bu: 'bu_manager', fab: 'bu_manager', country: 'country_user',
}

export const SCOPES = [
  { value: 'global',  label: 'Global'  },
  { value: 'bu',      label: 'BU'      },
  { value: 'country', label: 'Country' },
  { value: 'factory', label: 'Factory' },
]

export const LANGUAGES = [
  { code: 'en', label: 'English',          flag: '🇬🇧' },
  { code: 'vi', label: 'Vietnamese',       flag: '🇻🇳' },
  { code: 'zh', label: '中文',              flag: '🇨🇳' },
  { code: 'th', label: 'ภาษาไทย',          flag: '🇹🇭' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', label: 'Bahasa Melayu',    flag: '🇲🇾' },
  { code: 'tl', label: 'Filipino',         flag: '🇵🇭' },
  { code: 'ko', label: '한국어',            flag: '🇰🇷' },
  { code: 'ja', label: '日本語',            flag: '🇯🇵' },
  { code: 'fr', label: 'Français',         flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',          flag: '🇩🇪' },
]

export const COUNTRIES = [
  { code: 'VN', name: 'Vietnam',     flag: '🇻🇳' },
  { code: 'TH', name: 'Thailand',    flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia',   flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia',    flag: '🇲🇾' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'SG', name: 'Singapore',   flag: '🇸🇬' },
  { code: 'IN', name: 'India',       flag: '🇮🇳' },
  { code: 'AU', name: 'Australia',   flag: '🇦🇺' },
  { code: 'US', name: 'USA',         flag: '🇺🇸' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'JP', name: 'Japan',       flag: '🇯🇵' },
  { code: 'CN', name: 'China',       flag: '🇨🇳' },
  { code: 'DE', name: 'Germany',     flag: '🇩🇪' },
  { code: 'FR', name: 'France',      flag: '🇫🇷' },
]

export const JOB_TITLES = [
  'CEO / Managing Director',
  'COO / Operations Director',
  'CFO / Finance Director',
  'CTO / Technology Director',
  'Regional Director',
  'Country Manager',
  'BU Manager / Head of Business Unit',
  'Sales Manager',
  'Engineering Manager',
  'Project Manager',
  'Senior Engineer',
  'Engineer',
  'Junior Engineer',
  'Sales Executive',
  'Business Development',
  'Marketing Specialist',
  'Finance / Accounting',
  'HR Manager',
  'HR Specialist',
  'Admin / Office Manager',
  'IT Support',
  'Procurement',
  'Logistics / Supply Chain',
  'QA / Quality Control',
  'Factory Supervisor',
  'Factory Operator',
  'Intern / Trainee',
]

export const DEPARTMENTS = [
  'Executive',
  'Engineering',
  'Sales & Business Development',
  'Marketing',
  'Finance & Accounting',
  'Human Resources',
  'IT & Technology',
  'Operations',
  'Project Management',
  'Procurement',
  'Logistics & Supply Chain',
  'Quality Assurance',
  'Manufacturing / Factory',
  'Legal & Compliance',
  'Admin & Office',
  'Customer Service',
]
