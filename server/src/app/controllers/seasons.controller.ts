import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SeasonService } from '../../application/seasons/season.service.js';
import { seasonCreateSchema, seasonMarkSchema } from '../validators/seasons.schema.js';
import { validateIdParam } from '../validators/params.schema.js';
import { isErrorWithStatus } from '../../shared/error-utils.js';

export class SeasonsController {
  constructor(private readonly seasonService: SeasonService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const seriesId = validateIdParam(req.params.seriesId);
      const items = await this.seasonService.listSeasons(seriesId, userId);
      res.json(items);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid ID')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const body = seasonCreateSchema.parse(req.body);
      const created = await this.seasonService.createSeason(body.series_id, body.number, userId);
      res.status(201).json(created);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      if (isErrorWithStatus(error) && error.status === 403) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const id = validateIdParam(req.params.id);
      await this.seasonService.deleteSeason(id, userId);
      res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Invalid ID')) {
        return res.status(400).json({ error: error.message });
      }
      if (isErrorWithStatus(error) && error.status === 403) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next(error);
    }
  };

  markWatched = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const id = validateIdParam(req.params.id);
      const { watched } = seasonMarkSchema.parse(req.body);
      const updated = await this.seasonService.markSeasonWatched(id, watched, userId);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      res.json(updated);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Invalid ID')) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      if (isErrorWithStatus(error) && error.status === 403) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next(error);
    }
  };
}

