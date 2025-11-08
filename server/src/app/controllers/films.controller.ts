import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { filmCreateSchema, filmUpdateSchema } from '../validators/films.schema.js';
import { FilmService } from '../../application/films/film.service.js';

const listQuerySchema = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
  ratingGte: z
    .preprocess((val) => {
      if (typeof val === 'string' && val.trim() !== '') return Number(val);
      if (typeof val === 'number') return val;
      return undefined;
    }, z.number().min(0).max(10).optional()),
});

export class FilmsController {
  constructor(private readonly filmService: FilmService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number | undefined;
      const { query, status, ratingGte } = listQuerySchema.parse({
        query: req.query.query,
        status: req.query.status,
        ratingGte: req.query.ratingGte,
      });
      const data = await this.filmService.listFilms(query, status, ratingGte, userId);
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
      const film = await this.filmService.getFilm(Number(req.params.id), userId);
      if (!film) return res.status(404).json({ error: 'Not found' });
      res.json(film);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const body = filmCreateSchema.parse(req.body);
      const created = await this.filmService.createFilm(body, userId);
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
      const body = filmUpdateSchema.parse(req.body);
      const updated = await this.filmService.updateFilm(Number(req.params.id), body, userId);
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
      await this.filmService.deleteFilm(Number(req.params.id), userId);
      res.status(204).send();
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next(error);
    }
  };
}

