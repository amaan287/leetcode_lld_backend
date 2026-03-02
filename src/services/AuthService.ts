import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { UserRepository } from '../repositories/UserRepository';
import type { User } from '../models/User';
import { AppError } from '../utils/errors';
import { generateToken, type AuthUser } from '../utils/jwt';
import { ENV } from '../config/env';

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  private googleClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);

  async register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(400, 'User already exists', 'USER_EXISTS');
    }

    const rounds = parseInt(ENV.BCRYPT_ROUNDS, 10);
    const hashedPassword = await bcrypt.hash(password, rounds);
    const user = await this.userRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    const token = generateToken({ userId: user._id!.toString(), email: user.email });
    return { user, token };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.password) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const token = generateToken({ userId: user._id!.toString(), email: user.email });
    return { user, token };
  }

  async loginWithGoogle(idToken: string): Promise<{ user: User; token: string }> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: ENV.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      throw new AppError(401, 'Invalid Google token', 'INVALID_GOOGLE_TOKEN');
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || '';

    let user = await this.userRepository.findByGoogleId(googleId);

    if (!user) {
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        const updatedUser = await this.userRepository.update(existingUser._id!, { googleId });
        if (!updatedUser) {
          throw new AppError(500, 'Failed to link Google account', 'UPDATE_FAILED');
        }
        user = updatedUser;
      } else {
        user = await this.userRepository.create({
          email,
          name,
          googleId,
        });
      }
    }

    const token = generateToken({ userId: user._id!.toString(), email: user.email });
    return { user, token };
  }
}
