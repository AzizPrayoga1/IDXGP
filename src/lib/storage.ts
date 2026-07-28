const GROUPS_KEY = 'idx-dashboard:v1:groups';
const PREFS_KEY = 'idx-dashboard:v1:preferences';
const USER_ID_KEY = 'idxgp:user_id';
const TOKEN_KEY = 'idxgp:session_token';
const SYNC_KEY = 'idxgp:sync_ts';
const SESSION_KEY = 'idxgp:session';

let _idSeq = 0;
function uid() {
  _idSeq++;
  return `g_${_idSeq}_${Date.now().toString(36)}`;
}

// ── User ID ──
export function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

// ── Session token (opaque, never raw password) ──
function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(t: string) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders() {
  const token = getToken();
  if (!token) return {};
  return { 'Authorization': `Bearer ${token}` };
}

export function isPinVerified(): boolean {
  return !!localStorage.getItem(SESSION_KEY);
}

export function markPinVerified(v: boolean) {
  if (v) localStorage.setItem(SESSION_KEY, '1');
  else {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getSessionToken(): string {
  return getToken();
}

export function clearSession() {
  markPinVerified(false);
}

// ── Auth ──
export async function registerUser(id: string, pin: string): Promise<boolean> {
  try {
    const res = await fetch('/api/user/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pin }),
    });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      const token = body.token || '';
      if (token) setToken(token);
      markPinVerified(true);
      return true;
    }
    return false;
  } catch { return false; }
}

export async function verifyPin(id: string, pin: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pin }),
    });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      const token = body.token || '';
      if (token) setToken(token);
      markPinVerified(true);
      return true;
    }
    return false;
  } catch { return false; }
}

// ── Cloud sync ──

export async function syncGroupsToCloud(d: GroupsStore): Promise<void> {
  const headers = getAuthHeaders();
  if (!headers['Authorization']) return;
  try {
    const uid = getUserId();
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid, ...headers },
      body: JSON.stringify({ groups: d.groups }),
    });
    if (res.ok) localStorage.setItem(SYNC_KEY, Date.now().toString());
  } catch {}
}

export async function syncGroupsFromCloud(): Promise<GroupsStore | null> {
  const headers = getAuthHeaders();
  if (!headers['Authorization']) return null;
  try {
    const uid = getUserId();
    const res = await fetch('/api/groups', {
      headers: { 'X-User-Id': uid, ...headers },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.groups && data.groups.length > 0) {
      const store: GroupsStore = {
        version: 1,
        activeGroupId: data.groups[0]?.id || '__all__',
        groups: data.groups,
      };
      persistGroups(store);
      localStorage.setItem(SYNC_KEY, Date.now().toString());
      return store;
    }
    return null;
  } catch {
    return null;
  }
}

export interface Group {
  id: string;
  name: string;
  isPreset: boolean;
  order: number;
  tickers: string[];
}

export interface GroupsStore {
  version: number;
  activeGroupId: string;
  groups: Group[];
}

export interface Preferences {
  version: number;
  theme: string;
  pollingIntervalMs: number;
  flashAnimationEnabled: boolean;
  compactMode: boolean;
  soundAlertOnBigMove: boolean;
}

const PRESETS: Group[] = [
  { id: '__all__', name: 'All Stocks', isPreset: true, order: -1, tickers: [] },
  { id: 'preset_banking', name: 'Banking', isPreset: true, order: 0, tickers: ['BBCA','BBRI','BMRI','BBNI','BRIS'] },
  { id: 'preset_tech', name: 'Technology', isPreset: true, order: 1, tickers: ['GOTO','BELI','DCII','MTEL','TOWR'] },
  { id: 'preset_energy', name: 'Energy', isPreset: true, order: 2, tickers: ['ADRO','ITMG','PTBA','INDY','ANTM'] },
  { id: 'preset_consumer', name: 'Consumer', isPreset: true, order: 3, tickers: ['UNVR','ICBP','MYOR','ASII','TLKM'] },
];

const DEFAULT_PREFS: Preferences = {
  version: 1, theme: 'dark', pollingIntervalMs: 4000,
  flashAnimationEnabled: true, compactMode: false, soundAlertOnBigMove: false,
};

function defaultGroups(): GroupsStore {
  return { version: 1, activeGroupId: '__all__', groups: PRESETS.map(g => ({ ...g, tickers: [...g.tickers] })) };
}

// --- Groups ---

export function loadGroups(): GroupsStore {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return defaultGroups();
    const d = JSON.parse(raw);
    if (d.version !== 1) throw new Error('unsupported version');
    return d as GroupsStore;
  } catch {
    const def = defaultGroups();
    persistGroups(def);
    return def;
  }
}

let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingStore: GroupsStore | null = null;
const _SYNC_DEBOUNCE_MS = 2000;

export function persistGroups(d: GroupsStore): void {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(d));
  _pendingStore = d;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    if (_pendingStore) syncGroupsToCloud(_pendingStore);
    _pendingStore = null;
    _syncTimer = null;
  }, _SYNC_DEBOUNCE_MS);
}

export function cloneStore(d: GroupsStore): GroupsStore {
  return JSON.parse(JSON.stringify(d));
}

export function addGroup(d: GroupsStore, name: string): GroupsStore | null {
  const n = name.trim().slice(0, 30);
  if (!n || d.groups.some(g => g.name.toLowerCase() === n.toLowerCase())) return null;
  const maxOrder = Math.max(...d.groups.map(g => g.order), -1);
  const g: Group = { id: uid(), name: n, isPreset: false, order: maxOrder + 1, tickers: [] };
  const groups = [...d.groups, g];
  return { ...d, groups, activeGroupId: g.id };
}

export function renameGroup(d: GroupsStore, id: string, newName: string): GroupsStore {
  const n = newName.trim().slice(0, 30);
  if (!n) return d;
  const target = d.groups.find(g => g.id === id);
  if (!target) return d;

  // Duplicate name check (skip self)
  if (!target.isPreset && d.groups.some(g => g.id !== id && g.name.toLowerCase() === n.toLowerCase())) return d;

  // Preset → clone-on-edit: create new custom group with same tickers
  if (target.isPreset) {
    const maxOrder = Math.max(...d.groups.map(g => g.order), -1);
    const g: Group = { id: uid(), name: n, isPreset: false, order: maxOrder + 1, tickers: [...target.tickers] };
    const groups = [...d.groups, g];
    return { ...d, groups, activeGroupId: g.id };
  }

  const groups = d.groups.map(g => g.id !== id ? g : { ...g, name: n });
  return { ...d, groups };
}

export function deleteGroup(d: GroupsStore, id: string): GroupsStore {
  if (d.groups.find(g => g.id === id)?.isPreset) return d;
  const groups = d.groups.filter(g => g.id !== id);
  const activeGroupId = d.activeGroupId === id ? (groups[0]?.id || '__all__') : d.activeGroupId;
  return { ...d, groups, activeGroupId };
}

export function groupAddTicker(d: GroupsStore, gid: string, sym: string): GroupsStore {
  const s = sym.toUpperCase();
  if (!/^[A-Z]{4}$/.test(s)) return d;
  const groups = d.groups.map(g =>
    g.id !== gid || g.tickers.includes(s) ? g : { ...g, tickers: [...g.tickers, s] }
  );
  return { ...d, groups };
}

export function groupRemoveTicker(d: GroupsStore, gid: string, sym: string): GroupsStore {
  const s = sym.toUpperCase();
  const groups = d.groups.map(g =>
    g.id !== gid ? g : { ...g, tickers: g.tickers.filter(t => t !== s) }
  );
  return { ...d, groups };
}

// --- Preferences ---

export function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(p: Partial<Preferences>): void {
  const cur = loadPrefs();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...cur, ...p }));
}
