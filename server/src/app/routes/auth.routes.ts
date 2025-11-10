import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { authRateLimiter } from '../../middlewares/rate-limiters.js';

export function createAuthRouter(controller: AuthController) {
  const router = Router();
  router.post('/register', authRateLimiter, controller.register);
  router.post('/login', authRateLimiter, controller.login);
  router.post('/google', authRateLimiter, controller.loginWithGoogle);
  router.post('/refresh', authRateLimiter, controller.refresh);
  router.post('/logout', authRateLimiter, controller.logout);
  router.get('/me', authMiddleware, controller.me);
  return router;
}

export const authRouter = createAuthRouter(container.auth.controller);

