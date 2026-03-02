import type { Context, Next } from 'hono';
import { randomUUID } from 'crypto';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}

export async function requestId(c: Context, next: Next) {
  const id = randomUUID();
  c.set('requestId', id);
  c.header('X-Request-Id', id);
  await next();
}
