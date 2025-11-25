import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EpisodeService } from '../../application/episodes/episode.service.js';
import {
  episodeCreateSchema,
  episodeUpdateSchema,
  episodeMarkSchema,
} from '../validators/episodes.schema.js';
import { validateIdParam } from '../validators/params.schema.js';
import { isErrorWithStatus } from '../../shared/error-utils.js';

export class EpisodesController {
  constructor(private readonly episodeService: EpisodeService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const seasonId = validateIdParam(req.params.seasonId);
      const items = await this.episodeService.listEpisodes(seasonId, userId);
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

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const id = validateIdParam(req.params.id);
      const body = episodeUpdateSchema.parse(req.body);
      const updated = await this.episodeService.updateEpisode(id, body, userId);
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

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      const id = validateIdParam(req.params.id);
      await this.episodeService.deleteEpisode(id, userId);
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
      const { watched } = episodeMarkSchema.parse(req.body);
      const updated = await this.episodeService.markEpisodeWatched(id, watched ?? true, userId);
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
