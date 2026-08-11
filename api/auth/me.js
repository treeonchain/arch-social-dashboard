import { verifySession, readCookie } from '../../lib/auth.js';

export default async function handler(req, res) {
  const token = readCookie(req.headers.cookie || '', 'arch_session');
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  return res.status(200).json({ email: session.email });
}
