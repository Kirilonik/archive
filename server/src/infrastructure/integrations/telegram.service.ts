import { TelegramClient, type TelegramMessage } from './telegram.client.js';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger.js';

export interface NotificationOptions {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
}

export class TelegramService {
  private readonly client: TelegramClient;
  private readonly defaultChatId: string;

  constructor(client?: TelegramClient, defaultChatId?: string) {
    this.client = client || new TelegramClient();
    this.defaultChatId = defaultChatId || env.TELEGRAM_CHAT_ID || '';

    if (!this.defaultChatId) {
      logger.warn('TELEGRAM_CHAT_ID is not set. Telegram notifications will be disabled.');
    }
  }

  /**
   * Отправляет уведомление о деплое
   */
  async sendDeploymentNotification(data: {
    status: 'success' | 'failure';
    branch: string;
    commit: string;
    author: string;
    environment?: string;
    duration?: number;
  }): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    const emoji = data.status === 'success' ? '✅' : '❌';
    const statusText = data.status === 'success' ? 'Успешно' : 'Ошибка';
    const durationText = data.duration ? `\n⏱ Длительность: ${data.duration}с` : '';

    const text = `${emoji} <b>Деплой ${statusText}</b>

🌿 Ветка: <code>${this.escapeHtml(data.branch)}</code>
📝 Коммит: <code>${this.escapeHtml(data.commit.substring(0, 7))}</code>
👤 Автор: ${this.escapeHtml(data.author)}${data.environment ? `\n🌍 Окружение: ${this.escapeHtml(data.environment)}` : ''}${durationText}`;

    await this.sendMessage(text, { parseMode: 'HTML' });
  }

  /**
   * Отправляет уведомление о регистрации нового пользователя
   */
  async sendNewUserNotification(data: {
    userId: number;
    email: string;
    name?: string | null;
  }): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    const nameText = data.name ? `\n👤 Имя: ${this.escapeHtml(data.name)}` : '';
    const text = `🆕 <b>Новый пользователь зарегистрирован</b>

🆔 ID: <code>${data.userId}</code>
📧 Email: ${this.escapeHtml(data.email)}${nameText}`;

    await this.sendMessage(text, { parseMode: 'HTML' });
  }

  /**
   * Отправляет произвольное сообщение
   */
  async sendMessage(
    text: string,
    options?: NotificationOptions & { chatId?: string },
  ): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    const chatId = options?.chatId || this.defaultChatId;
    if (!chatId) {
      logger.warn('No chat ID provided for Telegram message');
      return;
    }

    const message: TelegramMessage = {
      chatId,
      text,
      parseMode: options?.parseMode,
      disableNotification: options?.disableNotification,
    };

    await this.client.sendMessage(message);
  }

  /**
   * Проверяет, настроен ли сервис
   */
  isConfigured(): boolean {
    return this.client.isConfigured() && !!this.defaultChatId;
  }

  /**
   * Экранирует HTML символы для безопасной отправки
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
