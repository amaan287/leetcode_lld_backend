import { Hono } from 'hono';
import { LLDController } from '../controllers/LLDController';
import { LLDService } from '../services/LLDService';
import { LLDRatingService } from '../services/LLDRatingService';
import { LLDRepository } from '../repositories/LLDRepository';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

export function createLLDRoutes() {
  const router = new Hono();
  const lldRepository = new LLDRepository();
  const ratingService = new LLDRatingService(lldRepository);
  const lldService = new LLDService(lldRepository, ratingService);
  const lldController = new LLDController(lldService);

  // Public routes
  router.get('/questions', asyncHandler(lldController.getQuestions));
  router.get('/questions/:id', asyncHandler(lldController.getQuestion));

  // Protected routes
  router.post('/questions/:id/rate', authMiddleware, asyncHandler(lldController.submitAnswer));
  router.post('/questions/:id/check', authMiddleware, asyncHandler(lldController.checkCode));
  router.get('/answers', authMiddleware, asyncHandler(lldController.getMyAnswers));

  return router;
}
