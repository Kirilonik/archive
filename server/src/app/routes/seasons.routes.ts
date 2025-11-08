import { Router } from 'express';
import type { SeasonsController } from '../controllers/seasons.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';

export function createSeasonsRouter(controller: SeasonsController) {
  const router = Router();
  router.get('/:seriesId', authMiddleware, controller.list);
  router.post('/', authMiddleware, controller.create);
  router.delete('/:id', authMiddleware, controller.delete);
  router.patch('/:id/watched', authMiddleware, controller.markWatched);
  return router;
}

export const seasonsRouter = createSeasonsRouter(container.seasons.controller);

