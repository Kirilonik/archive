import { Router } from 'express';
import type { SeriesController } from '../controllers/series.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';

export function createSeriesRouter(controller: SeriesController) {
  const router = Router();
  router.get('/', authMiddleware, controller.list);
  router.get('/:id', authMiddleware, controller.get);
  router.post('/', authMiddleware, controller.create);
  router.put('/:id', authMiddleware, controller.update);
  router.delete('/:id', authMiddleware, controller.delete);
  return router;
}

export const seriesRouter = createSeriesRouter(container.series.controller);

