import { Router } from 'express';
import type { FilmsController } from '../controllers/films.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';

export function createFilmsRouter(controller: FilmsController) {
  const router = Router();
  router.get('/', authMiddleware, controller.list);
  router.get('/:id', authMiddleware, controller.get);
  router.post('/', authMiddleware, controller.create);
  router.put('/:id', authMiddleware, controller.update);
  router.delete('/:id', authMiddleware, controller.delete);
  return router;
}

export const filmsRouter = createFilmsRouter(container.films.controller);

