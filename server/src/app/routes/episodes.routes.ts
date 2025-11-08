import { Router } from 'express';
import type { EpisodesController } from '../controllers/episodes.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';

export function createEpisodesRouter(controller: EpisodesController) {
  const router = Router();
  router.get('/:seasonId', authMiddleware, controller.list);
  router.post('/', authMiddleware, controller.create);
  router.put('/:id', authMiddleware, controller.update);
  router.delete('/:id', authMiddleware, controller.delete);
  router.patch('/:id/watched', authMiddleware, controller.markWatched);
  return router;
}

export const episodesRouter = createEpisodesRouter(container.episodes.controller);

