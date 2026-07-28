// Rate-limit helper: per-user-id brute-force protection via D1
// Max 5 failed attempts per 15 min window per user_id

export async function checkRateLimit(db, userId) {
  const row = await db.prepare(
    `SELECT COUNT(*) as cnt FROM login_attempts
     WHERE user_id = ? AND success = 0
     AND attempt_at > datetime('now', '-15 minutes')`
  ).bind(userId).first();

  const attempts = row?.cnt ?? 0;
  const maxAttempts = 5;

  return {
    blocked: attempts >= maxAttempts,
    remaining: Math.max(0, maxAttempts - attempts),
  };
}

export async function recordAttempt(db, userId, success) {
  await db.prepare(
    'INSERT INTO login_attempts (user_id, success) VALUES (?, ?)'
  ).bind(userId, success ? 1 : 0).run();
}

export async function clearAttempts(db, userId) {
  await db.prepare('DELETE FROM login_attempts WHERE user_id = ?').bind(userId).run();
}
