/* ═══════════════════════════════════════════════════════════════════════════
   OpenMockADWebView v0.3.0a — Full-featured AD OU simulation tool
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Config ─────────────────────────────────────────────────────────────── */
const LEAF_TYPES = new Set(['User','Group','Computer','GPO','MSA','gMSA','dMSA','Contact','Printer','Share']);
const TYPE_LABELS = {OU:'OU',Container:'Container',User:'User',Group:'Group',Computer:'Computer',GPO:'GPO',MSA:'MSA',gMSA:'gMSA',dMSA:'dMSA',Contact:'Contact',Printer:'Printer',Share:'Share'};
function isLeaf(t) { return LEAF_TYPES.has(t); }
function getIcon(type, isOpen) {
  if (type === 'OU')        return '\uD83D\uDCC2';  // 📂 open folder always
  if (type === 'Container') return '\uD83D\uDCC1';  // 📁 desaturated via filter
  if (type === 'Domain')    return '\uD83C\uDF10';
  if (type === 'User')      return '\uD83D\uDC64';
  if (type === 'Group')     return '\uD83D\uDC65';
  if (type === 'Computer')  return '\uD83D\uDCBB';
  if (type === 'GPO')       return '\uD83D\uDCC3';  // 📃 page with curl
  if (type === 'MSA')       return '\u2699\uFE0F';  // ⚙️ emoji — hue filter makes red
  if (type === 'gMSA')      return '\u2699\uFE0F';  // ⚙️ emoji — no filter, standard gear
  if (type === 'dMSA')      return '\u2699\uFE0F';  // ⚙️ emoji — hue filter makes green
  if (type === 'Contact')   return '\uD83D\uDCBC';  // 💼 briefcase
  if (type === 'Printer')   return '\uD83D\uDDA8\uFE0F';
  if (type === 'Share')     return '\uD83D\uDDC4\uFE0F';  // 🗄️ filing cabinet — stored/shared files
  return '\uD83D\uDCC1';
}

/* Icon filters: MSA hue overlays + Container desaturation */
function getIconFilter(type) {
  if (type === 'Container') return 'saturate(0.4)';
  if (type === 'MSA')  return 'sepia(1) hue-rotate(310deg) saturate(5) brightness(0.9)';
  if (type === 'dMSA') return 'sepia(1) hue-rotate(80deg) saturate(5) brightness(0.9)';
  return null;
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
const DEFAULT = {"Name": "example.com","Type": "Domain","Description": "","Children": [{"Name": "Admin","Type": "OU","Description": "","Children": [{"Name": "Tier 0","Type": "OU","Description": "","Children": [{"Name": "T0 Groups","Type": "OU","Description": "","Children": [{"Name": "T0 Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "T0 Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "T0 PAWs","Type": "OU","Description": "","Children": []},{"Name": "T0 Servers","Type": "OU","Description": "","Children": []},{"Name": "T0 Service Accounts","Type": "OU","Description": "","Children": []},{"Name": "T0 Users","Type": "OU","Description": "","Children": []}]},{"Name": "Tier 1","Type": "OU","Description": "","Children": [{"Name": "T1 Computers","Type": "OU","Description": "","Children": []},{"Name": "T1 Groups","Type": "OU","Description": "","Children": [{"Name": "T1 Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "T1 Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "T1 Servers","Type": "OU","Description": "","Children": []},{"Name": "T1 Service Accounts","Type": "OU","Description": "","Children": []},{"Name": "Users","Type": "OU","Description": "","Children": []}]},{"Name": "Tier 2","Type": "OU","Description": "","Children": [{"Name": "T2 Computers","Type": "OU","Description": "","Children": []},{"Name": "T2 Groups","Type": "OU","Description": "","Children": [{"Name": "T2 Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "T2 Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "T2 Servers","Type": "OU","Description": "","Children": []},{"Name": "T2 Service Accounts","Type": "OU","Description": "","Children": []},{"Name": "T2 Users","Type": "OU","Description": "","Children": []}]}]},{"Name": "Corporate","Type": "OU","Description": "","Children": [{"Name": "Bind Accounts","Type": "OU","Description": "","Children": []},{"Name": "Computers","Type": "OU","Description": "","Children": []},{"Name": "Distribution Lists","Type": "OU","Description": "","Children": []},{"Name": "Groups","Type": "OU","Description": "","Children": [{"Name": "Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "Users","Type": "OU","Description": "","Children": [{"Name": "Africa","Type": "OU","Description": "","Children": []},{"Name": "Asia","Type": "OU","Description": "","Children": []},{"Name": "EU","Type": "OU","Description": "","Children": []},{"Name": "US","Type": "OU","Description": "","Children": []}]}]},{"Name": "Domain Controllers","Type": "OU","Description": "","Children": []}]};

/* ─── Template data ──────────────────────────────────────────────────────── */
const TMPL_WINDEFAULT = {"Name": "example.com","Type": "Domain","Description": "","Children": [{"Name": "Builtin","Type": "Container","Description": "","Children": [{"Name": "Administrators","Type": "Group","Description": "","Children": []},{"Name": "Account Operators","Type": "Group","Description": "","Children": []},{"Name": "Backup Operators","Type": "Group","Description": "","Children": []},{"Name": "Guests","Type": "Group","Description": "","Children": []},{"Name": "Network Configuration Operators","Type": "Group","Description": "","Children": []},{"Name": "Print Operators","Type": "Group","Description": "","Children": []},{"Name": "Remote Desktop Users","Type": "Group","Description": "","Children": []},{"Name": "Server Operators","Type": "Group","Description": "","Children": []},{"Name": "Users","Type": "Group","Description": "","Children": []}]},{"Name": "Computers","Type": "Container","Description": "","Children": []},{"Name": "Domain Controllers","Type": "OU","Description": "","Children": []},{"Name": "ForeignSecurityPrincipals","Type": "Container","Description": "","Children": []},{"Name": "Keys","Type": "Container","Description": "","Children": []},{"Name": "Managed Service Accounts","Type": "Container","Description": "","Children": []},{"Name": "Users","Type": "Container","Description": "","Children": [{"Name": "Administrator","Type": "User","Description": "","Children": []},{"Name": "Guest","Type": "User","Description": "","Children": []},{"Name": "krbtgt","Type": "User","Description": "","Children": []},{"Name": "Cert Publishers","Type": "Group","Description": "","Children": []},{"Name": "Domain Admins","Type": "Group","Description": "","Children": []},{"Name": "Domain Computers","Type": "Group","Description": "","Children": []},{"Name": "Domain Controllers","Type": "Group","Description": "","Children": []},{"Name": "Domain Guests","Type": "Group","Description": "","Children": []},{"Name": "Domain Users","Type": "Group","Description": "","Children": []},{"Name": "Enterprise Admins","Type": "Group","Description": "","Children": []},{"Name": "Enterprise Read-only Domain Controllers","Type": "Group","Description": "","Children": []},{"Name": "Group Policy Creator Owners","Type": "Group","Description": "","Children": []},{"Name": "Protected Users","Type": "Group","Description": "","Children": []},{"Name": "Read-only Domain Controllers","Type": "Group","Description": "","Children": []},{"Name": "Schema Admins","Type": "Group","Description": "","Children": []}]}]};
const TMPL_TIERED = {"Name": "example.com","Type": "Domain","Description": "","Children": [{"Name": "Admin","Type": "OU","Description": "","Children": [{"Name": "Tier 0","Type": "OU","Description": "","Children": [{"Name": "T0 Groups","Type": "OU","Description": "","Children": [{"Name": "T0 Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "T0 Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "T0 PAWs","Type": "OU","Description": "","Children": []},{"Name": "T0 Servers","Type": "OU","Description": "","Children": []},{"Name": "T0 Service Accounts","Type": "OU","Description": "","Children": []},{"Name": "T0 Users","Type": "OU","Description": "","Children": []}]},{"Name": "Tier 1","Type": "OU","Description": "","Children": [{"Name": "T1 Computers","Type": "OU","Description": "","Children": []},{"Name": "T1 Groups","Type": "OU","Description": "","Children": [{"Name": "T1 Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "T1 Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "T1 Servers","Type": "OU","Description": "","Children": []},{"Name": "T1 Service Accounts","Type": "OU","Description": "","Children": []},{"Name": "Users","Type": "OU","Description": "","Children": []}]},{"Name": "Tier 2","Type": "OU","Description": "","Children": [{"Name": "T2 Computers","Type": "OU","Description": "","Children": []},{"Name": "T2 Groups","Type": "OU","Description": "","Children": [{"Name": "T2 Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "T2 Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "T2 Servers","Type": "OU","Description": "","Children": []},{"Name": "T2 Service Accounts","Type": "OU","Description": "","Children": []},{"Name": "T2 Users","Type": "OU","Description": "","Children": []}]}]},{"Name": "Corporate","Type": "OU","Description": "","Children": [{"Name": "Bind Accounts","Type": "OU","Description": "","Children": []},{"Name": "Computers","Type": "OU","Description": "","Children": []},{"Name": "Distribution Lists","Type": "OU","Description": "","Children": []},{"Name": "Groups","Type": "OU","Description": "","Children": [{"Name": "Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "Users","Type": "OU","Description": "","Children": [{"Name": "Africa","Type": "OU","Description": "","Children": []},{"Name": "Asia","Type": "OU","Description": "","Children": []},{"Name": "EU","Type": "OU","Description": "","Children": []},{"Name": "US","Type": "OU","Description": "","Children": []}]}]},{"Name": "Domain Controllers","Type": "OU","Description": "","Children": []},{"Name": "Builtin","Type": "Container","Description": "","Children": []},{"Name": "Computers","Type": "Container","Description": "","Children": []},{"Name": "ForeignSecurityPrincipals","Type": "Container","Description": "","Children": []},{"Name": "Keys","Type": "Container","Description": "","Children": []},{"Name": "Managed Service Accounts","Type": "Container","Description": "","Children": []},{"Name": "Users","Type": "Container","Description": "","Children": []}]};
const TMPL_TIERED_FULL = {"Name": "example.com","Type": "Domain","Description": "","Children": [{"Name": "Admin","Type": "OU","Description": "","Children": [{"Name": "Tier 0","Type": "OU","Description": "","Children": [{"Name": "T0 Groups","Type": "OU","Description": "","Children": [{"Name": "T0 Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "T0 Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "T0 PAWs","Type": "OU","Description": "","Children": []},{"Name": "T0 Servers","Type": "OU","Description": "","Children": []},{"Name": "T0 Service Accounts","Type": "OU","Description": "","Children": []},{"Name": "T0 Users","Type": "OU","Description": "","Children": []}]},{"Name": "Tier 1","Type": "OU","Description": "","Children": [{"Name": "T1 Computers","Type": "OU","Description": "","Children": []},{"Name": "T1 Groups","Type": "OU","Description": "","Children": [{"Name": "T1 Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "T1 Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "T1 Servers","Type": "OU","Description": "","Children": []},{"Name": "T1 Service Accounts","Type": "OU","Description": "","Children": []},{"Name": "Users","Type": "OU","Description": "","Children": []}]},{"Name": "Tier 2","Type": "OU","Description": "","Children": [{"Name": "T2 Computers","Type": "OU","Description": "","Children": []},{"Name": "T2 Groups","Type": "OU","Description": "","Children": [{"Name": "T2 Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "T2 Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "T2 Servers","Type": "OU","Description": "","Children": []},{"Name": "T2 Service Accounts","Type": "OU","Description": "","Children": []},{"Name": "T2 Users","Type": "OU","Description": "","Children": []}]}]},{"Name": "Corporate","Type": "OU","Description": "","Children": [{"Name": "Bind Accounts","Type": "OU","Description": "","Children": []},{"Name": "Computers","Type": "OU","Description": "","Children": []},{"Name": "Distribution Lists","Type": "OU","Description": "","Children": []},{"Name": "Groups","Type": "OU","Description": "","Children": [{"Name": "Resource Groups","Type": "OU","Description": "","Children": []},{"Name": "Role Groups","Type": "OU","Description": "","Children": []}]},{"Name": "Users","Type": "OU","Description": "","Children": [{"Name": "Africa","Type": "OU","Description": "","Children": []},{"Name": "Asia","Type": "OU","Description": "","Children": []},{"Name": "EU","Type": "OU","Description": "","Children": []},{"Name": "US","Type": "OU","Description": "","Children": []}]}]},{"Name": "Domain Controllers","Type": "OU","Description": "","Children": []},{"Name": "Builtin","Type": "Container","Description": "","Children": [{"Name": "Administrators","Type": "Group","Description": "","Children": []},{"Name": "Account Operators","Type": "Group","Description": "","Children": []},{"Name": "Backup Operators","Type": "Group","Description": "","Children": []},{"Name": "Guests","Type": "Group","Description": "","Children": []},{"Name": "Network Configuration Operators","Type": "Group","Description": "","Children": []},{"Name": "Print Operators","Type": "Group","Description": "","Children": []},{"Name": "Remote Desktop Users","Type": "Group","Description": "","Children": []},{"Name": "Server Operators","Type": "Group","Description": "","Children": []},{"Name": "Users","Type": "Group","Description": "","Children": []}]},{"Name": "Computers","Type": "Container","Description": "","Children": []},{"Name": "ForeignSecurityPrincipals","Type": "Container","Description": "","Children": []},{"Name": "Keys","Type": "Container","Description": "","Children": []},{"Name": "Managed Service Accounts","Type": "Container","Description": "","Children": []},{"Name": "Users","Type": "Container","Description": "","Children": [{"Name": "Administrator","Type": "User","Description": "","Children": []},{"Name": "Guest","Type": "User","Description": "","Children": []},{"Name": "krbtgt","Type": "User","Description": "","Children": []},{"Name": "Cert Publishers","Type": "Group","Description": "","Children": []},{"Name": "Domain Admins","Type": "Group","Description": "","Children": []},{"Name": "Domain Computers","Type": "Group","Description": "","Children": []},{"Name": "Domain Controllers","Type": "Group","Description": "","Children": []},{"Name": "Domain Guests","Type": "Group","Description": "","Children": []},{"Name": "Domain Users","Type": "Group","Description": "","Children": []},{"Name": "Enterprise Admins","Type": "Group","Description": "","Children": []},{"Name": "Enterprise Read-only Domain Controllers","Type": "Group","Description": "","Children": []},{"Name": "Group Policy Creator Owners","Type": "Group","Description": "","Children": []},{"Name": "Protected Users","Type": "Group","Description": "","Children": []},{"Name": "Read-only Domain Controllers","Type": "Group","Description": "","Children": []},{"Name": "Schema Admins","Type": "Group","Description": "","Children": []}]}]};
const TMPL_BUILTIN_ONLY = {"Name": "example.com","Type": "Domain","Description": "","Children": [{"Name": "Builtin","Type": "Container","Description": "","Children": [{"Name": "Administrators","Type": "Group","Description": "","Children": []},{"Name": "Account Operators","Type": "Group","Description": "","Children": []},{"Name": "Backup Operators","Type": "Group","Description": "","Children": []},{"Name": "Guests","Type": "Group","Description": "","Children": []},{"Name": "Network Configuration Operators","Type": "Group","Description": "","Children": []},{"Name": "Print Operators","Type": "Group","Description": "","Children": []},{"Name": "Remote Desktop Users","Type": "Group","Description": "","Children": []},{"Name": "Server Operators","Type": "Group","Description": "","Children": []},{"Name": "Users","Type": "Group","Description": "","Children": []}]},{"Name": "Computers","Type": "Container","Description": "","Children": []},{"Name": "Domain Controllers","Type": "OU","Description": "","Children": []},{"Name": "ForeignSecurityPrincipals","Type": "Container","Description": "","Children": []},{"Name": "Keys","Type": "Container","Description": "","Children": []},{"Name": "Managed Service Accounts","Type": "Container","Description": "","Children": []},{"Name": "Users","Type": "Container","Description": "","Children": [{"Name": "Administrator","Type": "User","Description": "","Children": []},{"Name": "Guest","Type": "User","Description": "","Children": []},{"Name": "krbtgt","Type": "User","Description": "","Children": []},{"Name": "Cert Publishers","Type": "Group","Description": "","Children": []},{"Name": "Domain Admins","Type": "Group","Description": "","Children": []},{"Name": "Domain Computers","Type": "Group","Description": "","Children": []},{"Name": "Domain Controllers","Type": "Group","Description": "","Children": []},{"Name": "Domain Guests","Type": "Group","Description": "","Children": []},{"Name": "Domain Users","Type": "Group","Description": "","Children": []},{"Name": "Enterprise Admins","Type": "Group","Description": "","Children": []},{"Name": "Enterprise Read-only Domain Controllers","Type": "Group","Description": "","Children": []},{"Name": "Group Policy Creator Owners","Type": "Group","Description": "","Children": []},{"Name": "Protected Users","Type": "Group","Description": "","Children": []},{"Name": "Read-only Domain Controllers","Type": "Group","Description": "","Children": []},{"Name": "Schema Admins","Type": "Group","Description": "","Children": []}]}]};
const TMPL_BLANK = {"Name": "example.com","Type": "Domain","Description": "","Children": [{"Name": "Domain Controllers","Type": "OU","Description": "","Children": []}]};

/* ─── Template Description Registry ───────────────────────────────
 *
 * All node descriptions for every template are stored here as a single
 * compressed blob rather than being embedded in each template JSON object.
 * This avoids duplicating large text blocks across templates that share
 * nodes (built-in groups, default containers, etc.) and keeps the template
 * constants small and readable.
 *
 * HOW IT WORKS
 * 1. TEMPLATE_DESCRIPTIONS_B64 holds a base64-encoded, deflate-raw-compressed
 *    JSON object.  The encoding matches ?data= URL compression: the same
 *    decompressFromBase64() helper is reused here.
 * 2. _loadTemplateDescs() decodes the blob once at startup and caches the
 *    result in _templateDescs.  Subsequent calls return the cached object.
 * 3. _applyDescs() walks a loaded template tree and populates each node's
 *    Description field from the registry before the tree is rendered.
 *
 * REGISTRY KEY FORMAT
 *   '/example.com/path/to/node'     -- shared across templates (same desc)
 *   'TEMPLATE_NAME:/example.com'    -- root node only, differs per template
 *
 * BROWSER SUPPORT
 *   DecompressionStream('deflate-raw') requires Chrome 80+, Firefox 113+,
 *   Safari 16.4+.  If decompression fails, templates load without
 *   descriptions rather than breaking -- the blob is not user data.
 *
 * TO UPDATE DESCRIPTIONS
 *   Re-run the build script (apply_v024_descs.py + this script) after
 *   editing the DESCS dict.  Do not edit TEMPLATE_DESCRIPTIONS_B64 by hand.
 */
const TEMPLATE_DESCRIPTIONS_B64 = '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';

let _templateDescs = null;

/* Decode and cache the description registry. Returns {} on failure. */
async function _loadTemplateDescs() {
  if (_templateDescs !== null) return _templateDescs;
  try {
    _templateDescs = JSON.parse(await decompressFromBase64(TEMPLATE_DESCRIPTIONS_B64));
  } catch(e) {
    console.warn('OpenMockADWebView: description registry failed to load:', e.message);
    _templateDescs = {};
  }
  return _templateDescs;
}

/* Walk a template tree and populate Description from the registry.
 * tname: the TEMPLATE_NAMES key (e.g. 'TMPL_TIERED') for root-node lookup. */
function _applyDescs(node, tname, descs, path) {
  var fp  = (path || '') + '/' + node.Name;
  var val = (descs[tname + ':' + fp] !== undefined)
          ? descs[tname + ':' + fp]
          : descs[fp];
  if (val !== undefined) node.Description = val;
  (node.Children || []).forEach(function(c) { _applyDescs(c, tname, descs, fp); });
}


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
/* ─── Export Menu ────────────────────────────────────────────────────────── */
function toggleExportMenu(e) {
  e.stopPropagation();
  const el = document.getElementById('export-menu');
  if (el.style.display === 'block') { el.style.display = 'none'; return; }
  const rect = document.getElementById('export-btn').getBoundingClientRect();
  el.style.top = (rect.bottom + 6) + 'px';
  el.style.right = (window.innerWidth - rect.right) + 'px';
  el.style.left = 'auto';
  el.style.display = 'block';
}
function hideExportMenu() {
  document.getElementById('export-menu').style.display = 'none';
}

/* Export All: JSON + Markdown + PNG sequentially.
 * PNG export is async (canvas render), so we await it last.
 * Brief delays between downloads prevent some browsers blocking
 * rapid-fire download triggers. */
async function exportAll() {
  hideExportMenu();
  if (!ROOT) { toast('Nothing to export'); return; }
  downloadJSON();
  await new Promise(r => setTimeout(r, 150));
  downloadMarkdown();
  await new Promise(r => setTimeout(r, 150));
  await exportPNG();
  toast('Exported: JSON, Markdown, PNG');
}

function loadTemplate(name) {
  document.getElementById('tmpl-menu').style.display = 'none';
  // Map UI name -> [template constant, registry key]
  const tmap = {
    windefault:  [TMPL_WINDEFAULT,  'TMPL_WINDEFAULT'],
    tiered:      [TMPL_TIERED,      'TMPL_TIERED'],
    tieredFull:  [TMPL_TIERED_FULL, 'TMPL_TIERED_FULL'],
    builtinOnly: [TMPL_BUILTIN_ONLY,'TMPL_BUILTIN_ONLY'],
    blank:       [TMPL_BLANK,       'TMPL_BLANK'],
  };
  const entry = tmap[name];
  if (!entry) return;
  if (!confirm('Load template? This will replace your current structure.')) return;
  const data = JSON.parse(JSON.stringify(entry[0]));
  _loadTemplateDescs().then(function(descs) {
    _applyDescs(data, entry[1], descs, '');
    loadData(data);
    toast('Template loaded: ' + data.Name);
  });
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

/* Build the LDAP Distinguished Name for a node.
 * Rules: Domain -> DC=x,DC=y  |  OU -> OU=Name  |  everything else -> CN=Name
 * Components are ordered from most-specific (leaf) to least-specific (domain root),
 * which is the standard DN format Active Directory uses. */
function buildDN(id) {
  // Collect path array from root down to the target node (inclusive)
  function collect(node, target, acc) {
    acc.push(node);
    if (node.id === target) return true;
    for (const c of (node.children || [])) { if (collect(c, target, acc)) return true; }
    acc.pop();
    return false;
  }
  const path = [];
  if (!collect(ROOT, id, path) || !path.length) return '';
  const target = path[path.length - 1];
  // Domain root: just DC= components
  if (target.type === 'Domain') {
    return target.name.split('.').map(p => 'DC=' + p).join(',');
  }
  // Walk from leaf to root building DN components
  const parts = [];
  for (let i = path.length - 1; i >= 0; i--) {
    const n = path[i];
    if (n.type === 'Domain') {
      n.name.split('.').forEach(p => parts.push('DC=' + p));
      break;
    }
    parts.push((n.type === 'OU' ? 'OU=' : 'CN=') + n.name);
  }
  return parts.join(',');
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
  document.getElementById('notes-dn').textContent   = buildDN(id);
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
  if (!ev.target.closest('#export-menu') && !ev.target.closest('#export-btn'))
    document.getElementById('export-menu').style.display = 'none';
  if (!ev.target.closest('#hamburger-menu') && !ev.target.closest('#hamburger-btn'))
    document.getElementById('hamburger-menu').style.display = 'none';
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

(function () {
  const rn      = document.getElementById('resizer-notes');
  const overlay = document.getElementById('drag-overlay');
  const panelR  = document.getElementById('panel-right');
  let dragging  = false;
  rn.addEventListener('mousedown', e => { dragging = true; e.preventDefault(); rn.classList.add('on'); overlay.classList.add('on'); });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const ws  = document.querySelector('.workspace');
    const pct = (e.clientX - panelR.getBoundingClientRect().left) / ws.offsetWidth * 100;
    panelR.style.width = Math.min(70, Math.max(10, pct)) + '%';
  });
  document.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; rn.classList.remove('on'); overlay.classList.remove('on'); });
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
      <div id="notes-dn" style="font-size:10px;font-family:monospace;color:#888;padding:0 12px 8px;user-select:all;word-break:break-all;"></div>
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
  if (type==='OU') return '\\uD83D\\uDCC2';
  if (type==='Container') return '\\uD83D\\uDCC1';
  if (type==='Domain')    return '\\uD83C\\uDF10';
  if (type==='User')      return '\\uD83D\\uDC64';
  if (type==='Group')     return '\\uD83D\\uDC65';
  if (type==='Computer')  return '\\uD83D\\uDCBB';
  if (type==='GPO')       return '\\uD83D\\uDCC3';
  if (type==='MSA')       return '\\u2699\\uFE0F';
  if (type==='gMSA')      return '\\u2699\\uFE0F';
  if (type==='dMSA')      return '\\u2699\\uFE0F';
  if (type==='Contact')   return '\\uD83D\\uDCBC';
  if (type==='Printer')   return '\\uD83D\\uDDA8\\uFE0F';
  if (type==='Share')     return '\\uD83D\\uDDC4\\uFE0F';
  return '\\uD83D\\uDCC2';
}
function buildDN(id,root){
  function collect(node,target,acc){
    acc.push(node);
    if(node.id===target)return true;
    for(const c of(node.children||[])){if(collect(c,target,acc))return true;}
    acc.pop();return false;
  }
  const path=[];if(!collect(root,id,path)||!path.length)return'';
  const target=path[path.length-1];
  if(target.type==='Domain')return target.name.split('.').map(p=>'DC='+p).join(',');
  const parts=[];
  for(let i=path.length-1;i>=0;i--){
    const n=path[i];
    if(n.type==='Domain'){n.name.split('.').forEach(p=>parts.push('DC='+p));break;}
    parts.push((n.type==='OU'?'OU=':'CN=')+n.name);
  }
  return parts.join(',');
}
function getIconFilter(type) {
  if (type==='Container') return 'saturate(0.4)';
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
  const _vdn = document.getElementById('notes-dn');
  if (_vdn) _vdn.textContent = buildDN(n.id, root);
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
    'Exported from: OpenMockADWebView v' + APP_VERSION,
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
const APP_VERSION = '0.3.0b';

const VALID_TYPES = new Set([
  'Domain', 'OU', 'Container', 'User', 'Group', 'Computer',
  'GPO', 'MSA', 'gMSA', 'dMSA', 'Contact', 'Printer', 'Share'
]);

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

/* ─── Copy URL  ──────────────────────────────────────────────────────────── */
// Produces a compressed ?data= URL encoding the current tree.
// Works offline (file://), on GitHub Pages, or any HTTP server.
// No companion file needed — the data travels with the URL.
async function copyLink() {
  if (!ROOT) { toast('Nothing to link'); return; }
  try {
    const b64  = await compressToBase64(JSON.stringify(toJSON(ROOT)));
    const base = window.location.href.replace(/[?#].*$/, '');
    const url  = base + '?data=' + encodeURIComponent(b64);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      toast('URL copied -- paste into any browser to restore this view');
    } else {
      _copyLinkFallback(url);
    }
  } catch(e) {
    toast('Could not generate URL: ' + e.message);
  }
}
function _copyLinkFallback(url) {
  try {
    const inp = Object.assign(document.createElement('input'), { value: url });
    document.body.appendChild(inp); inp.select(); document.execCommand('copy');
    document.body.removeChild(inp);
    toast('URL copied -- paste into any browser to restore this view');
  } catch(e) {
    prompt('Copy this URL to restore this view in any browser:', url);
  }
}

/* ─── ?data= URL Loading ─────────────────────────────────────────────────── */
// ?data= is the only URL loading mechanism.  Generated by the Copy URL button.
// Compressed (deflate-raw + base64) by default; falls back to plain base64 for
// any URL generated by an older version or created manually.
function initQueryString() {
  let params;
  try { params = new URLSearchParams(window.location.search); }
  catch(e) { return; }

  const dataParam = params.get('data');
  if (!dataParam) return;

  // Try decompression first.
  // Recovery: compressed -> compressed with + restored (handles URLs where
  // '+' was not percent-encoded and URLSearchParams decoded it as a space)
  // -> plain base64 for URLs created manually or by very old versions.
  decompressFromBase64(dataParam)
    .catch(function() { return decompressFromBase64(dataParam.replace(/ /g, '+')); })
    .catch(function() { return decodeBase64(dataParam.replace(/ /g, '+')); })
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

/* ─── Mobile ──────────────────────────────────────────────────────────────────────────────── */

// switchMobileTab — shows the target panel and updates the tab bar.
// Builder and JSON share panel-right; the inner switchTab() call keeps
// the correct pane visible within it.
function switchMobileTab(name) {
  document.querySelectorAll('.mob-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === name);
  });
  var panelMap = {
    tree:    'panel-left',
    builder: 'panel-right',
    json:    'panel-right',
    notes:   'panel-notes'
  };
  ['panel-left', 'panel-right', 'panel-notes'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('mob-active');
  });
  var target = document.getElementById(panelMap[name]);
  if (target) target.classList.add('mob-active');
  if (name === 'builder' || name === 'json') switchTab(name);
}

// toggleHamburgerMenu — opens/closes the overflow menu in the header.
function toggleHamburgerMenu(e) {
  e.stopPropagation();
  var el  = document.getElementById('hamburger-menu');
  var btn = document.getElementById('hamburger-btn');
  if (el.style.display === 'block') { el.style.display = 'none'; return; }
  var r = btn.getBoundingClientRect();
  el.style.top   = (r.bottom + 6) + 'px';
  el.style.right = (window.innerWidth - r.right) + 'px';
  el.style.left  = 'auto';
  el.style.display = 'block';
}

// showMenuFromHamburger — closes the hamburger then shows a named sub-menu
// positioned relative to the hamburger button.
// Used by Theme, Templates, and Help items inside the hamburger menu.
function showMenuFromHamburger(e, menuId) {
  e.stopPropagation();
  document.getElementById('hamburger-menu').style.display = 'none';
  var el = document.getElementById(menuId);
  if (!el) return;
  if (el.style.display === 'block') { el.style.display = 'none'; return; }
  var btn = document.getElementById('hamburger-btn');
  var r   = btn.getBoundingClientRect();
  el.style.top   = (r.bottom + 6) + 'px';
  el.style.right = (window.innerWidth - r.right) + 'px';
  el.style.left  = 'auto';
  el.style.display = 'block';
}

// initMobile — sets the default active tab on narrow viewports.
// Called once at startup; the media query handles layout, this handles state.
function initMobile() {
  if (!window.matchMedia('(max-width: 768px)').matches) return;
  switchMobileTab('tree');
}

/* ─── Init ───────────────────────────────────────────────────────────────── */
(function() { try {
  const _t = localStorage.getItem('omadwv-theme');
  if (_t && ['', 'dark', 'forest', 'hc'].includes(_t)) document.body.className = _t;
} catch(e) {} })();
// Load descriptions first, then apply to the startup template and
// handle any ?data= URL — both need the registry ready before rendering.
_loadTemplateDescs().then(function(descs) {
  var d = JSON.parse(JSON.stringify(TMPL_TIERED));
  _applyDescs(d, 'TMPL_TIERED', descs, '');
  loadData(d);
  initQueryString();
initMobile();
});

