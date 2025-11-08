import { z } from 'zod';

export const episodeCreateSchema = z.object({
  season_id: z.number().int().positive(),
  number: z.number().int().positive(),
  title: z.string().optional(),
  release_date: z.string().optional(),
  duration: z.number().int().optional(),
});

export const episodeUpdateSchema = z.object({
  number: z.number().int().positive().optional(),
  title: z.string().optional(),
  release_date: z.string().nullable().optional(),
  duration: z.number().int().nullable().optional(),
});

export const episodeMarkSchema = z.object({
  watched: z.boolean(),
});

