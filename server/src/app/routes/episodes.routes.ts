import { Router } from 'express';
import type { EpisodesController } from '../controllers/episodes.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { generalRateLimiter, writeRateLimiter } from '../../middlewares/rate-limiters.js';

export function createEpisodesRouter(controller: EpisodesController) {
  const router = Router();
  router.get('/:seasonId', authMiddleware, generalRateLimiter, controller.list);
  router.post('/', authMiddleware, writeRateLimiter, controller.create);
  router.put('/:id', authMiddleware, writeRateLimiter, controller.update);
  router.delete('/:id', authMiddleware, writeRateLimiter, controller.delete);
  router.patch('/:id/watched', authMiddleware, writeRateLimiter, controller.markWatched);
  return router;
}

export const episodesRouter = createEpisodesRouter(container.episodes.controller);
