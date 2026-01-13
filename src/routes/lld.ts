import { Hono } from 'hono';
import { LLDController } from '../controllers/LLDController';
import { LLDService } from '../services/LLDService';
import { LLDRatingService } from '../services/LLDRatingService';
import { LLDRepository } from '../repositories/LLDRepository';
import { authMiddleware } from '../middleware/auth';

export function createLLDRoutes() {
  const router = new Hono();
  const lldRepository = new LLDRepository();
  const ratingService = new LLDRatingService(lldRepository);
  const lldService = new LLDService(lldRepository, ratingService);
  const lldController = new LLDController(lldService);

  // Public routes
  router.get('/questions', (c) => lldController.getQuestions(c));
  router.get('/questions/:id', (c) => lldController.getQuestion(c));

  // Protected routes
  router.post('/questions/:id/rate', authMiddleware, (c) => lldController.submitAnswer(c));
  router.get('/answers', authMiddleware, (c) => lldController.getMyAnswers(c));

  return router;
}

