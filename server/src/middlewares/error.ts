import type { ErrorRequestHandler } from 'express';

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message = err?.message || 'Internal Server Error';
  res.status(status).json({ error: message });
};


