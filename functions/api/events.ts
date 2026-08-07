import { getCorporateActionsByTickers } from '../../src/lib/corporate-action.data';

export async function onRequest(context) {
  const { request } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://idx-dashboard.pages.dev',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    let tickers: string[] = [];
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (Array.isArray(body.tickers)) tickers = body.tickers;
    } else {
      const url = new URL(request.url);
      const q = url.searchParams.get('tickers');
      if (q) tickers = q.split(',').map(s => s.trim());
    }

    const events = getCorporateActionsByTickers(tickers);
    return new Response(JSON.stringify({ timestamp: new Date().toISOString(), events }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch corporate events' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
