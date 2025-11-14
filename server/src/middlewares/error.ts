import type { ErrorRequestHandler } from 'express';
import { logger } from '../shared/logger.js';
import { env } from '../config/env.js';

export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message = err?.message || 'Internal Server Error';

  // Логируем все ошибки
  const logData: Record<string, unknown> = {
    err,
    status,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  if (status >= 500) {
    // Серверные ошибки - всегда логируем с полной информацией
    logger.error(logData, 'Server error');
  } else {
    // Клиентские ошибки - логируем как warning
    logger.warn(logData, 'Client error');
  }

  // В продакшене не раскрываем детали внутренних ошибок
  const errorMessage = status >= 500 && env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : message;

  res.status(status).json({ error: errorMessage });
};


