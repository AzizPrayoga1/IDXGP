// POST /api/user/init — create user with password, return session token
export async function onRequest(context) {
	const { request, env } = context;
	const allowedOrigin = env.ALLOWED_ORIGIN || 'https://idxgp.pages.dev';
	const corsHeaders = {
		'Access-Control-Allow-Origin': allowedOrigin,
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
		if (!id || typeof id !== 'string' || id.length < 10)
			return json({ error: 'Invalid user id' }, 400, corsHeaders);
		if (!pin || typeof pin !== 'string' || pin.length < 8 || pin.length > 64)
			return json({ error: 'Password must be 8-64 characters' }, 400, corsHeaders);
		// Require mixed charset: at least one letter and one digit
		if (!/[a-zA-Z]/.test(pin) || !/[0-9]/.test(pin))
			return json({ error: 'Password must contain at least one letter and one digit' }, 400, corsHeaders);

		const existing = await db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
		if (!existing) {
			const saltBytes = new Uint8Array(16);
			crypto.getRandomValues(saltBytes);
			const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
			const pinHash = await sha256(salt + pin);
			const token = generateToken();
			const expiresAt = Math.floor(Date.now() / 1000) + 86400;
			await db.prepare('INSERT INTO users (id, pin_hash, pin_salt, token, token_expires_at) VALUES (?, ?, ?, ?, ?)').bind(id, pinHash, salt, token, expiresAt).run();
			return json({ user_id: id, ok: true, token, expires_at: expiresAt }, 201, corsHeaders);
		}

		return json({ user_id: id, ok: true, token: null }, 200, corsHeaders);
	} catch (error) {
		console.error('User init error:', error);
		return json({ error: 'Internal server error' }, 500, corsHeaders);
	}
}

export async function sha256(data) {
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
