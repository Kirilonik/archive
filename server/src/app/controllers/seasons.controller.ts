import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SeasonService } from '../../application/seasons/season.service.js';
import { seasonCreateSchema, seasonMarkSchema } from '../validators/seasons.schema.js';

export class SeasonsController {
  constructor(private readonly seasonService: SeasonService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const items = await this.seasonService.listSeasons(Number(req.params.seriesId), userId);
      res.json(items);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const body = seasonCreateSchema.parse(req.body);
      const created = await this.seasonService.createSeason(body.series_id, body.number, userId);
      res.status(201).json(created);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      if (error?.status === 403) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      await this.seasonService.deleteSeason(Number(req.params.id), userId);
      res.status(204).send();
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next(error);
    }
  };

  markWatched = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const { watched } = seasonMarkSchema.parse(req.body);
      const updated = await this.seasonService.markSeasonWatched(Number(req.params.id), watched, userId);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      if (error?.status === 403) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next(error);
    }
  };
}

