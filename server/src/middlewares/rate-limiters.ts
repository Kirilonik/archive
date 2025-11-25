// eslint-disable-next-line import/no-named-as-default
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter на уровне IP для защиты от DDoS
 * Более агрессивные лимиты для неавторизованных запросов
 * Используем стандартный keyGenerator, который автоматически обрабатывает IPv6
 */
export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  limit: 200, // 200 запросов в минуту с одного IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов с вашего IP. Попробуйте позже.' },
  skip: (req) => {
    // Пропускаем healthcheck и часто используемые эндпоинты
    const path = req.path;
    const originalUrl = req.originalUrl || '';
    return (
      path === '/api/health' ||
      path === '/api/csrf-token' ||
      path === '/api/auth/me' ||
      originalUrl === '/api/health' ||
      originalUrl === '/api/csrf-token' ||
      originalUrl === '/api/auth/me' ||
      originalUrl.startsWith('/api/health') ||
      originalUrl.startsWith('/api/csrf-token') ||
      originalUrl.startsWith('/api/auth/me')
    );
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20, // Увеличено с 10 до 20 для более комфортного использования
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200, // Увеличено с 100 до 200 для более комфортного использования
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
});

export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
});
