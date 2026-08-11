import { next } from '@vercel/edge';
import { verifySession, readCookie } from './lib/auth.js';

export const config = {
  matcher: ['/', '/index.html', '/hub.html', '/dashboard.html', '/api/state'],
};

export default async function middleware(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = readCookie(cookieHeader, 'arch_session');
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;

  if (!session) {
    const loginUrl = new URL('/login.html', request.url);
    loginUrl.searchParams.set('next', new URL(request.url).pathname);
    return Response.redirect(loginUrl, 302);
  }

  return next();
}
