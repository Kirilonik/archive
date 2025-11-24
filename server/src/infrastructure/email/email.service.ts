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
      // Проверка совпадения SMTP_FROM и SMTP_USER (критично для Yandex)
      const isYandex = env.SMTP_HOST.includes('yandex');
      const isGmail = env.SMTP_HOST.includes('gmail');
      if (isYandex && env.SMTP_FROM !== env.SMTP_USER) {
        logger.error({
          smtp_user: env.SMTP_USER,
          smtp_from: env.SMTP_FROM,
        }, '⚠️ КРИТИЧНО: SMTP_FROM не совпадает с SMTP_USER! Для Yandex они должны быть одинаковыми. Это может быть причиной ошибки аутентификации.');
      }

      // Диагностика пароля (без самого пароля)
      const passwordLength = env.SMTP_PASSWORD.length;
      const hasSpaces = env.SMTP_PASSWORD.includes(' ');
      const hasNewlines = env.SMTP_PASSWORD.includes('\n') || env.SMTP_PASSWORD.includes('\r');
      
      if (hasSpaces || hasNewlines) {
        logger.warn({
          passwordLength,
          hasSpaces,
          hasNewlines,
        }, '⚠️ ВНИМАНИЕ: В пароле обнаружены пробелы или переносы строк! Это может быть причиной ошибки аутентификации. Убедитесь, что пароль скопирован без лишних символов.');
      }

      // Для Yandex пароль приложения обычно 16 символов
      if (isYandex && passwordLength !== 16) {
        logger.warn({
          passwordLength,
          expectedLength: 16,
        }, '⚠️ ВНИМАНИЕ: Пароль приложения Yandex обычно состоит из 16 символов. Текущая длина: ' + passwordLength + '. Убедитесь, что вы используете именно пароль приложения.');
      }

      logger.info({ 
        host: env.SMTP_HOST, 
        port: env.SMTP_PORT, 
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        from: env.SMTP_FROM,
        passwordLength,
        fromMatchesUser: env.SMTP_FROM === env.SMTP_USER,
      }, 'Инициализация SMTP транспорта');
      
      // Для Yandex настраиваем специальные параметры
      const transporterConfig: any = {
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
      };

      // Для Yandex: если порт 587, используем STARTTLS вместо SSL
      if (isYandex && env.SMTP_PORT === 587) {
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
        logger.info({ port: 587, method: 'STARTTLS' }, 'Используется порт 587 с STARTTLS для Yandex');
      }

      // Для Gmail: если порт 587, используем STARTTLS
      if (isGmail && env.SMTP_PORT === 587) {
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
        logger.info({ port: 587, method: 'STARTTLS' }, 'Используется порт 587 с STARTTLS для Gmail');
      }

      this.transporter = nodemailer.createTransport(transporterConfig);

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
          const fromMatchesUser = env.SMTP_FROM === env.SMTP_USER;
          const passwordLength = env.SMTP_PASSWORD.length;
          const hasSpaces = env.SMTP_PASSWORD.includes(' ');
          
          helpMessage += '\n❌ YANDEX: Ошибка аутентификации при проверке соединения!\n\n';
          helpMessage += '🔍 Диагностика:\n';
          helpMessage += `- SMTP_USER: ${env.SMTP_USER}\n`;
          helpMessage += `- SMTP_FROM: ${env.SMTP_FROM}\n`;
          helpMessage += `- SMTP_FROM совпадает с SMTP_USER: ${fromMatchesUser ? '✅ Да' : '❌ НЕТ (это может быть проблемой!)'}\n`;
          helpMessage += `- Длина пароля: ${passwordLength} символов (ожидается 16 для пароля приложения)\n`;
          helpMessage += `- Пароль содержит пробелы: ${hasSpaces ? '❌ Да (это проблема!)' : '✅ Нет'}\n\n`;
          
          if (!fromMatchesUser) {
            helpMessage += '⚠️ КРИТИЧНО: SMTP_FROM не совпадает с SMTP_USER!\n';
            helpMessage += 'Для Yandex они ДОЛЖНЫ быть одинаковыми.\n\n';
          }
          
          if (hasSpaces) {
            helpMessage += '⚠️ ПРОБЛЕМА: В пароле обнаружены пробелы!\n';
            helpMessage += 'Убедитесь, что пароль скопирован без пробелов.\n\n';
          }
          
          helpMessage += '📝 КРИТИЧЕСКИ ВАЖНО - Проверьте настройки Яндекс.Почты:\n';
          helpMessage += '1. Откройте https://mail.yandex.ru\n';
          helpMessage += '2. Нажмите на шестеренку ⚙️ (Настройки) в правом верхнем углу\n';
          helpMessage += '3. Выберите "Все настройки"\n';
          helpMessage += '4. Перейдите в раздел "Почтовые программы"\n';
          helpMessage += '5. Убедитесь, что ВКЛЮЧЕН флажок "Разрешить доступ к почтовому ящику с помощью почтовых клиентов"\n';
          helpMessage += '6. Сохраните изменения\n\n';
          
          helpMessage += '📝 Создание пароля приложения:\n';
          helpMessage += '1. Откройте https://id.yandex.ru/security\n';
          helpMessage += '2. Найдите раздел "Пароли приложений"\n';
          helpMessage += '3. Удалите ВСЕ старые пароли приложений (если есть)\n';
          helpMessage += '4. Создайте НОВЫЙ пароль приложения (название: "Media Archive SMTP")\n';
          helpMessage += '5. Скопируйте пароль БЕЗ пробелов (должно быть 16 символов)\n';
          helpMessage += '6. Убедитесь, что SMTP_FROM = SMTP_USER\n';
          helpMessage += '7. Обновите переменные в .env или docker-compose.prod.yml\n';
          helpMessage += '8. Перезапустите: docker compose -f docker-compose.prod.yml restart server\n\n';
          
          helpMessage += '💡 Альтернатива: Попробуйте использовать порт 587 вместо 465:\n';
          helpMessage += '   SMTP_PORT=587\n';
          helpMessage += '   SMTP_SECURE=false\n';
        } else if (isGmail) {
          helpMessage += '\n📧 Для Gmail необходимо использовать ПАРОЛЬ ПРИЛОЖЕНИЯ!\n\n';
          helpMessage += '📝 Пошаговая инструкция:\n';
          helpMessage += '1. Включите двухфакторную аутентификацию (2FA) в Google аккаунте:\n';
          helpMessage += '   - Откройте https://myaccount.google.com/security\n';
          helpMessage += '   - Найдите "Двухэтапная аутентификация" и включите её\n\n';
          helpMessage += '2. Создайте пароль приложения:\n';
          helpMessage += '   - Откройте https://myaccount.google.com/apppasswords\n';
          helpMessage += '   - Выберите "Почта" в первом списке\n';
          helpMessage += '   - Выберите "Другое устройство" во втором списке\n';
          helpMessage += '   - Введите название: "Media Archive SMTP"\n';
          helpMessage += '   - Нажмите "Создать"\n';
          helpMessage += '   - Скопируйте 16-символьный пароль (показывается только один раз!)\n\n';
          helpMessage += '3. Настройте переменные окружения:\n';
          helpMessage += '   SMTP_HOST=smtp.gmail.com\n';
          helpMessage += '   SMTP_PORT=587\n';
          helpMessage += '   SMTP_SECURE=false\n';
          helpMessage += '   SMTP_USER=ваш_email@gmail.com\n';
          helpMessage += '   SMTP_PASSWORD=пароль_приложения_16_символов\n';
          helpMessage += '   SMTP_FROM=ваш_email@gmail.com\n\n';
          helpMessage += '4. Перезапустите контейнер:\n';
          helpMessage += '   docker compose -f docker-compose.prod.yml restart server\n';
        } else {
          helpMessage += '\nПроверьте правильность SMTP_USER и SMTP_PASSWORD\n';
        }
        
        logger.error({
          host: env.SMTP_HOST,
          user: env.SMTP_USER,
          from: env.SMTP_FROM,
          fromMatchesUser: env.SMTP_FROM === env.SMTP_USER,
          passwordLength: env.SMTP_PASSWORD.length,
          passwordHasSpaces: env.SMTP_PASSWORD.includes(' '),
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
        // Улучшенные заголовки для избежания блокировки как спам
        headers: {
          'X-Mailer': 'Media Archive',
          'List-Unsubscribe': `<${env.FRONTEND_URL}/unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        // Дополнительные настройки для избежания спама
        priority: 'normal',
        date: new Date(),
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
          const fromMatchesUser = env.SMTP_FROM === env.SMTP_USER;
          const passwordLength = env.SMTP_PASSWORD.length;
          const hasSpaces = env.SMTP_PASSWORD.includes(' ');
          
          errorMessage += '\n❌ YANDEX: Ошибка аутентификации!\n\n';
          errorMessage += '🔍 Диагностика:\n';
          errorMessage += `- SMTP_USER: ${env.SMTP_USER}\n`;
          errorMessage += `- SMTP_FROM: ${env.SMTP_FROM}\n`;
          errorMessage += `- SMTP_FROM совпадает с SMTP_USER: ${fromMatchesUser ? '✅ Да' : '❌ НЕТ (это может быть проблемой!)'}\n`;
          errorMessage += `- Длина пароля: ${passwordLength} символов (ожидается 16 для пароля приложения)\n`;
          errorMessage += `- Пароль содержит пробелы: ${hasSpaces ? '❌ Да (это проблема!)' : '✅ Нет'}\n\n`;
          
          errorMessage += '🔧 Возможные причины и решения:\n\n';
          
          if (!fromMatchesUser) {
            errorMessage += '1. ❌ SMTP_FROM не совпадает с SMTP_USER!\n';
            errorMessage += '   Решение: Убедитесь, что SMTP_FROM и SMTP_USER одинаковые\n';
            errorMessage += '   Пример: SMTP_USER=noreply-archive@yandex.ru\n';
            errorMessage += '           SMTP_FROM=noreply-archive@yandex.ru\n\n';
          }
          
          if (hasSpaces) {
            errorMessage += '2. ❌ В пароле есть пробелы!\n';
            errorMessage += '   Решение: Убедитесь, что пароль скопирован без пробелов в начале/конце\n\n';
          }
          
          if (passwordLength !== 16) {
            errorMessage += '3. ⚠️ Длина пароля не 16 символов\n';
            errorMessage += '   Пароль приложения Yandex обычно состоит из 16 символов\n';
            errorMessage += '   Убедитесь, что вы используете именно пароль приложения\n\n';
          }
          
          errorMessage += '4. 📝 КРИТИЧЕСКИ ВАЖНО - Проверьте настройки Яндекс.Почты:\n';
          errorMessage += '   a) Откройте https://mail.yandex.ru\n';
          errorMessage += '   b) Нажмите на шестеренку ⚙️ (Настройки) в правом верхнем углу\n';
          errorMessage += '   c) Выберите "Все настройки"\n';
          errorMessage += '   d) Перейдите в раздел "Почтовые программы"\n';
          errorMessage += '   e) Убедитесь, что ВКЛЮЧЕН флажок "Разрешить доступ к почтовому ящику с помощью почтовых клиентов"\n';
          errorMessage += '   f) Сохраните изменения\n\n';
          
          errorMessage += '5. 📝 Создание пароля приложения:\n';
          errorMessage += '   a) Откройте https://id.yandex.ru/security\n';
          errorMessage += '   b) Найдите раздел "Пароли приложений"\n';
          errorMessage += '   c) Удалите ВСЕ старые пароли приложений (если есть)\n';
          errorMessage += '   d) Создайте НОВЫЙ пароль приложения (название: "Media Archive SMTP")\n';
          errorMessage += '   e) Скопируйте пароль БЕЗ пробелов (должно быть 16 символов)\n';
          errorMessage += '   f) Убедитесь, что SMTP_FROM = SMTP_USER\n';
          errorMessage += '   g) Обновите переменные в .env или docker-compose.prod.yml\n';
          errorMessage += '   h) Перезапустите: docker compose -f docker-compose.prod.yml restart server\n\n';
          
          errorMessage += '💡 Альтернатива: Попробуйте использовать порт 587 вместо 465:\n';
          errorMessage += '   SMTP_PORT=587\n';
          errorMessage += '   SMTP_SECURE=false\n\n';
          
          errorMessage += '⚠️  Важно:\n';
          errorMessage += '- Пароль приложения показывается только ОДИН раз при создании\n';
          errorMessage += '- Если потеряли пароль - создайте новый\n';
          errorMessage += '- НЕ используйте обычный пароль от почты\n';
          errorMessage += '- SMTP_FROM и SMTP_USER должны быть ОДИНАКОВЫМИ\n';
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
      } else if (error?.code === 'EMESSAGE' || error?.responseCode === 554) {
        const isYandex = env.SMTP_HOST?.includes('yandex');
        let spamMessage = 'Письмо отклонено как спам (код 554).\n\n';
        
        if (isYandex) {
          spamMessage += '🔍 Yandex считает письмо спамом. Возможные причины:\n';
          spamMessage += '1. Новый аккаунт Yandex - нужно отправить несколько писем для "разогрева"\n';
          spamMessage += '2. Ссылки в письме - Yandex может блокировать ссылки на новые домены\n';
          spamMessage += '3. Содержимое письма - проверьте текст на спам-триггеры\n\n';
          spamMessage += '💡 Решения:\n';
          spamMessage += '1. Отправьте несколько тестовых писем на свой email для "разогрева" аккаунта\n';
          spamMessage += '2. Попробуйте отправить письмо без ссылок (только текст)\n';
          spamMessage += '3. Проверьте настройки аккаунта Yandex - возможно нужна верификация\n';
          spamMessage += '4. Подождите несколько часов и попробуйте снова\n';
          spamMessage += '5. Рассмотрите использование другого SMTP провайдера (Gmail, Mail.ru)\n';
        } else {
          spamMessage += 'Письмо отклонено почтовым сервером как спам.\n';
          spamMessage += 'Проверьте содержимое письма и настройки SMTP сервера.\n';
        }
        
        logger.error({ ...errorDetails, spamInfo: spamMessage }, spamMessage);
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

