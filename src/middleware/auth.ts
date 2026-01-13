import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env';
import { AppError } from '../utils/errors';

export interface AuthUser {
  userId: string;
  email: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'Unauthorized', 'MISSING_TOKEN');
  }

  const token = authHeader.substring(7);
  const env = getEnv();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    c.set('user', decoded);
    await next();
  } catch (error) {
    throw new AppError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }
}

