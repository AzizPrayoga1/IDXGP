// Local mock for Cloudflare Pages Functions — standalone Node server
// Run: node scripts/mock-api.js
// Handles: /api/scan (stock data), /api/user/init, /api/groups

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8788;
const CACHE_FILE = path.join(__dirname, 'mock-closing-prices.json');
const DATA_DIR = path.join(__dirname, '..', 'mock-data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function getMarketState(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
  const parts = formatter.formatToParts(date);
  const getVal = (type) => parts.find(p => p.type === type)?.value || "";
  const weekday = getVal('weekday');
  if (weekday === 'Sat' || weekday === 'Sun') return 'closed';
  const minutes = parseInt(getVal('hour'), 10) * 60 + parseInt(getVal('minute'), 10);
  if (minutes >= 540 && minutes < 720) return 'open';
  if (minutes >= 720 && minutes < 810) return 'break';
  if (minutes >= 810 && minutes < 960) return 'open';
  return 'closed';
}

function cors(methods = 'POST, OPTIONS') {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': methods, 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id', 'Access-Control-Max-Age': '86400' };
}
function json(res, data, status = 200, extraHeaders = {}) {
  res.writeHead(status, { ...cors('GET, POST, DELETE, OPTIONS'), 'Content-Type': 'application/json', ...extraHeaders });
  res.end(JSON.stringify(data));
}

// ── In-memory D1 mock ──
const users = new Map();
const userGroups = new Map(); // userId -> { groups: [...], tickers: Map<gid, ticker[]> }
const PRESETS = [
  { id: '__all__', name: 'All Stocks', isPreset: true, order: -1, tickers: [] },
  { id: 'preset_banking', name: 'Banking', isPreset: true, order: 0, tickers: ['BBCA','BBRI','BMRI','BBNI','BRIS'] },
  { id: 'preset_tech', name: 'Technology', isPreset: true, order: 1, tickers: ['GOTO','BELI','DCII','MTEL','TOWR'] },
  { id: 'preset_energy', name: 'Energy', isPreset: true, order: 2, tickers: ['ADRO','ITMG','PTBA','INDY','ANTM'] },
  { id: 'preset_consumer', name: 'Consumer', isPreset: true, order: 3, tickers: ['UNVR','ICBP','MYOR','ASII','TLKM'] },
];

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
  });
}

// ── Route handlers ──

async function handleScan(req, res) {
  const data = await parseBody(req);
  if (!data || !Array.isArray(data.tickers)) return json(res, { error: 'Invalid ticker list' }, 400);

  const BASE_PRICES = {
    BBCA: 6300, BBRI: 2930, TLKM: 2850, ASII: 4620, UNVR: 2850,
    GOTO: 50, BMRI: 4160, ADRO: 2860, ITMG: 12950, BBNI: 3590,
    PTBA: 2760, BRIS: 2480, BELI: 142, INDY: 1850, ANTM: 1650,
    DCII: 7450, ICBP: 11200, MTEL: 768, TOWR: 1040, MYOR: 2480,
    COMPOSITE: 6185.78, LQ45: 608.58, IDX30: 308.20
  };
  const marketState = getMarketState();
  let transformed;

  if (marketState === 'open') {
    const mapR = v => typeof v !== 'number' ? 'neutral' : v >= 0.5 ? 'strong_buy' : v >= 0.1 ? 'buy' : v > -0.1 ? 'neutral' : v >= -0.5 ? 'sell' : 'strong_sell';
    transformed = data.tickers.map(t => {
      const base = BASE_PRICES[t] || 1000;
      const jitter = base * 0.015;
      const last = Math.round(base + (Math.random() * 2 - 1) * jitter);
      return { ticker: t, lastPrice: last, changePercent: ((last - base) / base) * 100, changeAbsolute: last - base, volume: Math.floor(Math.random() * 50000000), high: Math.round(base * 1.015), low: Math.round(base * 0.985), rating: mapR(Math.random() * 2 - 1) };
    });
    // Persist to cache file for closed hours
    try {
      let cacheData = {};
      if (fs.existsSync(CACHE_FILE)) { try { cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {} }
      transformed.forEach(item => { cacheData[item.ticker] = item; });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
    } catch {}
  } else {
    let cacheData = {};
    try { if (fs.existsSync(CACHE_FILE)) cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {}
    transformed = data.tickers.map(t => cacheData[t] || { ticker: t, lastPrice: BASE_PRICES[t] || 1000, changePercent: 0, changeAbsolute: 0, volume: 0, high: BASE_PRICES[t] || 1000, low: BASE_PRICES[t] || 1000, rating: 'neutral' });
  }

  json(res, { timestamp: new Date().toISOString(), marketStatus: marketState, cacheHit: false, data: transformed, errors: [] }, 200, { 'Cache-Control': 'public, max-age=3' });
}

async function handleUserInit(req, res) {
  if (req.method === 'OPTIONS') return json(res, {}, 200);
  if (req.method !== 'POST') return json(res, { error: 'Method Not Allowed' }, 405);
  const data = await parseBody(req);
  if (!data || !data.id || typeof data.id !== 'string' || data.id.length < 10) return json(res, { error: 'Invalid user id' }, 400);
  if (users.has(data.id)) return json(res, { user_id: data.id, created: false });
  users.set(data.id, { createdAt: new Date().toISOString() });
  json(res, { user_id: data.id, created: true }, 201);
}

async function handleGroups(req, res) {
  // CORS preflight handled at router level
  const userId = req.headers['x-user-id'];
  if (!userId || userId.length < 10) return json(res, { error: 'Missing or invalid X-User-Id header' }, 401);

  if (req.method === 'GET') {
    const data = userGroups.get(userId);
    if (!data) return json(res, { groups: [] });
    return json(res, { groups: data.groups.map(g => ({ ...g, tickers: data.tickers.get(g.id) || [] })) });
  }

  if (req.method === 'POST') {
    const body = await parseBody(req);
    if (!body || !Array.isArray(body.groups)) return json(res, { error: 'Invalid payload' }, 400);
    // Save full state (replace)
    const tickers = new Map();
    body.groups.forEach(g => { tickers.set(g.id, g.tickers || []); });
    userGroups.set(userId, { groups: body.groups, tickers });
    return json(res, { ok: true });
  }

  if (req.method === 'DELETE') {
    userGroups.delete(userId);
    return json(res, { ok: true });
  }

  return json(res, { error: 'Method Not Allowed' }, 405);
}

// ── Router ──
const server = http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, cors('GET, POST, DELETE, OPTIONS'));
    res.end();
    return;
  }

  if (url.startsWith('/api/scan') && method === 'POST') return handleScan(req, res);

  if (url === '/api/user/init') return handleUserInit(req, res);

  if (url === '/api/groups') return handleGroups(req, res);

  json(res, { error: 'Not Found' }, 404);
});

server.listen(PORT, 'localhost', () => console.log(`Mock API on http://localhost:${PORT}/api/scan + /api/user/init + /api/groups`));
