import { Router } from 'express';
import type { UsersController } from '../controllers/users.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';

export function createUsersRouter(controller: UsersController) {
  const router = Router();
  router.get('/:id', authMiddleware, controller.getProfile);
  router.put('/:id', authMiddleware, controller.updateProfile);
  router.delete('/:id', authMiddleware, controller.deleteUser);
  router.get('/:id/stats/detailed', authMiddleware, controller.getDetailedStats);
  return router;
}

export const usersRouter = createUsersRouter(container.users.controller);

