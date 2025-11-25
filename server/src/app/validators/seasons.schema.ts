import { z } from 'zod';

export const seasonCreateSchema = z.object({
  series_id: z.number().int().positive(),
  number: z.number().int().positive(),
});

export const seasonUpdateSchema = z.object({
  number: z.number().int().positive(),
});

export const seasonMarkSchema = z.object({
  watched: z.boolean(),
});
