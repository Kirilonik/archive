import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';

export function createAuthRouter(controller: AuthController) {
  const router = Router();
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/google', controller.loginWithGoogle);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', authMiddleware, controller.me);
  return router;
}

export const authRouter = createAuthRouter(container.auth.controller);

