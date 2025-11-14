import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EpisodeService } from '../../application/episodes/episode.service.js';
import { episodeCreateSchema, episodeUpdateSchema, episodeMarkSchema } from '../validators/episodes.schema.js';

export class EpisodesController {
  constructor(private readonly episodeService: EpisodeService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const items = await this.episodeService.listEpisodes(Number(req.params.seasonId), userId);
      res.json(items);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const body = episodeCreateSchema.parse(req.body);
      const created = await this.episodeService.createEpisode(
        body.season_id,
        body.number,
        body.title,
        userId,
        body.release_date ?? null,
        body.duration ?? null,
      );
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

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const body = episodeUpdateSchema.parse(req.body);
      const updated = await this.episodeService.updateEpisode(Number(req.params.id), body, userId);
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
      const userId = req.user?.id as number | undefined;
      await this.episodeService.deleteEpisode(Number(req.params.id), userId);
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
      const { watched } = episodeMarkSchema.parse(req.body);
      const updated = await this.episodeService.markEpisodeWatched(Number(req.params.id), watched ?? true, userId);
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

