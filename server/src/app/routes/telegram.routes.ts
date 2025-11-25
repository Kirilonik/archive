import { Router } from 'express';
import { TelegramController } from '../controllers/telegram.controller.js';
import { generalRateLimiter } from '../../middlewares/rate-limiters.js';

export function createTelegramRouter(controller: TelegramController) {
  const router = Router();
  
  // Endpoint для уведомлений о деплое
  // Защищен Bearer токеном (TELEGRAM_DEPLOY_SECRET)
  router.post('/deploy', generalRateLimiter, controller.notifyDeployment);
  
  return router;
}

