import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    // Инициализируем transporter только если SMTP настроен
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
        // Таймауты для подключения и отправки (агрессивные, чтобы не блокировать регистрацию)
        connectionTimeout: 2000, // 2 секунды на подключение
        greetingTimeout: 2000, // 2 секунды на приветствие
        socketTimeout: 3000, // 3 секунды на операцию
        // Дополнительная настройка для избежания зависаний
        pool: false, // Отключаем pooling для избежания проблем с соединениями
        // Дополнительные настройки для быстрого отказа при проблемах
        tls: {
          rejectUnauthorized: false, // В production лучше установить true
        },
      });
    } else {
      logger.warn({ smtp: 'not configured' }, 'SMTP не настроен. Email не будут отправляться. Установите SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      logger.warn({ to: options.to, subject: options.subject }, 'Попытка отправить email, но SMTP не настроен');
      // В dev режиме логируем email вместо отправки
      if (env.NODE_ENV === 'development') {
        logger.info({
          to: options.to,
          subject: options.subject,
          html: options.html.substring(0, 200) + '...',
        }, 'DEV MODE: Email был бы отправлен');
      }
      return;
    }

    try {
      // Добавляем таймаут для отправки email (10 секунд)
      const sendMailPromise = this.transporter.sendMail({
        from: env.SMTP_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout')), 3000); // 3 секунды максимум
      });

      await Promise.race([sendMailPromise, timeoutPromise]);
      logger.info({ to: options.to, subject: options.subject }, 'Email отправлен успешно');
    } catch (error) {
      logger.error({ error, to: options.to, subject: options.subject }, 'Ошибка при отправке email');
      // Не пробрасываем ошибку дальше - регистрация не должна падать из-за проблем с email
      // В продакшне это важно для надежности
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

