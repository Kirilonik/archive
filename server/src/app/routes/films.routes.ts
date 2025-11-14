import { Router } from 'express';
import type { FilmsController } from '../controllers/films.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { writeRateLimiter } from '../../middlewares/rate-limiters.js';

export function createFilmsRouter(controller: FilmsController) {
  const router = Router();
  router.get('/', authMiddleware, controller.list);
  router.get('/:id/concept-art', authMiddleware, controller.getConceptArt);
  router.get('/:id/posters', authMiddleware, controller.getPosters);
  router.get('/:id', authMiddleware, controller.get);
  router.post('/', authMiddleware, writeRateLimiter, controller.create);
  router.put('/:id', authMiddleware, writeRateLimiter, controller.update);
  router.delete('/:id', authMiddleware, writeRateLimiter, controller.delete);
  return router;
}

export const filmsRouter = createFilmsRouter(container.films.controller);

