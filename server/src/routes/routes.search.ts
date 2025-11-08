import { Router } from 'express';
import { container } from '../app/container.js';

export const router = Router();

router.get('/suggest', async (req, res, next) => {
  try {
    const q = typeof req.query.query === 'string' ? req.query.query : '';
    const items = await container.integrations.kinopoisk.suggest(q);
    res.json(items);
  } catch (e) {
    next(e);
  }
});


