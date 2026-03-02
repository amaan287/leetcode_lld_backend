import { Hono } from 'hono';
import { DSAController } from '../controllers/DSAController';
import { DSAService } from '../services/DSAService';
import { DSARatingService } from '../services/DSARatingService';
import { EmbeddingSearchService } from '../services/EmbeddingSearchService';
import { DSARepository } from '../repositories/DSARepository';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

export function createDSARoutes() {
  const router = new Hono();
  const dsaRepository = new DSARepository();
  const ratingService = new DSARatingService();
  const dsaService = new DSAService(dsaRepository, ratingService);
  const embeddingService = new EmbeddingSearchService(dsaRepository);
  const dsaController = new DSAController(dsaService, embeddingService);

  // Public routes
  router.get('/lists/public', asyncHandler(dsaController.getPublicLists));

  // Protected routes
  router.post('/search/company', authMiddleware, asyncHandler(dsaController.searchByCompany));
  router.post('/search/query', authMiddleware, asyncHandler(dsaController.searchByQuery));
  router.post('/search/problems', authMiddleware, asyncHandler(dsaController.searchProblems));
  router.get('/problems', authMiddleware, asyncHandler(dsaController.getProblems));
  router.get('/problems/:id', authMiddleware, asyncHandler(dsaController.getProblem));
  router.post('/problems/:id/rate', authMiddleware, asyncHandler(dsaController.submitSolution));
  router.post('/problems/:id/check', authMiddleware, asyncHandler(dsaController.checkCode));
  router.post('/lists', authMiddleware, asyncHandler(dsaController.createList));
  router.get('/lists', authMiddleware, asyncHandler(dsaController.getMyLists));
  router.get('/lists/:id', authMiddleware, asyncHandler(dsaController.getList));
  router.put('/lists/:id', authMiddleware, asyncHandler(dsaController.updateList));
  router.delete('/lists/:id', authMiddleware, asyncHandler(dsaController.deleteList));
  router.post('/lists/:id/problems', authMiddleware, asyncHandler(dsaController.addProblem));
  router.delete('/lists/:id/problems/:problemId', authMiddleware, asyncHandler(dsaController.removeProblem));
  router.post('/lists/:id/problems/:problemId/toggle', authMiddleware, asyncHandler(dsaController.toggleProblemStatus));

  return router;
}
