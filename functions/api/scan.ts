// Cloudflare Pages Function — replaces standalone Worker
// Deploys together with frontend as one unit

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
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || "";

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

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://idx-dashboard.pages.dev',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  if (request.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });

  if (request.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    // Enforce request body size limit (10KB)
    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (contentLength > 10240)
      return json({ error: 'Request body too large' }, 413, corsHeaders);

    const body = await request.json();

    // --- Validation ---
    if (!Array.isArray(body.tickers) || body.tickers.length === 0)
      return json({ error: 'Invalid ticker list' }, 400, corsHeaders);
    if (body.tickers.length > 100)
      return json({ error: 'Ticker list exceeds maximum of 100' }, 400, corsHeaders);

    const tickerRegex = /^[A-Z]{4}$/;
    for (const t of body.tickers) {
      if (!tickerRegex.test(t))
        return json({ error: `Invalid ticker: ${t}` }, 400, corsHeaders);
    }

    const validColumns = ['close', 'change', 'change_abs', 'volume', 'high', 'low', 'Recommend.All'];
    if (!body.columns || !Array.isArray(body.columns))
      return json({ error: 'Invalid columns' }, 400, corsHeaders);
    for (const c of body.columns) {
      if (!validColumns.includes(c))
        return json({ error: `Invalid column: ${c}` }, 400, corsHeaders);
    }

    // --- Edge Cache ---
    const sorted = [...body.tickers].sort().join(',');
    const cacheKey = new Request(`${url.origin}/api/scan/${sorted}`, request);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      const res = new Response(cached.body, { status: cached.status, headers: cached.headers });
      res.headers.set('X-Cache', 'HIT');
      return res;
    }

    // --- Forward to TradingView Scanner API ---
    const tvResp = await fetch('https://scanner.tradingview.com/indonesia/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://idx-dashboard.pages.dev',
      },
      body: JSON.stringify({
        filter: [{ left: 'name', operation: 'in_range', right: body.tickers.map(t => `IDX:${t}`) }],
        columns: body.columns,
        sort: { sortBy: 'name', sortOrder: 'asc' },
        range: [0, Math.min(body.tickers.length, 100)],
      }),
    });

    if (!tvResp.ok) {
      const errText = await tvResp.text();
      console.error('TradingView upstream error:', tvResp.status, errText);
      return json({ error: 'External scanner unavailable' }, tvResp.status, corsHeaders);
    }

    const raw = await tvResp.json();

    // --- Transform ---
    const transformed = (raw.data || []).map(item => {
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
        rating: mapRating(d[6]),
      };
    });

    const responseBody = {
      timestamp: new Date().toISOString(),
      marketStatus: getMarketState(),
      cacheHit: false,
      data: transformed,
      errors: [],
    };

    const responseHeaders = new Headers({
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' fonts.googleapis.com; font-src fonts.gstatic.com; connect-src 'self'; img-src 'self' data:;",
      'X-Cache': 'MISS',
    });

    const response = new Response(JSON.stringify(responseBody), { status: 200, headers: responseHeaders });

    // Store in edge cache (fire-and-forget)
    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal server error' }, 500, corsHeaders);
  }
}

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' fonts.googleapis.com; font-src fonts.gstatic.com; connect-src 'self'; img-src 'self' data:;" },
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
