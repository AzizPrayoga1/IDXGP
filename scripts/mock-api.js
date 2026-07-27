// Local mock for Pages Function /api/scan — standalone Node server
// Run: node scripts/mock-api.js

const http = require('http');

function getMarketState(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getVal = (type) => parts.find(p => p.type === type)?.value || "";

  const weekday = getVal('weekday');
  if (weekday === 'Sat' || weekday === 'Sun') {
    return 'closed';
  }

  const hour = parseInt(getVal('hour'), 10);
  const minute = parseInt(getVal('minute'), 10);

  const minutes = hour * 60 + minute;

  // Sesi 1: 09:00 - 12:00 WIB (540m - 720m)
  // Break: 12:00 - 13:30 WIB (720m - 810m)
  // Sesi 2: 13:30 - 16:00 WIB (810m - 960m)
  if (minutes >= 540 && minutes < 720) return 'open';
  if (minutes >= 720 && minutes < 810) return 'break';
  if (minutes >= 810 && minutes < 960) return 'open';

  return 'closed';
}

const server = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };

  if (req.method === 'OPTIONS') { res.writeHead(200, cors); res.end(); return; }
  if (req.method !== 'POST' || !req.url.startsWith('/api/scan')) {
    res.writeHead(404, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' })); return;
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      if (!Array.isArray(data.tickers)) throw new Error('Invalid');
      const raw = { totalCount: data.tickers.length, data: data.tickers.map((t, i) => ({
        s: `IDX:${t}`,
        d: [5000 + (i * 10 + Math.floor(Math.random() * 50)), (Math.random() * 10 - 5), (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 200), Math.floor(Math.random() * 50000000), 5200 + Math.floor(Math.random() * 300), 4900 + Math.floor(Math.random() * 200), Math.random() * 2 - 1],
      }))};
      const mapR = v => typeof v !== 'number' ? 'neutral' : v >= 0.5 ? 'strong_buy' : v >= 0.1 ? 'buy' : v > -0.1 ? 'neutral' : v >= -0.5 ? 'sell' : 'strong_sell';
      const transformed = raw.data.map(item => { const d = item.d || []; return { ticker: (item.s || '').replace(/^IDX:/, ''), lastPrice: d[0], changePercent: d[1], changeAbsolute: d[2], volume: d[3], high: d[4], low: d[5], rating: mapR(d[6]) }; });
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3' });
      res.end(JSON.stringify({ timestamp: new Date().toISOString(), marketStatus: getMarketState(), cacheHit: false, data: transformed, errors: [] }));
    } catch { res.writeHead(400, { ...cors, 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid JSON' })); }
  });
});

server.listen(8788, 'localhost', () => console.log('Mock API on http://localhost:8788/api/scan'));
