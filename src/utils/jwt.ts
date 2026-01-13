import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env';
import { AuthUser } from '../middleware/auth';

export function generateToken(user: AuthUser): string {
  const env = getEnv();
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser {
  const env = getEnv();
  return jwt.verify(token, env.JWT_SECRET) as AuthUser;
}

