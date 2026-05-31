/* ═══════════════════════════════════════════════════════════════════════════
   OpenMockADWebView v0.2.0 — Full-featured AD OU simulation tool
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Config ─────────────────────────────────────────────────────────────── */
const LEAF_TYPES = new Set(['User','Group','Computer','GPO','MSA','gMSA','dMSA','Contact','Printer','Share']);
const TYPE_LABELS = {OU:'OU',Container:'Container',User:'User',Group:'Group',Computer:'Computer',GPO:'GPO',MSA:'MSA',gMSA:'gMSA',dMSA:'dMSA',Contact:'Contact',Printer:'Printer',Share:'Share'};
function isLeaf(t) { return LEAF_TYPES.has(t); }
function getIcon(type, isOpen) {
  if (type === 'OU')        return isOpen ? '\uD83D\uDCC2' : '\uD83D\uDCC1';
  if (type === 'Container') return '\uD83D\uDCE6';
  if (type === 'Domain')    return '\uD83C\uDF10';
  if (type === 'User')      return '\uD83D\uDC64';
  if (type === 'Group')     return '\uD83D\uDC65';
  if (type === 'Computer')  return '\uD83D\uDCBB';
  if (type === 'GPO')       return '\uD83D\uDCCB';
  if (type === 'MSA')       return '\u2699\uFE0F';  // ⚙️ emoji — hue filter makes red
  if (type === 'gMSA')      return '\u2699\uFE0F';  // ⚙️ emoji — no filter, standard gear
  if (type === 'dMSA')      return '\u2699\uFE0F';  // ⚙️ emoji — hue filter makes green
  if (type === 'Contact')   return '\uD83E\uDEB9';  // 🪪 ID card
  if (type === 'Printer')   return '\uD83D\uDDA8\uFE0F';
  if (type === 'Share')     return '\uD83D\uDDC4\uFE0F';  // 🗄️ filing cabinet — stored/shared files
  return '\uD83D\uDCC1';
}

/* Colored cogs: U+2699 (text presentation) accepts CSS color unlike the emoji form */
function getIconFilter(type) {
  if (type === 'MSA')  return 'sepia(1) hue-rotate(310deg) saturate(5) brightness(0.9)';
  if (type === 'dMSA') return 'sepia(1) hue-rotate(80deg) saturate(5) brightness(0.9)';
  return null;  // gMSA and all others: no filter
}
function applyIconStyle(el, type) {
  const f = getIconFilter(type); if (f) el.style.filter = f;
}

/* ─── State ──────────────────────────────────────────────────────────────── */
let ROOT = null, selId = null, idSeq = 0;
const pSt = {};
let _pickerParent = null;
let _notesEdit = true;
let _hideBuiltins = false;
let _clip = null, _ctxId = null;
let _tt;

/* ─── Builtin names for hide feature ────────────────────────────────────── */
const BUILTIN_ALWAYS = new Set(['Builtin','ForeignSecurityPrincipals','Keys','Managed Service Accounts']);
const BUILTIN_CONTAINER_NAMES = new Set(['Computers','Users']);
const BUILTIN_OBJECTS = new Set([
  'Administrator','Guest','krbtgt',
  'Cert Publishers','Domain Admins','Domain Computers','Domain Controllers',
  'Domain Guests','Domain Users','Enterprise Admins',
  'Enterprise Read-only Domain Controllers','Group Policy Creator Owners',
  'Protected Users','Read-only Domain Controllers','Schema Admins',
  'Administrators','Account Operators','Backup Operators','Guests',
  'Network Configuration Operators','Print Operators',
  'Remote Desktop Users','Server Operators','Users'
]);

function isBuiltinNode(n, parent) {
  if (BUILTIN_ALWAYS.has(n.name)) return true;
  if (BUILTIN_CONTAINER_NAMES.has(n.name) && n.type === 'Container') return true;
  if (parent && BUILTIN_ALWAYS.has(parent.name)) return true;
  if (parent && BUILTIN_CONTAINER_NAMES.has(parent.name) && parent.type === 'Container') return true;
  return false;
}

/* ─── Default data ───────────────────────────────────────────────────────── */
const DEFAULT = {"Name": "example.com", "Type": "Domain", "Description": "", "Children": [{"Name": "Admin", "Type": "OU", "Description": "", "Children": [{"Name": "Tier 0", "Type": "OU", "Description": "", "Children": [{"Name": "T0 Groups", "Type": "OU", "Description": "", "Children": [{"Name": "T0 Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "T0 PAWs", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Servers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Service Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Users", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "Tier 1", "Type": "OU", "Description": "", "Children": [{"Name": "T1 Computers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T1 Groups", "Type": "OU", "Description": "", "Children": [{"Name": "T1 Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "T1 Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "T1 Servers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T1 Service Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "Users", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "Tier 2", "Type": "OU", "Description": "", "Children": [{"Name": "T2 Computers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Groups", "Type": "OU", "Description": "", "Children": [{"Name": "T2 Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "T2 Servers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Service Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Users", "Type": "OU", "Description": "", "Children": []}]}]}, {"Name": "Corporate", "Type": "OU", "Description": "", "Children": [{"Name": "Bind Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "Computers", "Type": "OU", "Description": "", "Children": []}, {"Name": "Distribution Lists", "Type": "OU", "Description": "", "Children": []}, {"Name": "Groups", "Type": "OU", "Description": "", "Children": [{"Name": "Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "Users", "Type": "OU", "Description": "", "Children": [{"Name": "Africa", "Type": "OU", "Description": "", "Children": []}, {"Name": "Asia", "Type": "OU", "Description": "", "Children": []}, {"Name": "EU", "Type": "OU", "Description": "", "Children": []}, {"Name": "US", "Type": "OU", "Description": "", "Children": []}]}]}, {"Name": "Domain Controllers", "Type": "OU", "Description": "", "Children": []}]};

/* ─── Template data ──────────────────────────────────────────────────────── */
const TMPL_WINDEFAULT = {"Name": "example.com", "Type": "Domain", "Description": "Default Windows Server AD", "Children": [{"Name": "Builtin", "Type": "Container", "Description": "Default container for built-in accounts and groups", "Children": [{"Name": "Administrators", "Type": "Group", "Description": "Members can fully administer the computer/domain", "Children": []}, {"Name": "Account Operators", "Type": "Group", "Description": "Members can administer domain user and group accounts", "Children": []}, {"Name": "Backup Operators", "Type": "Group", "Description": "Members can bypass file security to back up files", "Children": []}, {"Name": "Guests", "Type": "Group", "Description": "Users granted guest access to the computer/domain", "Children": []}, {"Name": "Network Configuration Operators", "Type": "Group", "Description": "Members can manage TCP/IP network configuration", "Children": []}, {"Name": "Print Operators", "Type": "Group", "Description": "Members can administer printers installed on domain controllers", "Children": []}, {"Name": "Remote Desktop Users", "Type": "Group", "Description": "Members are granted the right to log on remotely", "Children": []}, {"Name": "Server Operators", "Type": "Group", "Description": "Members can administer domain servers", "Children": []}, {"Name": "Users", "Type": "Group", "Description": "Prevents accidental or intentional system-wide changes", "Children": []}]}, {"Name": "Computers", "Type": "Container", "Description": "Default container for machine accounts", "Children": []}, {"Name": "Domain Controllers", "Type": "OU", "Description": "Default OU for domain controller computer accounts", "Children": []}, {"Name": "ForeignSecurityPrincipals", "Type": "Container", "Description": "Security principals from external trusted domains", "Children": []}, {"Name": "Keys", "Type": "Container", "Description": "Default container for key credential objects", "Children": []}, {"Name": "Managed Service Accounts", "Type": "Container", "Description": "Default container for managed service accounts", "Children": []}, {"Name": "Users", "Type": "Container", "Description": "Default container for user and group objects", "Children": [{"Name": "Administrator", "Type": "User", "Description": "Built-in account for administering the computer/domain", "Children": []}, {"Name": "Guest", "Type": "User", "Description": "Built-in account for guest access", "Children": []}, {"Name": "krbtgt", "Type": "User", "Description": "Key Distribution Center service account", "Children": []}, {"Name": "Cert Publishers", "Type": "Group", "Description": "Members can publish certificates to Active Directory", "Children": []}, {"Name": "Domain Admins", "Type": "Group", "Description": "Designated administrators of the domain", "Children": []}, {"Name": "Domain Computers", "Type": "Group", "Description": "All workstations and servers joined to the domain", "Children": []}, {"Name": "Domain Controllers", "Type": "Group", "Description": "All domain controllers in the domain", "Children": []}, {"Name": "Domain Guests", "Type": "Group", "Description": "All domain guests", "Children": []}, {"Name": "Domain Users", "Type": "Group", "Description": "All domain users", "Children": []}, {"Name": "Enterprise Admins", "Type": "Group", "Description": "Designated administrators of the enterprise", "Children": []}, {"Name": "Enterprise Read-only Domain Controllers", "Type": "Group", "Description": "RODCs in the enterprise", "Children": []}, {"Name": "Group Policy Creator Owners", "Type": "Group", "Description": "Members can modify group policy for the domain", "Children": []}, {"Name": "Protected Users", "Type": "Group", "Description": "Members are provided additional protections against credential theft", "Children": []}, {"Name": "Read-only Domain Controllers", "Type": "Group", "Description": "RODCs in the domain", "Children": []}, {"Name": "Schema Admins", "Type": "Group", "Description": "Designated administrators of the schema", "Children": []}]}]};
const TMPL_TIERED = {"Name": "example.com", "Type": "Domain", "Description": "Tiered admin model", "Children": [{"Name": "Admin", "Type": "OU", "Description": "", "Children": [{"Name": "Tier 0", "Type": "OU", "Description": "", "Children": [{"Name": "T0 Groups", "Type": "OU", "Description": "", "Children": [{"Name": "T0 Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "T0 PAWs", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Servers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Service Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Users", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "Tier 1", "Type": "OU", "Description": "", "Children": [{"Name": "T1 Computers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T1 Groups", "Type": "OU", "Description": "", "Children": [{"Name": "T1 Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "T1 Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "T1 Servers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T1 Service Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "Users", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "Tier 2", "Type": "OU", "Description": "", "Children": [{"Name": "T2 Computers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Groups", "Type": "OU", "Description": "", "Children": [{"Name": "T2 Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "T2 Servers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Service Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Users", "Type": "OU", "Description": "", "Children": []}]}]}, {"Name": "Corporate", "Type": "OU", "Description": "", "Children": [{"Name": "Bind Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "Computers", "Type": "OU", "Description": "", "Children": []}, {"Name": "Distribution Lists", "Type": "OU", "Description": "", "Children": []}, {"Name": "Groups", "Type": "OU", "Description": "", "Children": [{"Name": "Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "Users", "Type": "OU", "Description": "", "Children": [{"Name": "Africa", "Type": "OU", "Description": "", "Children": []}, {"Name": "Asia", "Type": "OU", "Description": "", "Children": []}, {"Name": "EU", "Type": "OU", "Description": "", "Children": []}, {"Name": "US", "Type": "OU", "Description": "", "Children": []}]}]}, {"Name": "Domain Controllers", "Type": "OU", "Description": "", "Children": []}, {"Name": "Builtin", "Type": "Container", "Description": "Default container for built-in accounts and groups", "Children": []}, {"Name": "Computers", "Type": "Container", "Description": "Default container for machine accounts", "Children": []}, {"Name": "Domain Controllers", "Type": "OU", "Description": "Default OU for domain controller computer accounts", "Children": []}, {"Name": "ForeignSecurityPrincipals", "Type": "Container", "Description": "Security principals from external trusted domains", "Children": []}, {"Name": "Keys", "Type": "Container", "Description": "Default container for key credential objects", "Children": []}, {"Name": "Managed Service Accounts", "Type": "Container", "Description": "Default container for managed service accounts", "Children": []}, {"Name": "Users", "Type": "Container", "Description": "Default container for user and group objects", "Children": []}]};
const TMPL_TIERED_FULL = {"Name": "example.com", "Type": "Domain", "Description": "Tiered admin model with default objects", "Children": [{"Name": "Admin", "Type": "OU", "Description": "", "Children": [{"Name": "Tier 0", "Type": "OU", "Description": "", "Children": [{"Name": "T0 Groups", "Type": "OU", "Description": "", "Children": [{"Name": "T0 Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "T0 PAWs", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Servers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Service Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "T0 Users", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "Tier 1", "Type": "OU", "Description": "", "Children": [{"Name": "T1 Computers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T1 Groups", "Type": "OU", "Description": "", "Children": [{"Name": "T1 Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "T1 Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "T1 Servers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T1 Service Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "Users", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "Tier 2", "Type": "OU", "Description": "", "Children": [{"Name": "T2 Computers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Groups", "Type": "OU", "Description": "", "Children": [{"Name": "T2 Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "T2 Servers", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Service Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "T2 Users", "Type": "OU", "Description": "", "Children": []}]}]}, {"Name": "Corporate", "Type": "OU", "Description": "", "Children": [{"Name": "Bind Accounts", "Type": "OU", "Description": "", "Children": []}, {"Name": "Computers", "Type": "OU", "Description": "", "Children": []}, {"Name": "Distribution Lists", "Type": "OU", "Description": "", "Children": []}, {"Name": "Groups", "Type": "OU", "Description": "", "Children": [{"Name": "Resource Groups", "Type": "OU", "Description": "", "Children": []}, {"Name": "Role Groups", "Type": "OU", "Description": "", "Children": []}]}, {"Name": "Users", "Type": "OU", "Description": "", "Children": [{"Name": "Africa", "Type": "OU", "Description": "", "Children": []}, {"Name": "Asia", "Type": "OU", "Description": "", "Children": []}, {"Name": "EU", "Type": "OU", "Description": "", "Children": []}, {"Name": "US", "Type": "OU", "Description": "", "Children": []}]}]}, {"Name": "Domain Controllers", "Type": "OU", "Description": "", "Children": []}, {"Name": "Builtin", "Type": "Container", "Description": "Default container for built-in accounts and groups", "Children": [{"Name": "Administrators", "Type": "Group", "Description": "Members can fully administer the computer/domain", "Children": []}, {"Name": "Account Operators", "Type": "Group", "Description": "Members can administer domain user and group accounts", "Children": []}, {"Name": "Backup Operators", "Type": "Group", "Description": "Members can bypass file security to back up files", "Children": []}, {"Name": "Guests", "Type": "Group", "Description": "Users granted guest access to the computer/domain", "Children": []}, {"Name": "Network Configuration Operators", "Type": "Group", "Description": "Members can manage TCP/IP network configuration", "Children": []}, {"Name": "Print Operators", "Type": "Group", "Description": "Members can administer printers installed on domain controllers", "Children": []}, {"Name": "Remote Desktop Users", "Type": "Group", "Description": "Members are granted the right to log on remotely", "Children": []}, {"Name": "Server Operators", "Type": "Group", "Description": "Members can administer domain servers", "Children": []}, {"Name": "Users", "Type": "Group", "Description": "Prevents accidental or intentional system-wide changes", "Children": []}]}, {"Name": "Computers", "Type": "Container", "Description": "Default container for machine accounts", "Children": []}, {"Name": "Domain Controllers", "Type": "OU", "Description": "Default OU for domain controller computer accounts", "Children": []}, {"Name": "ForeignSecurityPrincipals", "Type": "Container", "Description": "Security principals from external trusted domains", "Children": []}, {"Name": "Keys", "Type": "Container", "Description": "Default container for key credential objects", "Children": []}, {"Name": "Managed Service Accounts", "Type": "Container", "Description": "Default container for managed service accounts", "Children": []}, {"Name": "Users", "Type": "Container", "Description": "Default container for user and group objects", "Children": [{"Name": "Administrator", "Type": "User", "Description": "Built-in account for administering the computer/domain", "Children": []}, {"Name": "Guest", "Type": "User", "Description": "Built-in account for guest access", "Children": []}, {"Name": "krbtgt", "Type": "User", "Description": "Key Distribution Center service account", "Children": []}, {"Name": "Cert Publishers", "Type": "Group", "Description": "Members can publish certificates to Active Directory", "Children": []}, {"Name": "Domain Admins", "Type": "Group", "Description": "Designated administrators of the domain", "Children": []}, {"Name": "Domain Computers", "Type": "Group", "Description": "All workstations and servers joined to the domain", "Children": []}, {"Name": "Domain Controllers", "Type": "Group", "Description": "All domain controllers in the domain", "Children": []}, {"Name": "Domain Guests", "Type": "Group", "Description": "All domain guests", "Children": []}, {"Name": "Domain Users", "Type": "Group", "Description": "All domain users", "Children": []}, {"Name": "Enterprise Admins", "Type": "Group", "Description": "Designated administrators of the enterprise", "Children": []}, {"Name": "Enterprise Read-only Domain Controllers", "Type": "Group", "Description": "RODCs in the enterprise", "Children": []}, {"Name": "Group Policy Creator Owners", "Type": "Group", "Description": "Members can modify group policy for the domain", "Children": []}, {"Name": "Protected Users", "Type": "Group", "Description": "Members are provided additional protections against credential theft", "Children": []}, {"Name": "Read-only Domain Controllers", "Type": "Group", "Description": "RODCs in the domain", "Children": []}, {"Name": "Schema Admins", "Type": "Group", "Description": "Designated administrators of the schema", "Children": []}]}]};
const TMPL_BUILTIN_ONLY = {"Name": "example.com", "Type": "Domain", "Description": "Default AD builtin structure", "Children": [{"Name": "Builtin", "Type": "Container", "Description": "Default container for built-in accounts and groups", "Children": [{"Name": "Administrators", "Type": "Group", "Description": "Members can fully administer the computer/domain", "Children": []}, {"Name": "Account Operators", "Type": "Group", "Description": "Members can administer domain user and group accounts", "Children": []}, {"Name": "Backup Operators", "Type": "Group", "Description": "Members can bypass file security to back up files", "Children": []}, {"Name": "Guests", "Type": "Group", "Description": "Users granted guest access to the computer/domain", "Children": []}, {"Name": "Network Configuration Operators", "Type": "Group", "Description": "Members can manage TCP/IP network configuration", "Children": []}, {"Name": "Print Operators", "Type": "Group", "Description": "Members can administer printers installed on domain controllers", "Children": []}, {"Name": "Remote Desktop Users", "Type": "Group", "Description": "Members are granted the right to log on remotely", "Children": []}, {"Name": "Server Operators", "Type": "Group", "Description": "Members can administer domain servers", "Children": []}, {"Name": "Users", "Type": "Group", "Description": "Prevents accidental or intentional system-wide changes", "Children": []}]}, {"Name": "Computers", "Type": "Container", "Description": "Default container for machine accounts", "Children": []}, {"Name": "Domain Controllers", "Type": "OU", "Description": "Default OU for domain controller computer accounts", "Children": []}, {"Name": "ForeignSecurityPrincipals", "Type": "Container", "Description": "Security principals from external trusted domains", "Children": []}, {"Name": "Keys", "Type": "Container", "Description": "Default container for key credential objects", "Children": []}, {"Name": "Managed Service Accounts", "Type": "Container", "Description": "Default container for managed service accounts", "Children": []}, {"Name": "Users", "Type": "Container", "Description": "Default container for user and group objects", "Children": [{"Name": "Administrator", "Type": "User", "Description": "Built-in account for administering the computer/domain", "Children": []}, {"Name": "Guest", "Type": "User", "Description": "Built-in account for guest access", "Children": []}, {"Name": "krbtgt", "Type": "User", "Description": "Key Distribution Center service account", "Children": []}, {"Name": "Cert Publishers", "Type": "Group", "Description": "Members can publish certificates to Active Directory", "Children": []}, {"Name": "Domain Admins", "Type": "Group", "Description": "Designated administrators of the domain", "Children": []}, {"Name": "Domain Computers", "Type": "Group", "Description": "All workstations and servers joined to the domain", "Children": []}, {"Name": "Domain Controllers", "Type": "Group", "Description": "All domain controllers in the domain", "Children": []}, {"Name": "Domain Guests", "Type": "Group", "Description": "All domain guests", "Children": []}, {"Name": "Domain Users", "Type": "Group", "Description": "All domain users", "Children": []}, {"Name": "Enterprise Admins", "Type": "Group", "Description": "Designated administrators of the enterprise", "Children": []}, {"Name": "Enterprise Read-only Domain Controllers", "Type": "Group", "Description": "RODCs in the enterprise", "Children": []}, {"Name": "Group Policy Creator Owners", "Type": "Group", "Description": "Members can modify group policy for the domain", "Children": []}, {"Name": "Protected Users", "Type": "Group", "Description": "Members are provided additional protections against credential theft", "Children": []}, {"Name": "Read-only Domain Controllers", "Type": "Group", "Description": "RODCs in the domain", "Children": []}, {"Name": "Schema Admins", "Type": "Group", "Description": "Designated administrators of the schema", "Children": []}]}]};
const TMPL_BLANK = {"Name": "example.com", "Type": "Domain", "Description": "", "Children": [{"Name": "Domain Controllers", "Type": "OU", "Description": "", "Children": []}]};

/* ─── Utilities ──────────────────────────────────────────────────────────── */
function gid() { return 'n' + (idSeq++); }
function fromJSON(o) {
  const n = { id: gid(), name: o.Name || 'Unnamed', type: o.Type || 'OU', description: o.Description || '', children: [] };
  if (!isLeaf(n.type)) n.children = (o.Children || []).map(fromJSON);
  return n;
}
function toJSON(n) {
  return { Name: n.name, Type: n.type, Description: n.description, Children: n.children.map(toJSON) };
}
function find(id, n) {
  if (!n) return null;
  if (n.id === id) return n;
  for (const c of n.children) { const f = find(id, c); if (f) return f; }
  return null;
}
function findParent(id, n, par) {
  if (n.id === id) return par;
  for (const c of n.children) { const f = findParent(id, c, n); if (f) return f; }
  return null;
}
function countByType(n, counts) {
  counts = counts || {};
  if (n.type !== 'Domain') counts[n.type] = (counts[n.type] || 0) + 1;
  for (const c of n.children) countByType(c, counts);
  return counts;
}
function treeDepth(n, d) {
  d = d || 0; let m = d;
  for (const c of n.children) m = Math.max(m, treeDepth(c, d + 1));
  return m;
}
function initPSt(n) { pSt[n.id] = true; for (const c of n.children) initPSt(c); }

/* ─── Hide Builtins ──────────────────────────────────────────────────────── */
function toggleHideBuiltins() {
  _hideBuiltins = !_hideBuiltins;
  const btn = document.getElementById('btn-hide-builtins');
  btn.classList.toggle('active', _hideBuiltins);
  renderPreview();
}

/* ─── Preview tree ───────────────────────────────────────────────────────── */
function renderPreview() {
  const ul = document.getElementById('preview-tree');
  ul.innerHTML = '';
  if (ROOT) buildPNode(ROOT, ul, false, null);
}
function buildPNode(n, ul, isBranch, parentNode) {
  if (_hideBuiltins && isBranch && isBuiltinNode(n, parentNode)) return;
  const visibleKids = n.children.filter(c => !_hideBuiltins || !isBuiltinNode(c, n));
  const hasKids = visibleKids.length > 0;
  const exp = pSt[n.id] !== false;
  const li = document.createElement('li');
  if (isBranch) li.className = 'tn';
  const row = document.createElement('div');
  row.className = 'prow' + (n.id === selId ? ' sel' : '');
  row.style.cursor = 'pointer';
  row.addEventListener('click', () => selectNode(n.id, 'preview'));
  if (hasKids) {
    const xb = document.createElement('button');
    xb.className = 'xbtn'; xb.textContent = exp ? '\u2212' : '+';
    xb.addEventListener('click', e => { e.stopPropagation(); toggleP(n, xb, kul, visibleKids); });
    row.appendChild(xb);
  } else {
    const g = document.createElement('div'); g.className = 'xgap'; row.appendChild(g);
  }
  const ic = document.createElement('span');
  ic.className = 'nd-icon'; ic.textContent = getIcon(n.type, hasKids && exp);
  applyIconStyle(ic, n.type);
  row.appendChild(ic);
  const lb = document.createElement('span');
  lb.style.cssText = 'font-size:13px' + (n.type === 'Domain' ? ';font-weight:600' : '');
  lb.textContent = n.name; row.appendChild(lb);
  li.appendChild(row);
  const kul = document.createElement('ul');
  kul.className = 'tree tkids'; kul.style.display = exp ? '' : 'none';
  for (const c of visibleKids) buildPNode(c, kul, true, n);
  li.appendChild(kul); ul.appendChild(li);
}
function toggleP(n, xb, kul) {
  const nv = !(pSt[n.id] !== false); pSt[n.id] = nv;
  xb.textContent = nv ? '\u2212' : '+'; kul.style.display = nv ? '' : 'none';
}
function previewSetAll(v) {
  function walk(n) {
    pSt[n.id] = v;
    for (const c of n.children) walk(c);
  }
  if (ROOT) walk(ROOT);
  renderPreview();
}

/* ─── Builder tree ───────────────────────────────────────────────────────── */
function renderBuilder() {
  const ul = document.getElementById('builder-tree');
  ul.innerHTML = '';
  if (ROOT) buildBNode(ROOT, ul, false);
}
function buildBNode(n, ul, isBranch) {
  const hasKids = n.children.length > 0;
  const isRoot = n.type === 'Domain';
  const leaf = isLeaf(n.type);
  const li = document.createElement('li');
  if (isBranch) li.className = 'tn';
  const row = document.createElement('div');
  row.className = 'brow' + (n.id === selId ? ' sel' : '');
  row.dataset.id = n.id;
  if (hasKids) {
    const xb = document.createElement('button');
    xb.className = 'xbtn'; xb.textContent = '\u2212';
    xb.addEventListener('click', e => {
      e.stopPropagation();
      const closed = kul.style.display === 'none';
      kul.style.display = closed ? '' : 'none';
      xb.textContent = closed ? '\u2212' : '+';
    });
    row.appendChild(xb);
  } else {
    const g = document.createElement('div'); g.className = 'xgap'; row.appendChild(g);
  }
  const ic = document.createElement('span');
  ic.className = 'nd-icon'; ic.textContent = getIcon(n.type, hasKids);
  applyIconStyle(ic, n.type);
  row.appendChild(ic);
  const nm = document.createElement('span');
  nm.className = 'bname' + (isRoot ? ' root' : ''); nm.textContent = n.name;
  row.appendChild(nm);
  const acts = document.createElement('div'); acts.className = 'bacts';
  if (!leaf) {
    const ba = document.createElement('button');
    ba.className = 'abtn'; ba.title = 'Add child'; ba.textContent = '+';
    ba.addEventListener('click', e => { e.stopPropagation(); showPicker(n.id, ba); });
    acts.appendChild(ba);
  }
  const br = document.createElement('button');
  br.className = 'abtn'; br.title = 'Rename'; br.textContent = '\u270F\uFE0F';
  br.addEventListener('click', e => { e.stopPropagation(); startRename(n.id, nm); });
  acts.appendChild(br);
  if (!isRoot) {
    const bd = document.createElement('button');
    bd.className = 'abtn del'; bd.title = 'Delete'; bd.textContent = '\u2715';
    bd.addEventListener('click', e => { e.stopPropagation(); deleteNode(n.id); });
    acts.appendChild(bd);
  }
  row.appendChild(acts);
  row.addEventListener('click', () => selectNode(n.id, 'builder'));
  row.addEventListener('contextmenu', e => showCtxMenu(e, n.id));
  li.appendChild(row);
  const kul = document.createElement('ul');
  kul.className = 'tree tkids';
  for (const c of n.children) buildBNode(c, kul, true);
  li.appendChild(kul); ul.appendChild(li);
}

/* ─── Builder actions ────────────────────────────────────────────────────── */
function selectNode(id, source) {
  selId = id;
  const n = find(id, ROOT), isRoot = ROOT && id === ROOT.id, leaf = n && isLeaf(n.type);
  document.getElementById('btn-add').disabled = !n || leaf;
  document.getElementById('btn-del').disabled = !n || isRoot;
  document.querySelectorAll('.brow').forEach(r => r.classList.toggle('sel', r.dataset.id === id));
  document.querySelectorAll('.prow').forEach(r => {
    /* prow doesn't have dataset.id, skip */
  });
  updateNotes(id, source);
}
function addChildTo(parentId, type) {
  const parent = find(parentId, ROOT);
  if (!parent) return;
  const node = { id: gid(), name: 'New ' + (TYPE_LABELS[type] || type), type, description: '', children: [] };
  pSt[node.id] = true; parent.children.push(node); pSt[parentId] = true; selId = node.id;
  rerender();
  const rows = document.querySelectorAll('.brow');
  for (const r of rows) {
    if (r.dataset.id === node.id) { startRename(node.id, r.querySelector('.bname')); r.scrollIntoView({ block: 'nearest' }); break; }
  }
}
function deleteNode(id) {
  const n = find(id, ROOT);
  if (!n) return;
  if (n.children.length > 0 && !confirm('Delete "' + n.name + '" and everything inside it?')) return;
  const parent = findParent(id, ROOT, null);
  if (!parent) return;
  parent.children = parent.children.filter(c => c.id !== id);
  if (selId === id) { selId = null; updateNotes(null); }
  rerender();
}
function deleteSelected() { if (!selId || selId === ROOT.id) return; deleteNode(selId); }
function startRename(id, nmEl) {
  const n = find(id, ROOT);
  if (!n || !nmEl) return;
  const inp = document.createElement('input');
  inp.className = 'rinput'; inp.value = n.name;
  nmEl.replaceWith(inp); inp.focus(); inp.select();
  let done = false;
  function commit() { if (done) return; done = true; n.name = inp.value.trim() || n.name; rerender(); }
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    if (e.key === 'Escape' && !done) { done = true; rerender(); }
  });
}

/* ─── Type picker ────────────────────────────────────────────────────────── */
function showPicker(parentId, anchorEl) {
  _pickerParent = parentId;
  const picker = document.getElementById('type-picker');
  const rect = anchorEl.getBoundingClientRect();
  let top = rect.bottom + 4, left = rect.left;
  if (top + 280 > window.innerHeight) top = rect.top - 284;
  if (left + 234 > window.innerWidth) left = window.innerWidth - 238;
  picker.style.top = top + 'px'; picker.style.left = left + 'px'; picker.style.display = 'block';
}
function hidePicker() { document.getElementById('type-picker').style.display = 'none'; _pickerParent = null; }
document.getElementById('type-picker').querySelectorAll('.tp-item').forEach(item => {
  item.addEventListener('click', e => { e.stopPropagation(); const t = item.dataset.type; const pid = _pickerParent; hidePicker(); if (pid) addChildTo(pid, t); });
});
document.getElementById('btn-add').addEventListener('click', e => { e.stopPropagation(); if (selId) showPicker(selId, e.currentTarget); });
document.getElementById('btn-del').addEventListener('click', () => deleteSelected());

/* ─── JSON tab ───────────────────────────────────────────────────────────── */
function loadFromJSON() {
  const raw = document.getElementById('json-ta').value.trim();
  if (!raw) { toast('Paste JSON first'); return; }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch(e) { toast('JSON parse error: ' + e.message.split('\n')[0]); return; }
  const errs = validateADJSON(parsed, 'root');
  if (errs.critical.length) { showValidationErrors(errs); return; }
  if (errs.warnings.length) showValidationErrors(errs);
  loadData(parsed);
  if (!errs.warnings.length) toast('Loaded');
}
function syncJSON() { if (ROOT) document.getElementById('json-ta').value = JSON.stringify(toJSON(ROOT), null, 2); }
function loadData(parsed) {
  ROOT = fromJSON(parsed); selId = null; initPSt(ROOT); rerender();
  document.getElementById('json-ta').value = JSON.stringify(toJSON(ROOT), null, 2);
}
function switchTab(t) {
  ['builder','json'].forEach(id => {
    document.getElementById('tab-' + id).classList.toggle('active', id === t);
    document.getElementById('pane-' + id).style.display = (id === t) ? 'flex' : 'none';
  });
  if (t === 'json') syncJSON();
}

/* ─── Export ─────────────────────────────────────────────────────────────── */
function copyJSON() {
  if (!ROOT) { toast('Nothing to copy'); return; }
  navigator.clipboard.writeText(JSON.stringify(toJSON(ROOT), null, 2))
    .then(() => toast('JSON copied to clipboard'))
    .catch(() => toast('Copy failed'));
}
function downloadJSON() {
  if (!ROOT) return;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([JSON.stringify(toJSON(ROOT), null, 2)], { type: 'application/json' })),
    download: (ROOT.name || 'tree') + '.json'
  });
  a.click(); URL.revokeObjectURL(a.href);
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ─── Themes ─────────────────────────────────────────────────────────────── */
function setTheme(name) {
  document.body.className = name;
  try { localStorage.setItem('omadwv-theme', name); } catch(e) {}
  document.getElementById('theme-menu').style.display = 'none';
}
function toggleThemeMenu(e) {
  e.stopPropagation();
  const el = document.getElementById('theme-menu');
  if (el.style.display === 'block') { el.style.display = 'none'; return; }
  const rect = document.getElementById('theme-btn').getBoundingClientRect();
  el.style.top = (rect.bottom + 6) + 'px'; el.style.left = rect.left + 'px'; el.style.display = 'block';
}

/* ─── Templates ──────────────────────────────────────────────────────────── */
function toggleTmplMenu(e) {
  e.stopPropagation();
  const el = document.getElementById('tmpl-menu');
  if (el.style.display === 'block') { el.style.display = 'none'; return; }
  const rect = document.getElementById('tmpl-btn').getBoundingClientRect();
  el.style.top = (rect.bottom + 6) + 'px'; el.style.left = rect.left + 'px'; el.style.display = 'block';
}
function loadTemplate(name) {
  document.getElementById('tmpl-menu').style.display = 'none';
  const templates = { windefault: TMPL_WINDEFAULT, tiered: TMPL_TIERED, tieredFull: TMPL_TIERED_FULL, builtinOnly: TMPL_BUILTIN_ONLY, blank: TMPL_BLANK };
  const t = templates[name];
  if (!t) return;
  if (!confirm('Load template? This will replace your current structure.')) return;
  loadData(JSON.parse(JSON.stringify(t)));
  toast('Template loaded: ' + t.Name);
}

/* ─── Context Menu ───────────────────────────────────────────────────────── */
function deepCopy(n) {
  return { id: gid(), name: n.name, type: n.type, description: n.description || '', children: (n.children || []).map(deepCopy) };
}
function showCtxMenu(e, nodeId) {
  e.preventDefault(); e.stopPropagation();
  _ctxId = nodeId; selectNode(nodeId, 'builder');
  const n = find(nodeId, ROOT);
  const isRoot = n && n.id === ROOT.id;
  const leaf = n && isLeaf(n.type);
  const hasCb = !!_clip;
  document.getElementById('ctx-paste-child').className = 'ctx-item' + (!hasCb || leaf ? ' disabled' : '');
  document.getElementById('ctx-paste-sibling').className = 'ctx-item' + (!hasCb || isRoot ? ' disabled' : '');
  document.getElementById('ctx-delete').className = 'ctx-item' + (isRoot ? ' disabled' : ' danger');
  document.querySelectorAll('.ctx-add').forEach(function(el) { el.className = 'ctx-item ctx-add' + (leaf ? ' disabled' : ''); });
  document.getElementById('ctx-add-section').style.display = leaf ? 'none' : '';
  const menu = document.getElementById('ctx-menu');
  let left = e.clientX, top = e.clientY;
  if (left + 200 > window.innerWidth) left = window.innerWidth - 204;
  if (top + 400 > window.innerHeight) top = window.innerHeight - 404;
  menu.style.left = left + 'px'; menu.style.top = top + 'px'; menu.style.display = 'block';
}
function hideCtxMenu() { document.getElementById('ctx-menu').style.display = 'none'; }
document.getElementById('ctx-copy').addEventListener('click', function() {
  if (!_ctxId) return;
  _clip = deepCopy(find(_ctxId, ROOT));
  toast('Copied: ' + _clip.name); hideCtxMenu();
});
document.getElementById('ctx-paste-child').addEventListener('click', function() {
  if (!_clip || !_ctxId) return;
  const parent = find(_ctxId, ROOT); if (!parent || isLeaf(parent.type)) return;
  const node = deepCopy(_clip); initPSt(node);
  parent.children.push(node); pSt[_ctxId] = true; selId = node.id;
  rerender(); hideCtxMenu(); toast('Pasted into ' + parent.name);
});
document.getElementById('ctx-paste-sibling').addEventListener('click', function() {
  if (!_clip || !_ctxId) return;
  const par = findParent(_ctxId, ROOT, null); if (!par) return;
  const idx = par.children.findIndex(c => c.id === _ctxId);
  const node = deepCopy(_clip); initPSt(node);
  par.children.splice(idx + 1, 0, node);
  selId = node.id; rerender(); hideCtxMenu(); toast('Pasted as sibling');
});
document.getElementById('ctx-rename').addEventListener('click', function() {
  hideCtxMenu();
  if (!_ctxId) return;
  const r = document.querySelector('.brow[data-id="' + _ctxId + '"]');
  if (r) startRename(_ctxId, r.querySelector('.bname'));
});
document.getElementById('ctx-delete').addEventListener('click', function() {
  hideCtxMenu();
  if (!_ctxId || _ctxId === ROOT.id) return;
  deleteNode(_ctxId);
});
document.querySelectorAll('.ctx-add').forEach(function(el) {
  el.addEventListener('click', function() {
    if (!_ctxId) return;
    var parent = find(_ctxId, ROOT);
    if (!parent || isLeaf(parent.type)) return;
    var type = el.dataset.type;
    hideCtxMenu();
    addChildTo(_ctxId, type);
  });
});

/* ─── PNG Export ──────────────────────────────────────────────────────────── */
function exportPNG() {
  if (!ROOT) return;
  const PAD = 14, INDENT = 20, ICON_W = 22, LINE_H = 24, TITLE_H = 32, PAD_Y = 10;
  const FONT = '13px "Segoe UI",system-ui,sans-serif';
  const BOLD_FONT = 'bold 13px "Segoe UI",system-ui,sans-serif';
  const rows = [];
  function collect(node, depth, parentChildren, idx) {
    const ch = node.children || [];
    const isLast = parentChildren ? (idx === parentChildren.length - 1) : true;
    rows.push({ node, depth, isLast });
    if (ch.length > 0 && pSt[node.id] !== false) {
      for (let i = 0; i < ch.length; i++) collect(ch[i], depth + 1, ch, i);
    }
  }
  collect(ROOT, 0, null, 0);
  const mc = document.createElement('canvas').getContext('2d');
  mc.font = FONT; let maxW = 300;
  for (const r of rows) {
    const w = PAD + r.depth * INDENT + ICON_W + mc.measureText(r.node.name).width + PAD + 10;
    if (w > maxW) maxW = w;
  }
  const W = Math.ceil(maxW), H = TITLE_H + PAD_Y * 2 + rows.length * LINE_H;
  const dpr = Math.max(window.devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas');
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0,0,W,0);
  grad.addColorStop(0,'#0e2a52'); grad.addColorStop(1,'#1a3f7a');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,TITLE_H);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Segoe UI",system-ui,sans-serif';
  ctx.fillText(ROOT.name + ' \u2014 AD OU Structure', PAD, TITLE_H/2+4);
  const pipes = new Array(100).fill(false);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], d = r.depth;
    const y = TITLE_H + PAD_Y + i * LINE_H, midY = y + LINE_H / 2;
    const iconX = PAD + d * INDENT;
    ctx.strokeStyle = '#b0bdd0'; ctx.lineWidth = 1;
    for (let dd = 1; dd <= d; dd++) {
      if (pipes[dd]) {
        const cx = PAD + (dd-1)*INDENT + INDENT/2;
        ctx.beginPath(); ctx.moveTo(cx+.5, y); ctx.lineTo(cx+.5, dd===d ? midY : y+LINE_H); ctx.stroke();
      }
    }
    if (d > 0) {
      const cx = PAD + (d-1)*INDENT + INDENT/2;
      ctx.beginPath(); ctx.moveTo(cx+.5, midY+.5); ctx.lineTo(iconX-2, midY+.5); ctx.stroke();
    }
    if (d > 0) pipes[d] = !r.isLast;
    ctx.font = '14px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    ctx.save();
    const _pf = getIconFilter(r.node.type);
    if (_pf) ctx.filter = _pf;
    ctx.fillStyle = '#333';
    ctx.fillText(getIcon(r.node.type, pSt[r.node.id]!==false && (r.node.children||[]).length>0), iconX, midY+5);
    ctx.restore();
    ctx.font = r.node.type === 'Domain' ? BOLD_FONT : FONT;
    ctx.fillStyle = '#1a1e2e';
    ctx.fillText(r.node.name, iconX + ICON_W, midY + 4);
  }
  cv.toBlob(function(blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = (ROOT.name||'ad-tree') + '.png';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}

/* ─── Load JSON File ─────────────────────────────────────────────────────── */
function loadStructureFile(event) {
  const file = event.target.files[0]; if (!file) return;
  const isMarkdown = /\.md$/i.test(file.name);
  const reader = new FileReader();
  reader.onload = function(e) {
    if (isMarkdown) {
      try {
        const parsed = parseMd2ADUC(e.target.result);
        if (!parsed) { toast('No AD structure found in: ' + file.name); return; }
        const errs = validateADJSON(parsed, 'root');
        if (errs.warnings.length) showValidationErrors(errs);
        loadData(parsed);
        toast('Loaded: ' + file.name);
      } catch(err) { toast('Markdown parse error: ' + err.message.split('\n')[0]); }
    } else {
      let parsed;
      try { parsed = JSON.parse(e.target.result); }
      catch(err) { toast('JSON parse error in ' + file.name + ': ' + err.message.split('\n')[0]); event.target.value=''; return; }
      const errs = validateADJSON(parsed, 'root');
      if (errs.critical.length) { showValidationErrors(errs); event.target.value=''; return; }
      if (errs.warnings.length) showValidationErrors(errs);
      loadData(parsed);
      toast('Loaded: ' + file.name + (errs.warnings.length ? ' (with warnings)' : ''));
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
// Legacy alias kept in case anything references the old name
function loadJSONFile(event) { loadStructureFile(event); }

/* ─── Notes + Markdown ───────────────────────────────────────────────────── */
function getPath(id) {
  function walk(n, t, p) {
    if (n.id === t) return p;
    for (const c of n.children) { const r = walk(c, t, [...p, n.name]); if (r) return r; }
    return null;
  }
  return (walk(ROOT, id, []) || []).join(' \u203A ');
}

function updateNotes(id, source) {
  const n = id ? find(id, ROOT) : null;
  const emptyEl = document.getElementById('notes-empty');
  const contentEl = document.getElementById('notes-content');
  const modeBtn = document.getElementById('notes-mode-btn');

  if (!n) {
    emptyEl.style.display = 'flex';
    contentEl.style.display = 'none';
    modeBtn.style.display = 'none';
    return;
  }

  // Show content, hide empty
  emptyEl.style.display = 'none';
  contentEl.style.display = 'flex';
  modeBtn.style.display = '';

  // Set mode based on source
  if (source === 'preview') {
    _notesEdit = false;  // Formatted mode
  } else if (source === 'builder') {
    _notesEdit = true;   // Markdown/edit mode
  }

  // Populate fields
  const _ni = document.getElementById('notes-icon');
  _ni.textContent = getIcon(n.type, false);
  const _nif = getIconFilter(n.type);
  _ni.style.filter = _nif || ''; _ni.style.color = '';
  document.getElementById('notes-name').textContent = n.name;
  document.getElementById('notes-path').textContent = getPath(id);
  document.getElementById('notes-ta').value = n.description || '';

  // Apply the current mode
  applyNotesMode();
}

function applyNotesMode() {
  const btn = document.getElementById('notes-mode-btn');
  const ta = document.getElementById('notes-ta');
  const pre = document.getElementById('notes-preview');

  if (_notesEdit) {
    // Markdown edit mode: show textarea, hide preview
    ta.style.display = '';
    pre.style.display = 'none';
    btn.textContent = 'Formatted';
  } else {
    // Formatted mode: hide textarea, show rendered preview
    ta.style.display = 'none';
    pre.style.display = '';
    pre.innerHTML = renderMarkdown(ta.value);
    btn.textContent = 'Markdown';
  }
}

function toggleNotesMode() {
  _notesEdit = !_notesEdit;
  applyNotesMode();
}

document.getElementById('notes-ta').addEventListener('input', function() {
  if (selId) {
    const n = find(selId, ROOT);
    if (n) n.description = this.value;
  }
  // Live-update preview if in formatted mode
  if (!_notesEdit) {
    document.getElementById('notes-preview').innerHTML = renderMarkdown(this.value);
  }
});

function renderMarkdown(raw) {
  if (!raw || !raw.trim()) return '<span style="color:var(--muted);font-size:12px">No notes yet</span>';
  const lines = raw.split('\n');
  const out = []; let inUl = false, inOl = false;
  function closeLists() {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  }
  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmt(s) {
    s = esc(s);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/__(.+?)__/g, '<u>$1</u>');
    s = s.replace(/`(.+?)`/g, '<code>$1</code>');
    return s;
  }
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('### ')) { closeLists(); out.push('<h3>' + fmt(trimmed.slice(4)) + '</h3>'); continue; }
    if (trimmed.startsWith('## ')) { closeLists(); out.push('<h2>' + fmt(trimmed.slice(3)) + '</h2>'); continue; }
    if (trimmed.startsWith('# ')) { closeLists(); out.push('<h1>' + fmt(trimmed.slice(2)) + '</h1>'); continue; }
    if (/^-{3,}$/.test(trimmed)) { closeLists(); out.push('<hr>'); continue; }
    if (/^> /.test(trimmed)) { closeLists(); out.push('<blockquote>' + fmt(trimmed.slice(2)) + '</blockquote>'); continue; }
    if (/^[-*] /.test(trimmed)) {
      if (!inUl) { closeLists(); out.push('<ul>'); inUl = true; }
      out.push('<li>' + fmt(trimmed.replace(/^[-*] /, '')) + '</li>'); continue;
    }
    if (/^\d+\. /.test(trimmed)) {
      if (!inOl) { closeLists(); out.push('<ol>'); inOl = true; }
      out.push('<li>' + fmt(trimmed.replace(/^\d+\. /, '')) + '</li>'); continue;
    }
    closeLists();
    if (trimmed === '') { out.push('<br>'); continue; }
    out.push('<p>' + fmt(trimmed) + '</p>');
  }
  closeLists();
  return out.join('\n');
}

/* ─── Legend (Help) ──────────────────────────────────────────────────────── */
function toggleLegend(e) {
  e.stopPropagation();
  const el = document.getElementById('legend');
  if (el.style.display === 'block') { el.style.display = 'none'; return; }
  const rect = document.getElementById('legend-btn').getBoundingClientRect();
  el.style.top = (rect.bottom + 6) + 'px';
  el.style.right = (window.innerWidth - rect.right) + 'px';
  el.style.left = 'auto'; el.style.display = 'block';
}

/* ─── Click-outside handlers ─────────────────────────────────────────────── */
document.addEventListener('click', function(ev) {
  if (!ev.target.closest('#legend') && !ev.target.closest('#legend-btn'))
    document.getElementById('legend').style.display = 'none';
  if (!ev.target.closest('#theme-menu') && !ev.target.closest('#theme-btn'))
    document.getElementById('theme-menu').style.display = 'none';
  if (!ev.target.closest('#tmpl-menu') && !ev.target.closest('#tmpl-btn'))
    document.getElementById('tmpl-menu').style.display = 'none';
  if (!ev.target.closest('#type-picker')) hidePicker();
  if (!ev.target.closest('#ctx-menu')) hideCtxMenu();
});

/* ─── UI helpers ─────────────────────────────────────────────────────────── */
function updateStatus() {
  if (!ROOT) return;
  const counts = countByType(ROOT, {});
  document.getElementById('st-domain').textContent = ROOT.name;
  document.getElementById('st-ous').textContent = (counts.OU || 0) + (counts.Container || 0);
  const objs = Object.entries(counts).filter(([k]) => isLeaf(k)).reduce((s, [, v]) => s + v, 0);
  document.getElementById('st-objs').textContent = objs;
  document.getElementById('st-depth').textContent = treeDepth(ROOT, 0);
}
function rerender() {
  renderPreview(); renderBuilder(); updateStatus();
  const n = selId && find(selId, ROOT);
  document.getElementById('btn-add').disabled = !n || isLeaf(n.type);
  document.getElementById('btn-del').disabled = !n || n.id === ROOT.id;
  if (selId) {
    const r = document.querySelector('.brow[data-id="' + selId + '"]');
    if (r) r.classList.add('sel');
  }
}

/* ─── Resizer ────────────────────────────────────────────────────────────── */
(function () {
  const resizer = document.getElementById('resizer');
  const overlay = document.getElementById('drag-overlay');
  const panelL = document.getElementById('panel-left');
  let dragging = false;
  resizer.addEventListener('mousedown', e => { dragging = true; e.preventDefault(); resizer.classList.add('on'); overlay.classList.add('on'); });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const ws = document.querySelector('.workspace');
    const pct = (e.clientX - ws.getBoundingClientRect().left) / ws.offsetWidth * 100;
    panelL.style.width = Math.min(75, Math.max(15, pct)) + '%';
  });
  document.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; resizer.classList.remove('on'); overlay.classList.remove('on'); });
})();



/* ─── Export Static Viewer ───────────────────────────────────────────────── */
// Generates a self-contained, offline-capable read-only HTML file.
// No builder, no editing — just the tree + notes panel with full markdown support.
function exportStaticViewer() {
  if (!ROOT) { toast('No data to export'); return; }
  // treeJSON is embedded inside a <script> block in the exported HTML.
  // JSON.stringify does not escape </script>, which would break out of the script tag.
  // Replace with the escaped form which JS will interpret identically.
  const treeJSON = JSON.stringify(toJSON(ROOT), null, 2)
    .replace(/<\/script>/gi, '<\\/script>');

  // domainName is embedded into HTML attributes and text — HTML-escape it.
  const _rawName   = ROOT.name || 'AD Structure';
  const domainName = _rawName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Embed only the current expand state so the viewer opens in the same state
  const pStExport = JSON.stringify(pSt);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${domainName} — AD Structure Viewer</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--primary:#1a56a5;--plt:#e8f0fb;--text:#1a1e2e;--muted:#5a6890;--border:#d0d6e4;--bg:#eef1f7;--surface:#ffffff;--sel:#c6deff;}
html,body{height:100%;font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;color:var(--text);background:var(--bg);overflow:hidden;}
header{height:48px;background:linear-gradient(90deg,#0e2a52,#1a3f7a);color:#fff;display:flex;align-items:center;padding:0 16px;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,.3);flex-shrink:0;}
header h1{font-size:14px;font-weight:600;letter-spacing:.02em;}
.hsp{flex:1;}
.hbtn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border:1px solid rgba(255,255,255,.28);border-radius:5px;background:rgba(255,255,255,.1);color:#fff;font-size:12px;cursor:pointer;font-family:inherit;}
.hbtn:hover{background:rgba(255,255,255,.22);}
.badge{font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(255,255,255,.15);color:rgba(255,255,255,.8);}
.workspace{display:flex;height:calc(100vh - 48px - 22px);}
.panel{display:flex;flex-direction:column;overflow:hidden;background:var(--surface);min-width:0;}
#panel-tree{flex:1;border-right:1px solid var(--border);}
#panel-notes{width:300px;flex-shrink:0;}
.pnl-hdr{height:38px;padding:0 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);background:#f7f8fc;flex-shrink:0;}
.pnl-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);}
.sp{flex:1;}
.pnl-body{flex:1;overflow:auto;padding:8px 10px;}
.btn{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text);font-size:11px;cursor:pointer;font-family:inherit;}
.btn:hover{background:var(--plt);}
ul.tree{list-style:none;padding:0;margin:0;}
ul.tkids{list-style:none;padding-left:20px;margin:0;position:relative;border-left:1px solid #c0cce0;margin-left:7px;}
li.tn{position:relative;}
li.tn::before{content:'';position:absolute;left:-20px;top:11px;width:20px;height:1px;background:#c0cce0;}
.xbtn{width:14px;height:14px;border:1px solid #a8b8cc;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;border-radius:2px;font-size:9px;padding:0;color:#445;font-family:monospace;font-weight:700;line-height:1;}
.xgap{width:14px;flex-shrink:0;}
.nd-icon{font-size:14px;flex-shrink:0;line-height:1;user-select:none;}
.prow{display:flex;align-items:center;gap:4px;padding:2px 6px 2px 2px;border-radius:4px;white-space:nowrap;cursor:pointer;}
.prow:hover{background:var(--plt);}
.prow.sel{background:var(--sel);outline:1px solid #88b0e0;}
.notes-hdr{height:38px;padding:0 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);background:#f7f8fc;flex-shrink:0;}
.notes-icon{font-size:15px;}
.notes-name{font-size:13px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.notes-path{font-size:10px;color:var(--muted);padding:5px 12px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.notes-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px;text-align:center;padding:20px;line-height:1.8;}
#notes-preview{flex:1;overflow:auto;padding:10px 14px;font-size:13px;line-height:1.7;color:var(--text);}
#notes-preview h1{font-size:18px;font-weight:700;margin:0 0 8px;border-bottom:1px solid var(--border);padding-bottom:4px;}
#notes-preview h2{font-size:15px;font-weight:600;margin:12px 0 6px;}
#notes-preview h3{font-size:13px;font-weight:600;margin:8px 0 4px;}
#notes-preview ul,#notes-preview ol{padding-left:20px;margin:4px 0;}
#notes-preview li{margin:2px 0;}
#notes-preview p{margin:4px 0;}
#notes-preview hr{border:0;border-top:1px solid var(--border);margin:10px 0;}
#notes-preview strong{font-weight:700;}
#notes-preview em{font-style:italic;}
#notes-preview u{text-decoration:underline;}
#notes-preview code{background:#f0f2f5;padding:1px 5px;border-radius:3px;font-family:Consolas,'Courier New',monospace;font-size:12px;}
#notes-preview blockquote{border-left:3px solid var(--primary);padding:4px 12px;margin:6px 0;color:var(--muted);background:#f8f9fc;border-radius:0 4px 4px 0;}
.statusbar{height:22px;background:#e4e8f2;border-top:1px solid var(--border);display:flex;align-items:center;padding:0 14px;gap:24px;}
.sitem{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px;}
body.dark{--primary:#5a9de8;--plt:#111e30;--text:#c0cee8;--muted:#607090;--border:#1c2d44;--bg:#080e18;--surface:#0c1520;--sel:#10264a;}
body.dark .pnl-hdr,body.dark .notes-hdr{background:#0e1828;}
body.dark .xbtn{background:#0c1520;border-color:#1c2d44;color:#708090;}
body.dark ul.tkids{border-left-color:#1c2d44;}
body.dark li.tn::before{background:#1c2d44;}
body.dark .statusbar{background:#0a1018;border-color:#1c2d44;}
body.dark #notes-preview code{background:#182838;}
body.dark #notes-preview blockquote{background:#0e1828;border-color:#5a9de8;}
</style>
</head>
<body>
<header>
  <span style="font-size:18px">&#x1F5C2;</span>
  <h1>${domainName}</h1>
  <span class="badge">Read-only Viewer</span>
  <div class="hsp"></div>
  <button class="hbtn" onclick="setAll(true)">Expand all</button>
  <button class="hbtn" onclick="setAll(false)" style="margin-left:4px">Collapse all</button>
  <button class="hbtn" id="theme-btn" onclick="toggleTheme()" style="margin-left:8px">&#x1F313; Dark</button>
</header>
<div class="workspace">
  <div class="panel" id="panel-tree">
    <div class="pnl-hdr">
      <span class="pnl-title">Tree View</span>
    </div>
    <div class="pnl-body"><ul id="tree-ul" class="tree"></ul></div>
  </div>
  <div class="panel" id="panel-notes">
    <div class="notes-hdr">
      <span class="pnl-title">&#x1F4DD; Notes</span>
    </div>
    <div class="notes-empty" id="notes-empty">Click a node to<br>view its notes</div>
    <div id="notes-content" style="display:none;flex-direction:column;flex:1;overflow:hidden">
      <div class="notes-hdr" style="height:auto;padding:8px 12px;border-top:none">
        <span class="notes-icon" id="notes-icon"></span>
        <span class="notes-name" id="notes-name"></span>
      </div>
      <div class="notes-path" id="notes-path"></div>
      <div id="notes-preview"></div>
    </div>
  </div>
</div>
<div class="statusbar">
  <span class="sitem">&#x1F310; ${domainName}</span>
  <span class="sitem" style="margin-left:auto;font-size:10px;opacity:.7">Generated by OpenMockADWebView &mdash; Read-only</span>
</div>
<script>
const DATA = ${treeJSON};
const PST  = ${pStExport};

function getIcon(type, isOpen) {
  if (type==='OU') return isOpen ? '\\uD83D\\uDCC2' : '\\uD83D\\uDCC1';
  if (type==='Container') return '\\uD83D\\uDCE6';
  if (type==='Domain')    return '\\uD83C\\uDF10';
  if (type==='User')      return '\\uD83D\\uDC64';
  if (type==='Group')     return '\\uD83D\\uDC65';
  if (type==='Computer')  return '\\uD83D\\uDCBB';
  if (type==='GPO')       return '\\uD83D\\uDCCB';
  if (type==='MSA')       return '\\u2699\\uFE0F';
  if (type==='gMSA')      return '\\u2699\\uFE0F';
  if (type==='dMSA')      return '\\u2699\\uFE0F';
  if (type==='Contact')   return '\\uD83E\\uDEB9';
  if (type==='Printer')   return '\\uD83D\\uDDA8\\uFE0F';
  if (type==='Share')     return '\\uD83D\\uDDC4\\uFE0F';
  return '\\uD83D\\uDCC1';
}
function getIconFilter(type) {
  if (type==='MSA')  return 'sepia(1) hue-rotate(310deg) saturate(5) brightness(0.9)';
  if (type==='dMSA') return 'sepia(1) hue-rotate(80deg) saturate(5) brightness(0.9)';
  return null;
}

let idMap = {}, pst = {};
let selId = null;

function hydrate(o, pid) {
  const n = { id: o.Name + '|' + (pid||''), name: o.Name, type: o.Type||'OU', description: o.Description||'', children: [] };
  if (n.type !== 'Domain') n.children = (o.Children||[]).map(c => hydrate(c, n.id));
  else n.children = (o.Children||[]).map(c => hydrate(c, n.id));
  idMap[n.id] = n;
  // Restore expand state from original app — match by name path
  pst[n.id] = true; // default open
  return n;
}

function renderMarkdown(raw) {
  if (!raw || !raw.trim()) return '<span style="color:var(--muted);font-size:12px">No notes for this node</span>';
  const lines = raw.split('\\n');
  const out = []; let inUl=false, inOl=false;
  function closeLists() { if(inUl){out.push('</ul>');inUl=false;} if(inOl){out.push('</ol>');inOl=false;} }
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function fmt(s){s=esc(s);s=s.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>');s=s.replace(/\\*(.+?)\\*/g,'<em>$1</em>');s=s.replace(/__(.+?)__/g,'<u>$1</u>');s=s.replace(/\`(.+?)\`/g,'<code>$1</code>');return s;}
  for(const line of lines){
    const t=line.trimStart();
    if(t.startsWith('### ')){closeLists();out.push('<h3>'+fmt(t.slice(4))+'</h3>');continue;}
    if(t.startsWith('## ')){ closeLists();out.push('<h2>'+fmt(t.slice(3))+'</h2>');continue;}
    if(t.startsWith('# ')){  closeLists();out.push('<h1>'+fmt(t.slice(2))+'</h1>');continue;}
    if(/^-{3,}$/.test(t)){closeLists();out.push('<hr>');continue;}
    if(/^> /.test(t)){closeLists();out.push('<blockquote>'+fmt(t.slice(2))+'</blockquote>');continue;}
    if(/^[-*] /.test(t)){if(!inUl){closeLists();out.push('<ul>');inUl=true;}out.push('<li>'+fmt(t.replace(/^[-*] /,''))+'</li>');continue;}
    if(/^\\d+\\. /.test(t)){if(!inOl){closeLists();out.push('<ol>');inOl=true;}out.push('<li>'+fmt(t.replace(/^\\d+\\. /,''))+'</li>');continue;}
    closeLists();
    if(t===''){out.push('<br>');continue;}
    out.push('<p>'+fmt(t)+'</p>');
  }
  closeLists();
  return out.join('\\n');
}

function getPath(n, root) {
  function walk(cur, target, path) {
    if (cur === target) return path;
    for (const c of cur.children) { const r = walk(c, target, [...path, cur.name]); if (r) return r; }
    return null;
  }
  return (walk(root, n, []) || []).join(' \\u203A ');
}

function selectNode(n, root) {
  selId = n.id;
  document.querySelectorAll('.prow').forEach(r => r.classList.toggle('sel', r.dataset.id === n.id));
  const empty = document.getElementById('notes-empty');
  const content = document.getElementById('notes-content');
  empty.style.display = 'none';
  content.style.display = 'flex';
  const _vni = document.getElementById('notes-icon');
  _vni.textContent = getIcon(n.type, false);
  const _vnf = getIconFilter(n.type);
  _vni.style.filter = _vnf || ''; _vni.style.color = '';
  document.getElementById('notes-name').textContent = n.name;
  document.getElementById('notes-path').textContent = getPath(n, root);
  document.getElementById('notes-preview').innerHTML = renderMarkdown(n.description);
}

function buildNode(n, ul, root, isBranch) {
  const hasKids = n.children.length > 0;
  const exp = pst[n.id] !== false;
  const li = document.createElement('li');
  if (isBranch) li.className = 'tn';
  const row = document.createElement('div');
  row.className = 'prow' + (n.id === selId ? ' sel' : '');
  row.dataset.id = n.id;
  row.addEventListener('click', () => selectNode(n, root));

  if (hasKids) {
    const xb = document.createElement('button');
    xb.className = 'xbtn'; xb.textContent = exp ? '\\u2212' : '+';
    xb.addEventListener('click', e => {
      e.stopPropagation();
      const nv = !(pst[n.id] !== false); pst[n.id] = nv;
      xb.textContent = nv ? '\\u2212' : '+';
      kul.style.display = nv ? '' : 'none';
      ic.textContent = getIcon(n.type, nv && n.children.length > 0);
    });
    row.appendChild(xb);
  } else {
    const g = document.createElement('div'); g.className = 'xgap'; row.appendChild(g);
  }

  const ic = document.createElement('span');
  ic.className = 'nd-icon'; ic.textContent = getIcon(n.type, hasKids && exp);
  const _vf = getIconFilter(n.type); if (_vf) ic.style.filter = _vf;
  row.appendChild(ic);

  const lb = document.createElement('span');
  lb.style.cssText = 'font-size:13px' + (n.type==='Domain'?';font-weight:600':'');
  lb.textContent = n.name;
  row.appendChild(lb);
  li.appendChild(row);

  const kul = document.createElement('ul');
  kul.className = 'tree tkids'; kul.style.display = exp ? '' : 'none';
  for (const c of n.children) buildNode(c, kul, root, true);
  li.appendChild(kul); ul.appendChild(li);
}

function setAll(v) {
  Object.keys(pst).forEach(k => pst[k] = v);
  render();
}

let _root;
function render() {
  const ul = document.getElementById('tree-ul');
  ul.innerHTML = '';
  if (_root) buildNode(_root, ul, _root, false);
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  document.getElementById('theme-btn').textContent = isDark ? '\\u2600\\uFE0F Light' : '\\u1F313 Dark';
}

_root = hydrate(DATA, null);
render();
<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (ROOT.name || 'ad-structure') + '-viewer.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Static viewer exported: ' + a.download);
}


/* ─── md2ADUC Compatibility ─────────────────────────────────────────────── */
// Format: indented unordered list with optional [type] markers at line end.
// Compatible with md2ADUC (https://github.com/JimSycurity/md2ADUC) and the
// AD2Markdown PowerShell export scripts.

const MD2_TYPE_MAP = {
  user: 'User', computer: 'Computer', group: 'Group',
  policy: 'GPO', container: 'Container', contact: 'Contact',
  printer: 'Printer', share: 'Share'
};

function parseMd2ADUC(text) {
  const lines = text.split('\n');
  let root = null;
  // Stack entries: { obj: {Name,Type,Description,Children}, indent }
  // indent is raw space count — works regardless of 2- vs 4-space convention
  const stack = [];

  for (const raw of lines) {
    const m = raw.match(/^( *)[*\-] (.+)$/);
    if (!m) continue;

    const indent = m[1].length;
    let name = m[2].trim();

    // Extract optional [type] marker from end of name
    const tm = name.match(/\s*\[(\w+)\]\s*$/i);
    let type = 'OU';
    if (tm) {
      name = name.slice(0, name.length - tm[0].length).trim();
      type = MD2_TYPE_MAP[tm[1].toLowerCase()] || 'OU';
    }

    const obj = { Name: name || 'Unnamed', Type: type, Description: '', Children: [] };

    if (!root) {
      obj.Type = 'Domain';  // First list item is always the domain root
      root = obj;
      stack.push({ obj, indent: -1 });  // sentinel indent
      continue;
    }

    // Pop until we find the rightful parent (parent has smaller indent than current)
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].obj.Children.push(obj);

    // Non-leaf types can have children — push onto stack so they can be parents
    if (!LEAF_TYPES.has(obj.Type)) stack.push({ obj, indent });
  }

  return root;
}

// md2ADUC marker for each of our types (for export)
function getMd2Marker(type) {
  switch (type) {
    case 'User':      return 'user';
    case 'Group':     return 'group';
    case 'Computer':  return 'computer';
    case 'GPO':       return 'policy';
    case 'Container': return 'container';
    case 'Contact':   return 'contact';
    case 'Printer':   return 'printer';
    case 'Share':     return 'share';
    // MSA types export as [computer] — that's how md2ADUC and AD2Markdown handle them
    case 'MSA':
    case 'gMSA':
    case 'dMSA':      return 'computer';
    default:          return '';  // OU and Domain get no marker
  }
}

function _buildMdLines(n, depth) {
  const indent  = '  '.repeat(depth);
  const marker  = getMd2Marker(n.type);
  const lines   = [indent + '- ' + n.name + (marker ? ' [' + marker + ']' : '')];
  for (const c of n.children) lines.push(..._buildMdLines(c, depth + 1));
  return lines;
}

function downloadMarkdown() {
  if (!ROOT) { toast('Nothing to export'); return; }
  const now    = new Date();
  const pad    = v => String(v).padStart(2, '0');
  const date   = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate()) +
                 ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
  const counts = countByType(ROOT, {});
  const total  = Object.values(counts).reduce((s, v) => s + v, 0);
  const header = [
    '# Active Directory Structure', '',
    'Exported from: OpenMockADWebView v0.2.0',
    'Date: ' + date,
    'Total Objects: ' + total, ''
  ].join('\n');
  const content = header + '\n' + _buildMdLines(ROOT, 0).join('\n') + '\n';
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([content], { type: 'text/markdown' })),
    download: (ROOT.name || 'ad-structure') + '.md'
  });
  a.click(); URL.revokeObjectURL(a.href);
  toast('Exported: ' + a.download);
}

/* ─── JSON Validation ────────────────────────────────────────────────────── */
const VALID_TYPES = new Set(['Domain','OU','Container','User','Group','Computer','GPO','MSA','gMSA']);

function validateADJSON(obj, path) {
  const errs = { critical: [], warnings: [] };
  (function check(o, p) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) {
      errs.critical.push(p + ': must be an object'); return;
    }
    if (typeof o.Name !== 'string' || !o.Name.trim())
      errs.warnings.push(p + '.Name: missing or empty (will default to "Unnamed")');
    if (!o.Type) {
      errs.warnings.push(p + '.Type: missing (will default to OU)');
    } else if (!VALID_TYPES.has(o.Type)) {
      errs.warnings.push(p + '.Type: "' + o.Type + '" is unrecognized — node will render as OU');
    }
    if (o.Children !== undefined) {
      if (!Array.isArray(o.Children)) {
        errs.critical.push(p + '.Children: must be an array');
      } else {
        o.Children.forEach((c, i) => check(c, p + '.Children[' + i + ']'));
      }
    }
  })(obj, path);

  // Root-level structural check
  if (!errs.critical.length) {
    if (obj.Type && obj.Type !== 'Domain')
      errs.warnings.push('root.Type: expected "Domain", got "' + obj.Type + '"');
    if (!Array.isArray(obj.Children) || obj.Children.length === 0)
      errs.warnings.push('root.Children: no children — structure will be empty');
  }
  return errs;
}

function showValidationErrors(errs) {
  const all = errs.critical.concat(errs.warnings);
  if (all.length === 0) return;
  if (all.length === 1) { toast((errs.critical.length ? 'Error: ' : 'Warning: ') + all[0]); return; }
  // Multi-error: use alert (modal) so all errors are visible at once
  const prefix = errs.critical.length ? 'Load blocked — fix these errors:\n\n' : 'Loaded with warnings:\n\n';
  alert(prefix + all.join('\n'));
}

/* ─── Query String Loading ───────────────────────────────────────────────── */
// Supports two parameters:
/* ─── Encoding — UTF-8 + deflate-raw compression ────────────────────────── */
// CompressionStream (deflate-raw) is supported in Chrome 80+, Firefox 113+,
// Safari 16.4+.  For ?data= URLs, compression typically reduces JSON by 70-80%
// before base64 encoding — keeping links usable even for large structures.
//
// Fallback: if decompression fails (e.g. an old uncompressed ?data= URL or a
// manually base64-encoded string), decodeBase64() is tried automatically.

function encodeBase64(str) {
  const bytes  = new TextEncoder().encode(str);
  let   binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function decodeBase64(b64) {
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function compressToBase64(str) {
  const bytes  = new TextEncoder().encode(str);
  const cs     = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  const arr = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}
async function decompressFromBase64(b64) {
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ds     = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
}

/* ─── Copy Link ──────────────────────────────────────────────────────────── */
// Produces a compressed ?data= URL encoding the current tree.
// Works offline (file://), on GitHub Pages, or any HTTP server.
// No companion file needed — the data travels with the URL.
async function copyLink() {
  if (!ROOT) { toast('Nothing to link'); return; }
  try {
    const b64  = await compressToBase64(JSON.stringify(toJSON(ROOT)));
    const base = window.location.href.replace(/[?#].*$/, '');
    const url  = base + '?data=' + b64;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      toast('Link copied \u2014 paste into any browser to restore this view');
    } else {
      _copyLinkFallback(url);
    }
  } catch(e) {
    toast('Could not generate link: ' + e.message);
  }
}
function _copyLinkFallback(url) {
  try {
    const inp = Object.assign(document.createElement('input'), { value: url });
    document.body.appendChild(inp); inp.select(); document.execCommand('copy');
    document.body.removeChild(inp);
    toast('Link copied \u2014 paste into any browser to restore this view');
  } catch(e) {
    prompt('Copy this link to restore this view in any browser:', url);
  }
}

/* ─── ?data= URL Loading ─────────────────────────────────────────────────── */
// ?data= is the only URL loading mechanism.  Generated by the Copy Link button.
// Compressed (deflate-raw + base64) by default; falls back to plain base64 for
// any URL generated by an older version or created manually.
function initQueryString() {
  let params;
  try { params = new URLSearchParams(window.location.search); }
  catch(e) { return; }

  const dataParam = params.get('data');
  if (!dataParam) return;

  // Try decompression first; fall back to plain base64 for old URLs
  decompressFromBase64(dataParam)
    .catch(function() { return decodeBase64(dataParam); })
    .then(function(json)   { return JSON.parse(json); })
    .then(function(parsed) {
      const errs = validateADJSON(parsed, 'root');
      if (errs.critical.length) { showValidationErrors(errs); return; }
      if (errs.warnings.length) showValidationErrors(errs);
      loadData(parsed);
      toast('Loaded from link');
    })
    .catch(function(e) {
      toast('Link data error: ' + e.message.split('\n')[0]);
    });
}

/* ─── Init ───────────────────────────────────────────────────────────────── */
(function() { try { const t = localStorage.getItem('omadwv-theme'); if (t) document.body.className = t; } catch(e) {} })();
loadData(JSON.parse(JSON.stringify(TMPL_TIERED)));
initQueryString();

