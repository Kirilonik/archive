import type { Request, Response, NextFunction } from 'express';
import { httpRequestCounter, httpRequestDuration, errorCounter } from '../monitoring/metrics.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Нормализуем путь (убираем ID из URL для группировки)
  const route = normalizeRoute(req.route?.path || req.path);
  const method = req.method;

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const status = res.statusCode;

    // Считаем все запросы
    httpRequestCounter.inc({
      method,
      route,
      status: status.toString(),
    });

    // Записываем время ответа
    httpRequestDuration.observe({ method, route }, duration);

    // Считаем ошибки отдельно
    if (status >= 400) {
      errorCounter.inc({
        method,
        route,
        status: status.toString(),
      });
    }
  });

  next();
}

/**
 * Нормализует путь для метрик, заменяя ID на :id
 * Например: /api/films/123 -> /api/films/:id
 */
function normalizeRoute(path: string): string {
  // Заменяем числовые ID на :id
  return path.replace(/\/\d+/g, '/:id').replace(/\/\d+$/g, '/:id');
}
