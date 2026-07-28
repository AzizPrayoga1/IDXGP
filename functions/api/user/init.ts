// POST /api/user/init — create anonymous user, return user_id
export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  if (request.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    const db = env.DB;
    const { id } = await request.json();
    if (!id || typeof id !== 'string' || id.length < 10)
      return json({ error: 'Invalid user id' }, 400, corsHeaders);

    // Check if user exists
    const existing = await db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (existing)
      return json({ user_id: id, created: false }, 200, corsHeaders);

    await db.prepare('INSERT INTO users (id) VALUES (?)').bind(id).run();
    return json({ user_id: id, created: true }, 201, corsHeaders);
  } catch (error) {
    console.error('User init error:', error);
    return json({ error: 'Internal server error' }, 500, corsHeaders);
  }
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
