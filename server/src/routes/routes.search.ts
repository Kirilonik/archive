import { Router } from 'express';
import { container } from '../app/container.js';
import { logger } from '../shared/logger.js';

export const router = Router();

router.get('/suggest', async (req, res, next) => {
  try {
    const q = typeof req.query.query === 'string' ? req.query.query : '';
    if (!q) {
      return res.json([]);
    }
    const items = await container.integrations.kinopoisk.suggest(q);
    logger.debug({ query: q, count: items.length }, 'Search suggest request');
    res.json(items);
  } catch (e) {
    logger.error({ err: e, query: req.query.query }, 'Error in search suggest route');
    next(e);
  }
});


