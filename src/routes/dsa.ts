import { Hono } from 'hono';
import { DSAController } from '../controllers/DSAController';
import { DSAService } from '../services/DSAService';
import { EmbeddingSearchService } from '../services/EmbeddingSearchService';
import { DSARepository } from '../repositories/DSARepository';
import { authMiddleware } from '../middleware/auth';

export function createDSARoutes() {
  const router = new Hono();
  const dsaRepository = new DSARepository();
  const dsaService = new DSAService(dsaRepository);
  const embeddingService = new EmbeddingSearchService(dsaRepository);
  const dsaController = new DSAController(dsaService, embeddingService);

  // Public routes
  router.get('/lists/public', (c) => dsaController.getPublicLists(c));

  // Protected routes
  router.post('/search/company', authMiddleware, (c) => dsaController.searchByCompany(c));
  router.post('/search/query', authMiddleware, (c) => dsaController.searchByQuery(c));
  router.post('/search/problems', authMiddleware, (c) => dsaController.searchProblems(c));
  router.get('/problems', authMiddleware, (c) => dsaController.getProblems(c));
  router.get('/problems/:id', authMiddleware, (c) => dsaController.getProblem(c));
  router.post('/lists', authMiddleware, (c) => dsaController.createList(c));
  router.get('/lists', authMiddleware, (c) => dsaController.getMyLists(c));
  router.get('/lists/:id', authMiddleware, (c) => dsaController.getList(c));
  router.put('/lists/:id', authMiddleware, (c) => dsaController.updateList(c));
  router.delete('/lists/:id', authMiddleware, (c) => dsaController.deleteList(c));
  router.post('/lists/:id/problems', authMiddleware, (c) => dsaController.addProblem(c));
  router.delete('/lists/:id/problems/:problemId', authMiddleware, (c) => dsaController.removeProblem(c));
  router.post('/lists/:id/problems/:problemId/toggle', authMiddleware, (c) => dsaController.toggleProblemStatus(c));

  return router;
}

