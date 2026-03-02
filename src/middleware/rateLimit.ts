import type { Context, Next } from 'hono';

type Entry = { count: number; expires: number };

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

const store = new Map<string, Entry>();

export async function rateLimit(c: Context, next: Next) {
  const ip = c.req.header('x-forwarded-for') || c.req.raw.headers.get('host') || 'unknown';
  const now = Date.now();

  const entry = store.get(ip);

  if (!entry || entry.expires < now) {
    store.set(ip, { count: 1, expires: now + WINDOW_MS });
  } else {
    if (entry.count >= MAX_REQUESTS) {
      return c.json({ error: 'Too many requests' }, 429);
    }
    entry.count += 1;
  }

  await next();
}
