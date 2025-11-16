// eslint-disable-next-line import/no-named-as-default
import rateLimit from 'express-rate-limit';

/**
 * Получение IP адреса клиента с учетом прокси
 */
function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  // Проверяем заголовки прокси (Railway, Cloudflare и т.д.)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  return req.ip || 'unknown';
}

/**
 * Rate limiter на уровне IP для защиты от DDoS
 * Более агрессивные лимиты для неавторизованных запросов
 */
export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  limit: 200, // 200 запросов в минуту с одного IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: 'Слишком много запросов с вашего IP. Попробуйте позже.' },
  skip: (req) => {
    // Пропускаем healthcheck для мониторинга
    return req.path === '/api/health';
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: getClientIp, // Используем IP для дополнительной защиты
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
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


