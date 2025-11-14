import { Router } from 'express';
import { register } from '../monitoring/metrics.js';

export const router = Router();

/**
 * Эндпоинт для Prometheus
 * Prometheus будет обращаться к этому эндпоинту для сбора метрик
 */
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

