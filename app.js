/* ═══════════════════════════════════════════════════════════════════════════
   OpenMockADWebView v11 — Full-featured AD OU simulation tool
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Config ─────────────────────────────────────────────────────────────── */
const LEAF_TYPES = new Set(['User','Group','Computer','GPO','MSA','gMSA']);
const TYPE_LABELS = {OU:'OU',Container:'Container',User:'User',Group:'Group',Computer:'Computer',GPO:'GPO',MSA:'MSA',gMSA:'gMSA'};
function isLeaf(t) { return LEAF_TYPES.has(t); }
function getIcon(type, isOpen) {
  if (type === 'OU')        return isOpen ? '\uD83D\uDCC2' : '\uD83D\uDCC1';
  if (type === 'Container') return '\uD83D\uDCE6';
  if (type === 'Domain')    return '\uD83C\uDF10';
  if (type === 'User')      return '\uD83D\uDC64';
  if (type === 'Group')     return '\uD83D\uDC65';
  if (type === 'Computer')  return '\uD83D\uDCBB';
  if (type === 'GPO')       return '\uD83D\uDCCB';
  if (type === 'MSA')       return '\u2699\uFE0F';
  if (type === 'gMSA')      return '\u2699\uFE0F';
  return '\uD83D\uDCC1';
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
  br.className = 'abtn'; br.title = 'Rename'; br.textContent = '\u270E';
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
  try { loadData(JSON.parse(raw)); toast('Loaded'); }
  catch(e) { toast('Invalid JSON: ' + e.message.split('\n')[0]); }
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
    ctx.fillStyle = '#333';
    ctx.fillText(getIcon(r.node.type, pSt[r.node.id]!==false && (r.node.children||[]).length>0), iconX, midY+5);
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
function loadJSONFile(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try { loadData(JSON.parse(e.target.result)); toast('Loaded: ' + file.name); }
    catch(err) { toast('Invalid JSON: ' + err.message); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

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
  document.getElementById('notes-icon').textContent = getIcon(n.type, false);
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

/* ─── Init ───────────────────────────────────────────────────────────────── */
(function() { try { const t = localStorage.getItem('omadwv-theme'); if (t) document.body.className = t; } catch(e) {} })();
loadData(JSON.parse(JSON.stringify(TMPL_TIERED)));
