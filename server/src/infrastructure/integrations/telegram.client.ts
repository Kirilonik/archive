import { env } from '../../config/env.js';
import { logger } from '../../shared/logger.js';

const TELEGRAM_API_URL = 'https://api.telegram.org';

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
}

export interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    date: number;
    text: string;
  };
  error_code?: number;
  description?: string;
}

export class TelegramClient {
  private readonly botToken: string;
  private readonly baseUrl: string;

  constructor(botToken?: string) {
    this.botToken = botToken || env.TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `${TELEGRAM_API_URL}/bot${this.botToken}`;

    if (!this.botToken) {
      logger.warn('TELEGRAM_BOT_TOKEN is not set. Telegram notifications will be disabled.');
    }
  }

  /**
   * Отправляет сообщение в Telegram
   */
  async sendMessage(message: TelegramMessage): Promise<TelegramSendMessageResponse> {
    if (!this.botToken) {
      logger.warn('Telegram bot token is not configured. Skipping message send.');
      return { ok: false, description: 'Telegram bot token is not configured' };
    }

    try {
      const url = `${this.baseUrl}/sendMessage`;
      const body = {
        chat_id: message.chatId,
        text: message.text,
        parse_mode: message.parseMode,
        disable_notification: message.disableNotification,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as TelegramSendMessageResponse;

      if (!data.ok) {
        logger.error(
          {
            errorCode: data.error_code,
            description: data.description,
            chatId: message.chatId,
          },
          'Failed to send Telegram message',
        );
      } else {
        logger.debug({ chatId: message.chatId, messageId: data.result?.message_id }, 'Telegram message sent');
      }

      return data;
    } catch (error) {
      logger.error({ error, chatId: message.chatId }, 'Error sending Telegram message');
      return {
        ok: false,
        description: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Проверяет, настроен ли бот (есть ли токен)
   */
  isConfigured(): boolean {
    return !!this.botToken;
  }
}

