import { Router } from 'express';
import { pool } from '../config/db.js';
import { logger } from '../shared/logger.js';

export const router = Router();

router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, status: 'healthy' });
  } catch (error) {
    req.log?.error({ err: error }, 'Health check failed');
    logger.error({ err: error }, 'Health check failed');
    res.status(503).json({ ok: false, status: 'unhealthy' });
  }
});

