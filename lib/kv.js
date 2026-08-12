// Vercel's native "KV" product was sunset (existing stores migrated to
// Upstash Redis in December 2024). New projects provision storage through
// the Vercel Marketplace instead, Upstash being the direct equivalent.
//
// The Marketplace integration injects vars under the old KV_* names
// (KV_REST_API_URL / KV_REST_API_TOKEN), not UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN that Redis.fromEnv() looks for, so we build the
// client explicitly instead of relying on fromEnv().
import { Redis } from '@upstash/redis';

export const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
