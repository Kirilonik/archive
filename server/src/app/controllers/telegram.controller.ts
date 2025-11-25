import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { TelegramNotificationService } from '../../application/telegram/telegram.service.js';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger.js';

export class TelegramController {
  constructor(private readonly telegramNotificationService: TelegramNotificationService) {}

  /**
   * Endpoint для уведомлений о деплое
   * Защищен секретным токеном из переменной окружения
   */
  notifyDeployment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Проверка секретного токена
      const authHeader = req.headers.authorization;
      const expectedToken = env.TELEGRAM_DEPLOY_SECRET || '';
      
      if (!expectedToken) {
        logger.warn('TELEGRAM_DEPLOY_SECRET is not set. Deployment notifications are disabled.');
        return res.status(503).json({ error: 'Deployment notifications are not configured' });
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      if (token !== expectedToken) {
        logger.warn({ ip: req.ip }, 'Invalid deployment notification token');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const schema = z.object({
        status: z.enum(['success', 'failure']),
        branch: z.string(),
        commit: z.string(),
        author: z.string(),
        environment: z.string().optional(),
        duration: z.number().positive().optional(),
      });

      const data = schema.parse(req.body);

      // Отправляем уведомление асинхронно
      process.nextTick(() => {
        this.telegramNotificationService
          .notifyDeployment(data)
          .catch((error) => {
            logger.error({ error, deploymentData: data }, 'Failed to send deployment notification');
          });
      });

      res.json({ success: true, message: 'Notification queued' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };
}

