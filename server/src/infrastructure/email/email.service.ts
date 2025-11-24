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
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
      const isYandex = env.SMTP_HOST.includes('yandex');
      const isGmail = env.SMTP_HOST.includes('gmail');

      if (isYandex && env.SMTP_FROM !== env.SMTP_USER) {
        logger.error({
          smtp_user: env.SMTP_USER,
          smtp_from: env.SMTP_FROM,
        }, 'SMTP_FROM не совпадает с SMTP_USER. Для Yandex они должны быть одинаковыми.');
      }

      const transporterConfig: any = {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        pool: false,
        tls: {
          rejectUnauthorized: false,
        },
        debug: env.NODE_ENV === 'development',
        logger: env.NODE_ENV === 'development',
      };

      if ((isYandex || isGmail) && env.SMTP_PORT === 587) {
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
      }

      this.transporter = nodemailer.createTransport(transporterConfig);

      this.verifyConnection().catch((err) => {
        logger.warn({ error: err.message }, 'Не удалось проверить SMTP соединение при старте');
      });
    } else {
      logger.warn({ smtp: 'not configured' }, 'SMTP не настроен. Email не будут отправляться.');
    }
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter) return;

    try {
      await this.transporter.verify();
      logger.info({ host: env.SMTP_HOST, user: env.SMTP_USER }, 'SMTP соединение успешно проверено');
    } catch (error: any) {
      if (error?.code === 'EAUTH' || error?.responseCode === 535) {
        logger.error({
          host: env.SMTP_HOST,
          user: env.SMTP_USER,
          error: error.message,
          code: error.code,
          responseCode: error.responseCode,
        }, 'Ошибка аутентификации SMTP. Проверьте SMTP_USER и SMTP_PASSWORD (используйте пароль приложения для Gmail/Yandex)');
      } else {
        logger.warn({
          host: env.SMTP_HOST,
          error: error.message,
          code: error.code,
        }, 'Не удалось проверить SMTP соединение при старте');
      }
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      logger.warn({ to: options.to, subject: options.subject }, 'Попытка отправить email, но SMTP не настроен');
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
        headers: {
          'X-Mailer': 'Media Archive',
          'List-Unsubscribe': `<${env.FRONTEND_URL}/unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        priority: 'normal',
        date: new Date(),
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Email send timeout after 15 seconds'));
        }, 15000);
      });

      await Promise.race([sendMailPromise, timeoutPromise]);
      logger.info({ to: options.to, subject: options.subject }, 'Email отправлен успешно');
    } catch (error: any) {
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

      if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET') {
        logger.warn(errorDetails, 'Таймаут или ошибка подключения при отправке email');
      } else if (error?.code === 'EAUTH' || error?.responseCode === 535) {
        logger.error(errorDetails, 'Ошибка аутентификации SMTP. Проверьте SMTP_USER и SMTP_PASSWORD (используйте пароль приложения для Gmail/Yandex)');
      } else if (error?.code === 'EMESSAGE' || error?.responseCode === 554) {
        logger.error(errorDetails, 'Письмо отклонено как спам (код 554). Проверьте содержимое письма и настройки SMTP сервера.');
      } else if (error?.code === 'ECONNREFUSED') {
        logger.error(errorDetails, 'SMTP сервер отказал в подключении. Проверьте SMTP_HOST и SMTP_PORT');
      } else {
        logger.error(errorDetails, 'Ошибка при отправке email');
      }
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}
