import { kv } from '@vercel/kv';

// A separate write path for adding content programmatically (used by Claude
// sessions to publish drafted posts/polls/articles straight to the live
// dashboard without a code push). Protected by a static key, not the team's
// email-gated session, since this is meant to be called from outside a
// browser.
//
// Body: { type: 'sf' | 'md' | 'lf' | 'pl', items: [ {...}, {...} ] }
// sf = shortform, md = deep dive, lf = blog/article, pl = poll.
// Each item's shape should match the corresponding array in dashboard.html
// (e.g. sf items: { bucket, pillar, format, status, preview, image? }).

const STATE_KEY = 'archdash:state';
const TYPE_TO_STATE_KEY = { sf: 'custom_sf', md: 'custom_md', lf: 'custom_lf', pl: 'custom_pl' };

export default async function handler(req, res) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Missing or invalid admin key' });
  }

  if (req.method === 'GET') {
    // Convenience: lets you sanity-check what's currently in each custom bucket.
    const state = (await kv.get(STATE_KEY)) || {};
    const counts = {};
    for (const [type, stateKey] of Object.entries(TYPE_TO_STATE_KEY)) {
      try { counts[type] = JSON.parse(state[stateKey] || '[]').length; }
      catch { counts[type] = 0; }
    }
    return res.status(200).json({ counts });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  const { type, items } = body || {};
  const stateKey = TYPE_TO_STATE_KEY[type];
  if (!stateKey || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Body must be { type: "sf"|"md"|"lf"|"pl", items: [ {...}, ... ] }' });
  }

  const state = (await kv.get(STATE_KEY)) || {};
  let existing = [];
  try { existing = JSON.parse(state[stateKey] || '[]'); } catch { existing = []; }
  const merged = existing.concat(items);
  state[stateKey] = JSON.stringify(merged);
  await kv.set(STATE_KEY, state);

  return res.status(200).json({ ok: true, added: items.length, totalInBucket: merged.length });
}
