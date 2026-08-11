// Small, dependency-free session signing helpers. Uses Web Crypto only so the
// exact same code runs in both the Edge middleware and the Node API routes.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes) {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let str = '';
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSession(payload, secret) {
  if (!secret) throw new Error('SESSION_SECRET is not set');
  const key = await getKey(secret);
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `${body}.${toBase64Url(sigBuf)}`;
}

export async function verifySession(token, secret) {
  if (!secret || !token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  try {
    const key = await getKey(secret);
    const expectedSigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSig = toBase64Url(expectedSigBuf);
    if (expectedSig !== sig) return null;
    const payload = JSON.parse(decoder.decode(fromBase64Url(body)));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
