// Who can sign in to the Arch dashboard.
//
// Anyone with an email ending in `domain` is always allowed.
// Add one-off people (contractors, partners, KOLs you want in here) to `emails`
// below, then commit + push. Vercel redeploys automatically and the new
// person can sign in within a minute or two.

export const domain = '@arch.network';

export const emails = [
  // 'someone@example.com',
];

export function isAllowed(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith(domain.toLowerCase())) return true;
  return emails.map(e => e.toLowerCase()).includes(normalized);
}
