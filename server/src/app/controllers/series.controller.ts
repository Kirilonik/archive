import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { seriesCreateSchema, seriesUpdateSchema } from '../validators/series.schema.js';
import { SeriesService } from '../../application/series/series.service.js';

const listQuerySchema = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
  ratingGte: z
    .preprocess((val) => {
      if (typeof val === 'string' && val.trim() !== '') return Number(val);
      if (typeof val === 'number') return val;
      return undefined;
    }, z.number().min(0).max(10).optional()),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number | undefined;
      const { query, status, ratingGte, limit, offset } = listQuerySchema.parse({
        query: req.query.query,
        status: req.query.status,
        ratingGte: req.query.ratingGte,
        limit: req.query.limit,
        offset: req.query.offset,
      });
      const data = await this.seriesService.listSeries({
        query,
        status,
        ratingGte,
        limit,
        offset,
        userId,
      });
      res.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number | undefined;
      const item = await this.seriesService.getSeries(Number(req.params.id), userId);
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    } catch (error) {
      next(error);
    }
  };

  getConceptArt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number | undefined;
      const payload = await this.seriesService.getSeriesConceptArt(Number(req.params.id), userId);
      if (!payload) return res.status(404).json({ error: 'Not found' });
      res.json(payload);
    } catch (error) {
      next(error);
    }
  };

  getPosters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number | undefined;
      const payload = await this.seriesService.getSeriesPosters(Number(req.params.id), userId);
      if (!payload) return res.status(404).json({ error: 'Not found' });
      res.json(payload);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const body = seriesCreateSchema.parse(req.body);
      const created = await this.seriesService.createSeries(body, userId);
      res.status(201).json(created);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      if (error?.status === 409) {
        return res.status(409).json({ error: 'Already exists' });
      }
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number | undefined;
      const body = seriesUpdateSchema.parse(req.body);
      const updated = await this.seriesService.updateSeries(Number(req.params.id), body, userId);
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

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      await this.seriesService.deleteSeries(Number(req.params.id), userId);
      res.status(204).send();
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next(error);
    }
  };
}

