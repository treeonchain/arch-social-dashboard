import { kv } from '../../lib/kv.js';
import { Resend } from 'resend';
import { isAllowed } from '../../config/allowlist.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const email = (body?.email || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  // Always respond the same way whether or not the email is allowed,
  // so this endpoint can't be used to probe who has access.
  if (!isAllowed(email)) {
    return res.status(200).json({ ok: true });
  }

  // Light cooldown so one address can't trigger a flood of emails.
  const cooldownKey = `cooldown:${email}`;
  const onCooldown = await kv.get(cooldownKey);
  if (onCooldown) {
    return res.status(200).json({ ok: true });
  }
  await kv.set(cooldownKey, true, { ex: 60 });

  const token = crypto.randomUUID();
  const exp = Date.now() + 15 * 60 * 1000; // 15 minutes
  await kv.set(`magic:${token}`, { email, exp }, { ex: 15 * 60 });

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const link = `${protocol}://${host}/api/auth/verify?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, cannot send magic link email. Link:', link);
    return res.status(200).json({ ok: true, debug: 'no_api_key' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const result = await resend.emails.send({
      from: process.env.MAGIC_LINK_FROM || 'Arch Dashboard <onboarding@resend.dev>',
      to: email,
      subject: 'Sign in to the Arch dashboard',
      html: `
        <p>Click below to sign in to the Arch content dashboard.</p>
        <p><a href="${link}">Sign in</a></p>
        <p style="color:#8a8672;font-size:12px;">This link expires in 15 minutes and works once. If you didn't request it, ignore this email.</p>
      `,
    });
    console.log('Resend send result:', JSON.stringify(result));
    if (result?.error) {
      console.error('Resend returned an error:', JSON.stringify(result.error));
      return res.status(200).json({ ok: true, debug: 'resend_error', detail: result.error });
    }
  } catch (err) {
    console.error('Resend send threw:', err?.message || err);
    return res.status(200).json({ ok: true, debug: 'resend_threw', detail: err?.message });
  }

  return res.status(200).json({ ok: true, debug: 'sent' });
}
