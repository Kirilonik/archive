import { Router } from 'express';
import { pool } from '../config/db.js';
import { logger } from '../shared/logger.js';

export const router = Router();

router.get('/', async (req, res) => {
  // Упрощенный healthcheck для Railway - отвечаем сразу
  // Проверка БД выполняется асинхронно, но не блокирует ответ
  res.json({ 
    ok: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'checking',
  });
  
  // Проверяем БД в фоне для логирования, но не блокируем ответ
  pool.query('SELECT 1').then(() => {
    logger.debug('Database health check passed');
  }).catch((err) => {
    logger.warn({ err }, 'Database health check failed');
  });
});

router.get('/ready', async (req, res) => {
  // Readiness probe - проверяет готовность приложения
  try {
    await pool.query('SELECT 1');
    res.json({ ready: true });
  } catch (error) {
    logger.error({ err: error }, 'Readiness check failed');
    res.status(503).json({ ready: false });
  }
});

router.get('/live', (req, res) => {
  // Liveness probe - просто проверяет что процесс жив
  res.json({ alive: true });
});

