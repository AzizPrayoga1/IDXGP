// Cloudflare Pages Function + Scheduled Trigger Support
// Cron Trigger Schedule: "0 5 * * *" (12:00 Siang WIB)

import { getCorporateActionsByTickers } from '../../src/lib/corporate-action.data';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://idx-dashboard.pages.dev',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Manual Trigger Endpoint untuk mereload cache secara manual atau via external Cron
  const isSyncEndpoint = url.pathname.endsWith('/sync');

  try {
    let tickers: string[] = [];
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (Array.isArray(body.tickers)) tickers = body.tickers;
    } else {
      const q = url.searchParams.get('tickers');
      if (q) tickers = q.split(',').map(s => s.trim());
    }

    // Edge Cache Match
    const cacheKey = new Request(`${url.origin}/api/events/cached-daily`, request);
    const cache = caches.default;

    if (!isSyncEndpoint) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const res = new Response(cached.body, { status: cached.status, headers: cached.headers });
        res.headers.set('X-Cache', 'HIT');
        return res;
      }
    }

    // Fetch Corporate Actions Data
    const events = getCorporateActionsByTickers(tickers);
    const payload = {
      timestamp: new Date().toISOString(),
      updatedAtWIB: new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
      scheduledRun: '12:00 WIB (05:00 UTC)',
      events
    };

    const response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400', // Cache 24 jam (Hingga jam 12 besok)
        'X-Cache': 'MISS',
      }
    });

    // Simpan ke Edge Cache selama 24 jam
    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch corporate events' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Scheduled Function Event Handler untuk Cron Trigger Cloudflare Worker / Pages
export async function onScheduled(event, env, ctx) {
  try {
    console.log(`[Cron Executed 12:00 WIB] Updating Corporate Actions Cache...`);
    const mockTickers = ['BBCA', 'BBRI', 'TLKM', 'ASII', 'BMRI', 'ICBP', 'ITMG', 'GOTO'];
    const events = getCorporateActionsByTickers(mockTickers);
    const payload = {
      timestamp: new Date(event.scheduledTime).toISOString(),
      updatedAtWIB: new Date(event.scheduledTime).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
      scheduledRun: '12:00 WIB (05:00 UTC)',
      events
    };

    const cacheKey = new Request(`https://idx-dashboard.pages.dev/api/events/cached-daily`);
    const cache = caches.default;
    const response = new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'HIT-CRON-12PM'
      }
    });

    ctx.waitUntil(cache.put(cacheKey, response));
  } catch (err) {
    console.error('Cron scheduled update failed:', err);
  }
}
