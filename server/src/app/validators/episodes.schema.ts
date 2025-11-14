import { z } from 'zod';

export const episodeCreateSchema = z.object({
  season_id: z.number().int().positive(),
  number: z.number().int().positive().max(10000),
  title: z.string().max(500).optional(),
  release_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  duration: z.number().int().min(0).max(10000).optional(), // Максимум 10000 минут (~166 часов)
});

export const episodeUpdateSchema = z.object({
  number: z.number().int().positive().max(10000).optional(),
  title: z.string().max(500).optional(),
  release_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  duration: z.number().int().min(0).max(10000).nullable().optional(),
});

export const episodeMarkSchema = z.object({
  watched: z.boolean(),
});

