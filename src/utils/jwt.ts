import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface AuthUser {
  userId: string;
  email: string;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, ENV.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, ENV.JWT_SECRET) as AuthUser;
}
