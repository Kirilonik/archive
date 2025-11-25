import type { TelegramService as InfrastructureTelegramService } from '../../infrastructure/integrations/telegram.service.js';
import { logger } from '../../shared/logger.js';

/**
 * Application слой для Telegram уведомлений
 * Предоставляет высокоуровневый API для отправки уведомлений
 */
export class TelegramNotificationService {
  constructor(private readonly telegramService: InfrastructureTelegramService) {}

  /**
   * Отправляет уведомление о деплое
   */
  async notifyDeployment(data: {
    status: 'success' | 'failure';
    branch: string;
    commit: string;
    author: string;
    environment?: string;
    duration?: number;
  }): Promise<void> {
    try {
      await this.telegramService.sendDeploymentNotification(data);
    } catch (error) {
      logger.error({ error, deploymentData: data }, 'Failed to send deployment notification');
    }
  }

  /**
   * Отправляет уведомление о регистрации нового пользователя
   */
  async notifyNewUser(data: {
    userId: number;
    email: string;
    name?: string | null;
  }): Promise<void> {
    try {
      await this.telegramService.sendNewUserNotification(data);
    } catch (error) {
      logger.error({ error, userData: data }, 'Failed to send new user notification');
    }
  }

  /**
   * Отправляет произвольное сообщение
   */
  async sendMessage(
    text: string,
    options?: { parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'; chatId?: string },
  ): Promise<void> {
    try {
      await this.telegramService.sendMessage(text, options);
    } catch (error) {
      logger.error({ error }, 'Failed to send Telegram message');
    }
  }

  /**
   * Проверяет, настроен ли сервис
   */
  isConfigured(): boolean {
    return this.telegramService.isConfigured();
  }
}

