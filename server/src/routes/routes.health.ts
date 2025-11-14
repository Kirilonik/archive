import { Router } from 'express';
import { pool } from '../config/db.js';
import { logger } from '../shared/logger.js';

export const router = Router();

router.get('/', async (req, res) => {
  try {
    // Проверяем соединение с БД с таймаутом
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      ),
    ]);
    
    try {
      await client.query('SELECT 1');
      res.json({ 
        ok: true, 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    req.log?.error({ err: error }, 'Health check failed');
    logger.error({ err: error }, 'Health check failed');
    res.status(503).json({ 
      ok: false, 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
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

