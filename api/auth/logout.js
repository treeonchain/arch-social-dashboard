export default async function handler(req, res) {
  res.setHeader('Set-Cookie', 'arch_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return res.redirect(302, '/login.html');
}
