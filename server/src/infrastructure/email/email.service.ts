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

      // Проверяем соединение при старте (асинхронно, не блокируем запуск)
      this.verifyConnection().catch((err) => {
        logger.warn({ error: err.message }, 'Предупреждение: не удалось проверить SMTP соединение при старте');
      });
    } else {
      logger.warn({ smtp: 'not configured' }, 'SMTP не настроен. Email не будут отправляться. Установите SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
    }
  }

  /**
   * Проверяет SMTP соединение при инициализации
   */
  private async verifyConnection(): Promise<void> {
    if (!this.transporter) return;

    try {
      await this.transporter.verify();
      logger.info({ host: env.SMTP_HOST, user: env.SMTP_USER }, 'SMTP соединение успешно проверено');
    } catch (error: any) {
      const isYandex = env.SMTP_HOST?.includes('yandex');
      const isGmail = env.SMTP_HOST?.includes('gmail');
      
      if (error?.code === 'EAUTH' || error?.responseCode === 535) {
        let helpMessage = 'Ошибка аутентификации SMTP при проверке соединения.\n';
        
        if (isYandex) {
          helpMessage += '\n📧 Для Yandex необходимо использовать ПАРОЛЬ ПРИЛОЖЕНИЯ, а не обычный пароль!\n';
          helpMessage += 'Инструкция:\n';
          helpMessage += '1. Перейдите на https://id.yandex.ru/security\n';
          helpMessage += '2. Найдите раздел "Пароли приложений"\n';
          helpMessage += '3. Создайте новый пароль приложения (например, "Media Archive SMTP")\n';
          helpMessage += '4. Используйте этот пароль в переменной SMTP_PASSWORD\n';
          helpMessage += '5. Убедитесь, что SMTP_FROM совпадает с SMTP_USER\n';
        } else if (isGmail) {
          helpMessage += '\n📧 Для Gmail необходимо использовать ПАРОЛЬ ПРИЛОЖЕНИЯ!\n';
          helpMessage += 'Инструкция:\n';
          helpMessage += '1. Включите двухфакторную аутентификацию в Google аккаунте\n';
          helpMessage += '2. Перейдите на https://myaccount.google.com/apppasswords\n';
          helpMessage += '3. Создайте пароль приложения для "Почта"\n';
          helpMessage += '4. Используйте этот пароль в переменной SMTP_PASSWORD\n';
        } else {
          helpMessage += '\nПроверьте правильность SMTP_USER и SMTP_PASSWORD\n';
        }
        
        logger.error({
          host: env.SMTP_HOST,
          user: env.SMTP_USER,
          error: error.message,
          code: error.code,
          responseCode: error.responseCode,
        }, helpMessage);
      } else {
        logger.warn({
          host: env.SMTP_HOST,
          error: error.message,
          code: error.code,
        }, 'Не удалось проверить SMTP соединение при старте (это не критично, проверка будет при первой отправке)');
      }
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
        const isYandex = env.SMTP_HOST?.includes('yandex');
        const isGmail = env.SMTP_HOST?.includes('gmail');
        
        let errorMessage = 'Ошибка аутентификации SMTP при отправке email.\n';
        
        if (isYandex) {
          errorMessage += '\n❌ YANDEX: Используется неправильный пароль!\n';
          errorMessage += 'Для Yandex НЕОБХОДИМО использовать ПАРОЛЬ ПРИЛОЖЕНИЯ, а не обычный пароль аккаунта.\n\n';
          errorMessage += '🔧 Как исправить:\n';
          errorMessage += '1. Откройте https://id.yandex.ru/security\n';
          errorMessage += '2. Найдите раздел "Пароли приложений"\n';
          errorMessage += '3. Создайте новый пароль приложения (название: "Media Archive SMTP")\n';
          errorMessage += '4. Скопируйте сгенерированный пароль (16 символов)\n';
          errorMessage += '5. Обновите переменную SMTP_PASSWORD в docker-compose.prod.yml или .env файле\n';
          errorMessage += '6. Перезапустите контейнер: docker compose -f docker-compose.prod.yml restart server\n\n';
          errorMessage += '⚠️  Важно:\n';
          errorMessage += '- Используйте именно пароль приложения, НЕ обычный пароль от почты\n';
          errorMessage += '- SMTP_FROM должен совпадать с SMTP_USER\n';
          errorMessage += '- Пароль приложения показывается только один раз при создании\n';
        } else if (isGmail) {
          errorMessage += '\n❌ GMAIL: Используется неправильный пароль!\n';
          errorMessage += 'Для Gmail НЕОБХОДИМО использовать ПАРОЛЬ ПРИЛОЖЕНИЯ.\n\n';
          errorMessage += '🔧 Как исправить:\n';
          errorMessage += '1. Включите двухфакторную аутентификацию в Google аккаунте\n';
          errorMessage += '2. Откройте https://myaccount.google.com/apppasswords\n';
          errorMessage += '3. Создайте пароль приложения для "Почта"\n';
          errorMessage += '4. Используйте этот пароль в SMTP_PASSWORD\n';
          errorMessage += '5. Перезапустите контейнер\n';
        } else {
          errorMessage += '\nПроверьте правильность SMTP_USER и SMTP_PASSWORD.\n';
          errorMessage += 'Убедитесь, что используете правильные учетные данные для вашего SMTP сервера.\n';
        }
        
        logger.error({ ...errorDetails, help: errorMessage }, errorMessage);
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

