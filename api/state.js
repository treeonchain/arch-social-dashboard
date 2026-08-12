import { kv } from '../lib/kv.js';
import { verifySession, readCookie } from '../lib/auth.js';

const STATE_KEY = 'archdash:state';

export default async function handler(req, res) {
  // Belt-and-suspenders: middleware already gates this route, but verify
  // the session here too in case the route is ever hit directly.
  // Same temporary kill switch as middleware.js — see the note there.
  if (process.env.DISABLE_AUTH !== 'true') {
    const token = readCookie(req.headers.cookie || '', 'arch_session');
    const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
    if (!session) {
      return res.status(401).json({ error: 'Not signed in' });
    }
  }

  if (req.method === 'GET') {
    const state = (await kv.get(STATE_KEY)) || {};
    return res.status(200).json(state);
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    }
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid state payload' });
    }
    await kv.set(STATE_KEY, body);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
