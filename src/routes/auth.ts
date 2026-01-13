import { Hono } from 'hono';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';

export function createAuthRoutes() {
  const router = new Hono();
  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  router.post('/register', (c) => authController.register(c));
  router.post('/login', (c) => authController.login(c));
  router.post('/google', (c) => authController.googleAuth(c));

  return router;
}

