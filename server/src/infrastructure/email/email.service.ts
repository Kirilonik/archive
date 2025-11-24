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
      logger.info({ 
        host: env.SMTP_HOST, 
        port: env.SMTP_PORT, 
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        from: env.SMTP_FROM
      }, 'Инициализация SMTP транспорта');
      
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
        // Таймауты для подключения и отправки (агрессивные, чтобы не блокировать регистрацию)
        connectionTimeout: 5000, // 5 секунд на подключение (увеличено для надежности)
        greetingTimeout: 5000, // 5 секунд на приветствие
        socketTimeout: 10000, // 10 секунд на операцию
        // Дополнительная настройка для избежания зависаний
        pool: false, // Отключаем pooling для избежания проблем с соединениями
        // Дополнительные настройки для быстрого отказа при проблемах
        tls: {
          rejectUnauthorized: false, // В production лучше установить true
        },
        // Дополнительные настройки для диагностики
        debug: env.NODE_ENV === 'development', // Включаем debug в dev режиме
        logger: env.NODE_ENV === 'development', // Логируем в dev режиме
      } as any);
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
      logger.debug({ to: options.to, subject: options.subject, from: env.SMTP_FROM }, 'Начало отправки email');
      
      const sendMailPromise = this.transporter.sendMail({
        from: env.SMTP_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      // Таймаут - 15 секунд максимум на всю операцию
      // Увеличен для надежности, но все равно не блокирует регистрацию
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Email send timeout after 15 seconds'));
        }, 15000);
      });

      await Promise.race([sendMailPromise, timeoutPromise]);
      logger.info({ to: options.to, subject: options.subject }, 'Email отправлен успешно');
    } catch (error: any) {
      // Детальное логирование ошибок для диагностики
      const errorDetails: any = {
        to: options.to,
        subject: options.subject,
        error: error.message || 'Unknown error',
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
      };

      // Если это таймаут, логируем отдельно с деталями
      if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET') {
        logger.warn(errorDetails, 'Таймаут или ошибка подключения при отправке email. Возможные причины: неправильный SMTP_HOST/SMTP_PORT, firewall блокирует порт, SMTP сервер недоступен');
      } else if (error?.code === 'EAUTH' || error?.responseCode === 535) {
        logger.error(errorDetails, 'Ошибка аутентификации SMTP. Проверьте SMTP_USER и SMTP_PASSWORD (используйте пароль приложения для Gmail/Yandex)');
      } else if (error?.code === 'ECONNREFUSED') {
        logger.error(errorDetails, 'SMTP сервер отказал в подключении. Проверьте SMTP_HOST и SMTP_PORT, убедитесь что сервер доступен');
      } else {
        logger.error(errorDetails, 'Ошибка при отправке email');
      }
      // Не пробрасываем ошибку дальше - регистрация не должна падать из-за проблем с email
      // В продакшне это важно для надежности
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

