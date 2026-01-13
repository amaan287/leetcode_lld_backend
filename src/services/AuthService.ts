import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/UserRepository';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import { generateToken, AuthUser } from '../utils/jwt';

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(400, 'User already exists', 'USER_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
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

  async loginWithGoogle(googleId: string, email: string, name: string): Promise<{ user: User; token: string }> {
    let user = await this.userRepository.findByGoogleId(googleId);
    
    if (!user) {
      // Check if user exists with email but no Google ID
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        // Link Google account
        user = await this.userRepository.update(existingUser._id!, { googleId });
      } else {
        // Create new user
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

