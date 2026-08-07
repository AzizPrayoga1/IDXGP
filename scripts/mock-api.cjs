// Local mock for Cloudflare Pages Functions — standalone Node server
// Handles: /api/scan (proxies to real TradingView Scanner API), /api/user/init, /api/auth/verify, /api/groups (password-protected)

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8788;
const CACHE_FILE = path.join(__dirname, 'mock-closing-prices.json');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getMarketState() {
  return 'open';
}

function cors(methods = 'POST, OPTIONS') {
  return {
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(res, data, status = 200, extraHeaders = {}) {
  res.writeHead(status, { ...cors('GET, POST, DELETE, OPTIONS'), 'Content-Type': 'application/json', ...extraHeaders });
  res.end(JSON.stringify(data));
}

// ── In-memory D1 mock ──
const users = new Map();
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function tokenRequired(req, res) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) { json(res, { error: 'Authorization header required' }, 401); return null; }
  const token = auth.slice(7);
  const userId = req.headers['x-user-id'];
  const user = users.get(userId);
  if (!user) { json(res, { error: 'User not found' }, 404); return null; }
  if (!user.token || user.token !== token) { json(res, { error: 'Invalid token' }, 401); return null; }
  if (user.tokenExpiresAt < Math.floor(Date.now() / 1000)) { json(res, { error: 'Token expired' }, 401); return null; }
  return userId;
}

const userGroups = new Map();

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > 1e6) { req.destroy(); reject(new Error('Payload too large')); }
    });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
  });
}

function mapRating(value) {
  if (typeof value !== 'number') return 'neutral';
  if (value >= 0.5) return 'strong_buy';
  if (value >= 0.1) return 'buy';
  if (value > -0.1) return 'neutral';
  if (value >= -0.5) return 'sell';
  return 'strong_sell';
}

function fetchTradingView(tickers, columns) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      filter: [{ left: 'name', operation: 'in_range', right: tickers }],
      columns: columns || ['close', 'change', 'change_abs', 'volume', 'high', 'low', 'Recommend.All'],
      sort: { sortBy: 'name', sortOrder: 'asc' },
      range: [0, Math.min(tickers.length, 100)]
    });

    const req = https.request('https://scanner.tradingview.com/indonesia/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://idx-dashboard.pages.dev',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        } else {
          reject(new Error(`TradingView HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Route handlers ──

async function handleScan(req, res) {
  const data = await parseBody(req);
  if (!data || !Array.isArray(data.tickers)) return json(res, { error: 'Invalid ticker list' }, 400);

  const tickerRegex = /^[A-Z]{4}$/;
  const validTickers = data.tickers.filter(t => tickerRegex.test(t));

  try {
    const tvRaw = await fetchTradingView(validTickers, data.columns);
    const transformed = (tvRaw.data || []).map(item => {
      const d = item.d || [];
      const ticker = (item.s || '').replace(/^IDX:/, '');
      return {
        ticker,
        lastPrice: d[0] ?? null,
        changePercent: d[1] ?? null,
        changeAbsolute: d[2] ?? null,
        volume: d[3] ?? null,
        high: d[4] ?? null,
        low: d[5] ?? null,
        rating: mapRating(d[6])
      };
    });

    // Save real prices to cache file
    try {
      let cacheData = {};
      if (fs.existsSync(CACHE_FILE)) { try { cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {} }
      transformed.forEach(item => { cacheData[item.ticker] = item; });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
    } catch {}

    json(res, { timestamp: new Date().toISOString(), marketStatus: 'open', cacheHit: false, data: transformed, errors: [] }, 200, { 'Cache-Control': 'public, max-age=3' });
  } catch (err) {
    console.error('TradingView fetch failed, using fallback cache:', err.message);
    let cacheData = {};
    try { if (fs.existsSync(CACHE_FILE)) cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {}
    const transformed = validTickers.map(t => cacheData[t] || { ticker: t, lastPrice: 1000, changePercent: 0, changeAbsolute: 0, volume: 0, high: 1000, low: 1000, rating: 'neutral' });
    json(res, { timestamp: new Date().toISOString(), marketStatus: 'open', cacheHit: true, data: transformed, errors: [] }, 200);
  }
}

async function handleUserInit(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Method Not Allowed' }, 405);
  const data = await parseBody(req);
  if (!data || !data.id || typeof data.id !== 'string' || data.id.length < 10) return json(res, { error: 'Invalid user id' }, 400);
  if (!data.pin || data.pin.length < 8 || data.pin.length > 64) return json(res, { error: 'Password must be 8-64 characters' }, 400);
  if (!/[a-zA-Z]/.test(data.pin) || !/[0-9]/.test(data.pin)) return json(res, { error: 'Password must contain at least one letter and one digit' }, 400);
  if (users.has(data.id)) return json(res, { user_id: data.id, created: false, pinSet: true });
  const token = generateToken();
  const expiresAt = Math.floor(Date.now() / 1000) + 86400;
  const salt = crypto.randomBytes(16).toString('hex');
  users.set(data.id, { pinHash: sha256(salt + data.pin), salt, createdAt: new Date().toISOString(), token, tokenExpiresAt: expiresAt });
  json(res, { user_id: data.id, created: true, token, expires_at: expiresAt }, 201);
}

async function handleAuthVerify(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Method Not Allowed' }, 405);
  const data = await parseBody(req);
  if (!data || !data.id || !data.pin) return json(res, { error: 'Missing id or pin' }, 400);
  const user = users.get(data.id);
  if (!user) return json(res, { error: 'User not found' }, 404);
  const pinHash = sha256((user.salt || '') + data.pin);
  if (pinHash !== user.pinHash) return json(res, { error: 'Wrong PIN' }, 401);
  const token = generateToken();
  const expiresAt = Math.floor(Date.now() / 1000) + 86400;
  user.token = token;
  user.tokenExpiresAt = expiresAt;
  json(res, { user_id: data.id, ok: true, token, expires_at: expiresAt });
}

async function handleGroups(req, res) {
  const userId = tokenRequired(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const data = userGroups.get(userId);
    if (!data) return json(res, { groups: [] });
    return json(res, { groups: data.groups.map(g => ({ ...g, tickers: data.tickers.get(g.id) || [] })) });
  }
  if (req.method === 'POST') {
    const body = await parseBody(req);
    if (!body || !Array.isArray(body.groups)) return json(res, { error: 'Invalid payload' }, 400);
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
  if (req.method === 'OPTIONS') {
    res.writeHead(200, cors('GET, POST, DELETE, OPTIONS'));
    res.end();
    return;
  }
  if (req.url.startsWith('/api/scan') && req.method === 'POST') return handleScan(req, res);
  if (req.url === '/api/user/init') return handleUserInit(req, res);
  if (req.url === '/api/auth/verify') return handleAuthVerify(req, res);
  if (req.url === '/api/groups') return handleGroups(req, res);
  json(res, { error: 'Not Found' }, 404);
});

server.listen(PORT, 'localhost', () => console.log(`Mock API on http://localhost:${PORT}/api/scan (TradingView Live)`));
