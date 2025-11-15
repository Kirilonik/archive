import { Router } from 'express';
import type { SeasonsController } from '../controllers/seasons.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { generalRateLimiter, writeRateLimiter } from '../../middlewares/rate-limiters.js';

export function createSeasonsRouter(controller: SeasonsController) {
  const router = Router();
  router.get('/:seriesId', authMiddleware, generalRateLimiter, controller.list);
  router.post('/', authMiddleware, writeRateLimiter, controller.create);
  router.delete('/:id', authMiddleware, writeRateLimiter, controller.delete);
  router.patch('/:id/watched', authMiddleware, writeRateLimiter, controller.markWatched);
  return router;
}

export const seasonsRouter = createSeasonsRouter(container.seasons.controller);

