import { Router } from 'express';
import type { UsersController } from '../controllers/users.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { generalRateLimiter, writeRateLimiter } from '../../middlewares/rate-limiters.js';

export function createUsersRouter(controller: UsersController) {
  const router = Router();
  router.get('/:id', authMiddleware, generalRateLimiter, controller.getProfile);
  router.put('/:id', authMiddleware, writeRateLimiter, controller.updateProfile);
  router.delete('/:id', authMiddleware, writeRateLimiter, controller.deleteUser);
  router.get(
    '/:id/stats/detailed',
    authMiddleware,
    generalRateLimiter,
    controller.getDetailedStats,
  );
  return router;
}

export const usersRouter = createUsersRouter(container.users.controller);
