// POST /api/auth/verify — verify password, return session token
import { sha256 } from '../user/init';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const allowedOrigin = env.ORIGIN || 'https://idxgp.pages.dev';
  const corsOrigin = origin === allowedOrigin ? origin : allowedOrigin;
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' fonts.googleapis.com; font-src fonts.gstatic.com; connect-src 'self'; img-src 'self' data:;",
  };

  if (request.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    const db = env.DB;
    const { id, pin } = await request.json();
    if (typeof id !== 'string' || id.length < 10 || typeof pin !== 'string' || pin.length < 8) return json({ error: 'Missing id or pin' }, 400, corsHeaders);

    // Rate limiting: block IP after 5 failed attempts in 60s
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const now = Math.floor(Date.now() / 1000);
    // Purge entries older than 15 minutes
    await db.prepare('DELETE FROM login_attempts WHERE ts < ?').bind(now - 900).run();
    const ipRow = await db.prepare(
      'SELECT COUNT(*) as cnt FROM login_attempts WHERE ip = ? AND ts > ? AND endpoint = ? AND success = 0'
    ).bind(ip, now - 60, 'verify').first();
    if (ipRow.cnt >= 5) {
      return json({ error: 'Too many attempts. Try again later.' }, 429, corsHeaders);
    }

    // Rate limit per user: 5 failed attempts in 900s (15 min)
    const userRow = await db.prepare(
      'SELECT COUNT(*) as cnt FROM login_attempts WHERE user_id = ? AND ts > ? AND endpoint = ? AND success = 0'
    ).bind(id, now - 900, 'verify').first();
    if (userRow.cnt >= 5) {
      return json({ error: 'Too many attempts. Try again later.' }, 429, corsHeaders);
    }

    const user = await db.prepare('SELECT pin_hash, pin_salt FROM users WHERE id = ?').bind(id).first();
    if (!user) {
      await db.prepare('INSERT INTO login_attempts (user_id, ip, endpoint, ts, success) VALUES (?, ?, ?, ?, 0)').bind(id, ip, 'verify', now).run();
      return json({ error: 'Invalid credentials' }, 401, corsHeaders);
    }

    const pinHash = await sha256((user.pin_salt || '') + pin);
    if (pinHash !== user.pin_hash) {
      await db.prepare('INSERT INTO login_attempts (user_id, ip, endpoint, ts, success) VALUES (?, ?, ?, ?, 0)').bind(id, ip, 'verify', now).run();
      return json({ error: 'Invalid credentials' }, 401, corsHeaders);
    }

    // Clear failed attempts on success
    await db.prepare('DELETE FROM login_attempts WHERE user_id = ? AND endpoint = ?').bind(id, 'verify').run();

    // Issue session token with 24h expiry
    const token = generateToken();
    const expiresAt = now + 86400;
    await db.prepare('UPDATE users SET token = ?, token_expires_at = ? WHERE id = ?').bind(token, expiresAt, id).run();

    return json({ user_id: id, ok: true, token, expires_at: expiresAt }, 200, corsHeaders);
  } catch (error) {
    console.error('Auth verify error:', error);
    return json({ error: 'Internal server error' }, 500, corsHeaders);
  }
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
