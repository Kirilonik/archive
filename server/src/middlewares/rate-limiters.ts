// eslint-disable-next-line import/no-named-as-default
import rateLimit from 'express-rate-limit';

/**
 * Получение IP адреса клиента с учетом прокси
 * Возвращает IPv4 адрес для совместимости с express-rate-limit
 */
function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  // Проверяем заголовки прокси (Cloudflare, Nginx и т.д.)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const firstIp = ips.split(',')[0].trim();
    // Если это IPv6, возвращаем 'unknown' чтобы использовать fallback
    if (firstIp.includes(':')) {
      return req.ip || 'unknown';
    }
    return firstIp;
  }
  
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    const ip = Array.isArray(realIp) ? realIp[0] : realIp;
    // Если это IPv6, возвращаем 'unknown'
    if (ip.includes(':')) {
      return req.ip || 'unknown';
    }
    return ip;
  }
  
  const ip = req.ip || 'unknown';
  // Если это IPv6, возвращаем 'unknown' чтобы использовать fallback
  if (ip.includes(':')) {
    return 'unknown';
  }
  return ip;
}

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
  // Используем стандартный keyGenerator (по умолчанию использует req.ip)
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
  // Используем стандартный keyGenerator, который автоматически обрабатывает IPv6
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


