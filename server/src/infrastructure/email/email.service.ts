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
    logger.debug(
      {
        smtp_host: env.SMTP_HOST || 'не установлен',
        smtp_port: env.SMTP_PORT,
        smtp_user: env.SMTP_USER || 'не установлен',
        smtp_password_set: !!env.SMTP_PASSWORD,
        smtp_from: env.SMTP_FROM,
        node_env: env.NODE_ENV,
      },
      'EmailService: инициализация, проверка конфигурации SMTP',
    );

    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
      const isYandex = env.SMTP_HOST.includes('yandex');
      const isGmail = env.SMTP_HOST.includes('gmail');

      logger.debug(
        { isYandex, isGmail, smtp_host: env.SMTP_HOST },
        'EmailService: определение типа SMTP провайдера',
      );

      if (isYandex && env.SMTP_FROM !== env.SMTP_USER) {
        logger.error(
          {
            smtp_user: env.SMTP_USER,
            smtp_from: env.SMTP_FROM,
          },
          'SMTP_FROM не совпадает с SMTP_USER. Для Yandex они должны быть одинаковыми.',
        );
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
        logger.debug(
          { isYandex, isGmail, port: env.SMTP_PORT },
          'EmailService: настройка TLS для Yandex/Gmail на порту 587',
        );
      }

      logger.info(
        {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: transporterConfig.secure,
          requireTLS: transporterConfig.requireTLS,
          user: env.SMTP_USER,
          from: env.SMTP_FROM,
        },
        'EmailService: создание SMTP транспорта',
      );

      this.transporter = nodemailer.createTransport(transporterConfig);

      logger.debug({}, 'EmailService: запуск проверки SMTP соединения');
      this.verifyConnection().catch((err) => {
        logger.warn(
          {
            error: err instanceof Error ? err.message : String(err),
            errorCode: (err as any)?.code,
            errorResponseCode: (err as any)?.responseCode,
          },
          'EmailService: не удалось проверить SMTP соединение при старте',
        );
      });
    } else {
      const missingConfig = [];
      if (!env.SMTP_HOST) missingConfig.push('SMTP_HOST');
      if (!env.SMTP_USER) missingConfig.push('SMTP_USER');
      if (!env.SMTP_PASSWORD) missingConfig.push('SMTP_PASSWORD');

      logger.warn(
        {
          smtp: 'not configured',
          missing_config: missingConfig,
          smtp_host: env.SMTP_HOST || 'не установлен',
          smtp_user: env.SMTP_USER || 'не установлен',
          smtp_password_set: !!env.SMTP_PASSWORD,
        },
        'EmailService: SMTP не настроен. Email не будут отправляться.',
      );
    }
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter) {
      logger.debug({}, 'verifyConnection: transporter не инициализирован, пропуск проверки');
      return;
    }

    logger.debug(
      { host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER },
      'verifyConnection: начало проверки SMTP соединения',
    );

    try {
      await this.transporter.verify();
      logger.info(
        { host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER },
        'verifyConnection: SMTP соединение успешно проверено',
      );
    } catch (error: any) {
      const errorDetails: any = {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        error: error?.message || 'Unknown error',
        code: error?.code,
        responseCode: error?.responseCode,
        command: error?.command,
        response: error?.response,
      };

      if (error?.code === 'EAUTH' || error?.responseCode === 535) {
        logger.error(
          errorDetails,
          'verifyConnection: ошибка аутентификации SMTP. Проверьте SMTP_USER и SMTP_PASSWORD (используйте пароль приложения для Gmail/Yandex)',
        );
      } else {
        logger.warn(
          errorDetails,
          'verifyConnection: не удалось проверить SMTP соединение при старте',
        );
      }
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    logger.debug(
      {
        to: options.to,
        subject: options.subject,
        htmlLength: options.html?.length || 0,
        transporterExists: !!this.transporter,
      },
      'sendEmail: начало метода',
    );

    if (!this.transporter) {
      logger.warn(
        {
          to: options.to,
          subject: options.subject,
          smtp_host: env.SMTP_HOST || 'не установлен',
          smtp_user: env.SMTP_USER || 'не установлен',
          smtp_password_set: !!env.SMTP_PASSWORD,
        },
        'sendEmail: попытка отправить email, но SMTP не настроен',
      );
      if (env.NODE_ENV === 'development') {
        logger.info(
          {
            to: options.to,
            subject: options.subject,
            html: options.html.substring(0, 200) + '...',
          },
          'sendEmail: DEV MODE - Email был бы отправлен',
        );
      }
      return;
    }

    try {
      logger.debug(
        {
          to: options.to,
          subject: options.subject,
          from: env.SMTP_FROM,
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
        },
        'sendEmail: подготовка к отправке email',
      );

      const mailOptions = {
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
        priority: 'normal' as const,
        date: new Date(),
      };

      logger.debug(
        {
          to: mailOptions.to,
          from: mailOptions.from,
          subject: mailOptions.subject,
          htmlLength: mailOptions.html.length,
          textLength: mailOptions.text?.length || 0,
        },
        'sendEmail: параметры письма подготовлены, вызов transporter.sendMail',
      );

      const sendMailPromise = this.transporter.sendMail(mailOptions);
      logger.debug({}, 'sendEmail: промис отправки создан, установка таймаута 15 секунд');

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          logger.warn(
            { to: options.to, subject: options.subject },
            'sendEmail: таймаут отправки email (15 секунд)',
          );
          reject(new Error('Email send timeout after 15 seconds'));
        }, 15000);
      });

      logger.debug({}, 'sendEmail: ожидание результата отправки (race с таймаутом)');
      const result = await Promise.race([sendMailPromise, timeoutPromise]);

      logger.info(
        {
          to: options.to,
          subject: options.subject,
          messageId: (result as any)?.messageId,
          response: (result as any)?.response,
        },
        'sendEmail: email отправлен успешно',
      );
    } catch (error: any) {
      const errorDetails: any = {
        to: options.to,
        subject: options.subject,
        error: error?.message || 'Unknown error',
        errorStack: error?.stack,
        code: error?.code,
        command: error?.command,
        response: error?.response,
        responseCode: error?.responseCode,
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        from: env.SMTP_FROM,
      };

      if (
        error?.message?.includes('timeout') ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNRESET'
      ) {
        logger.warn(errorDetails, 'sendEmail: таймаут или ошибка подключения при отправке email');
      } else if (error?.code === 'EAUTH' || error?.responseCode === 535) {
        logger.error(
          errorDetails,
          'sendEmail: ошибка аутентификации SMTP. Проверьте SMTP_USER и SMTP_PASSWORD (используйте пароль приложения для Gmail/Yandex)',
        );
      } else if (error?.code === 'EMESSAGE' || error?.responseCode === 554) {
        logger.error(
          errorDetails,
          'sendEmail: письмо отклонено как спам (код 554). Проверьте содержимое письма и настройки SMTP сервера.',
        );
      } else if (error?.code === 'ECONNREFUSED') {
        logger.error(
          errorDetails,
          'sendEmail: SMTP сервер отказал в подключении. Проверьте SMTP_HOST и SMTP_PORT',
        );
      } else {
        logger.error(errorDetails, 'sendEmail: ошибка при отправке email');
      }

      throw error; // Пробрасываем ошибку дальше
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
