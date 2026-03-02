import { Hono } from 'hono';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { asyncHandler } from '../middleware/asyncHandler';

export function createAuthRoutes() {
  const router = new Hono();
  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  router.post('/register', asyncHandler(authController.register));
  router.post('/login', asyncHandler(authController.login));
  router.post('/google', asyncHandler(authController.googleAuth));

  return router;
}
