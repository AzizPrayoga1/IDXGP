// /api/groups — CRUD for user groups
// GET    → list all groups + tickers for user
// POST   → save full groups state (upsert)
// DELETE → reset user groups to defaults

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
  };

  if (request.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });

  const userId = request.headers.get('X-User-Id');
  if (!userId || userId.length < 10)
    return json({ error: 'Missing or invalid X-User-Id header' }, 401, corsHeaders);

  try {
    const db = env.DB;

    switch (request.method) {
      case 'GET':
        return handleGet(db, userId, corsHeaders);
      case 'POST':
        return handlePost(db, userId, request, corsHeaders);
      case 'DELETE':
        return handleDelete(db, userId, corsHeaders);
      default:
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }
  } catch (error) {
    console.error('Groups error:', error);
    return json({ error: 'Internal server error' }, 500, corsHeaders);
  }
}

async function handleGet(db, userId, corsHeaders) {
  const gs = await db.prepare(
    'SELECT id, name, is_preset, sort_order FROM groups WHERE user_id = ? ORDER BY sort_order ASC'
  ).bind(userId).all();

  if (gs.results.length === 0) {
    return json({ groups: [] }, 200, corsHeaders);
  }

  // Batch fetch tickers for all groups
  const groupIds = gs.results.map(g => g.id);
  const placeholders = groupIds.map(() => '?').join(',');
  const tickers = await db.prepare(
    `SELECT group_id, ticker, sort_order FROM group_tickers WHERE group_id IN (${placeholders}) ORDER BY sort_order ASC`
  ).bind(...groupIds).all();

  // Map tickers to groups
  const tickerMap = {};
  for (const t of tickers.results) {
    if (!tickerMap[t.group_id]) tickerMap[t.group_id] = [];
    tickerMap[t.group_id].push(t.ticker);
  }

  const groups = gs.results.map(g => ({
    id: g.id,
    name: g.name,
    isPreset: !!g.is_preset,
    order: g.sort_order,
    tickers: tickerMap[g.id] || [],
  }));

  return json({ groups }, 200, corsHeaders);
}

async function handlePost(db, userId, request, corsHeaders) {
  const body = await request.json();
  if (!Array.isArray(body.groups))
    return json({ error: 'Invalid payload: groups array required' }, 400, corsHeaders);

  // Upsert: delete all existing groups for user, then insert new ones
  // Use transaction for atomicity
  const deleteTickers = db.prepare('DELETE FROM group_tickers WHERE group_id IN (SELECT id FROM groups WHERE user_id = ?)');
  const deleteGroups = db.prepare('DELETE FROM groups WHERE user_id = ?');

  await db.batch([deleteTickers, deleteGroups]);

  const insertGroup = db.prepare('INSERT INTO groups (id, user_id, name, is_preset, sort_order) VALUES (?, ?, ?, ?, ?)');
  const insertTicker = db.prepare('INSERT INTO group_tickers (id, group_id, ticker, sort_order) VALUES (?, ?, ?, ?)');

  const stmts = [];
  for (const g of body.groups) {
    stmts.push(insertGroup.bind(g.id, userId, g.name, g.isPreset ? 1 : 0, g.order ?? 0));
    if (Array.isArray(g.tickers)) {
      g.tickers.forEach((t, i) => {
        stmts.push(insertTicker.bind(`${g.id}_${t}`, g.id, t, i));
      });
    }
  }

  await db.batch(stmts);
  return json({ ok: true }, 200, corsHeaders);
}

async function handleDelete(db, userId, corsHeaders) {
  const deleteTickers = db.prepare('DELETE FROM group_tickers WHERE group_id IN (SELECT id FROM groups WHERE user_id = ?)');
  const deleteGroups = db.prepare('DELETE FROM groups WHERE user_id = ?');
  await db.batch([deleteTickers, deleteGroups]);
  return json({ ok: true }, 200, corsHeaders);
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
