import { kv } from '../../lib/kv.js';
import { signSession } from '../../lib/auth.js';

export default async function handler(req, res) {
  const token = req.query.token;
  if (!token) {
    return res.redirect(302, '/login.html?error=missing_token');
  }

  const key = `magic:${token}`;
  const record = await kv.get(key);
  if (!record) {
    return res.redirect(302, '/login.html?error=invalid_or_expired');
  }
  await kv.del(key); // single use

  if (Date.now() > record.exp) {
    return res.redirect(302, '/login.html?error=expired');
  }

  const sessionPayload = {
    email: record.email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 day session
  };
  const sessionToken = await signSession(sessionPayload, process.env.SESSION_SECRET);

  res.setHeader(
    'Set-Cookie',
    `arch_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
  );
  return res.redirect(302, '/dashboard.html');
}
