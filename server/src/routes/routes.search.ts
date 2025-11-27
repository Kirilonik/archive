import { Router } from 'express';
import { container } from '../app/container.js';
import { logger } from '../shared/logger.js';

export const router = Router();

router.get('/suggest', async (req, res, next) => {
  try {
    const q = typeof req.query.query === 'string' ? req.query.query : '';
    if (!q) {
      logger.debug({ query: q, reason: 'empty query' }, 'Search suggest - empty query');
      return res.json([]);
    }

    logger.debug(
      {
        query: q,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        headers: {
          referer: req.get('referer'),
          origin: req.get('origin'),
        },
      },
      'Search suggest request received',
    );

    const items = await container.integrations.kinopoisk.suggest(q);
    logger.info(
      {
        query: q,
        count: items.length,
        items: items.length > 0 ? items.slice(0, 3).map((i) => ({ id: i.id, title: i.title })) : [],
      },
      'Search suggest request completed',
    );
    res.json(items);
  } catch (e) {
    logger.error(
      {
        err: e,
        query: req.query.query,
        ip: req.ip,
        stack: e instanceof Error ? e.stack : undefined,
      },
      'Error in search suggest route',
    );
    next(e);
  }
});
