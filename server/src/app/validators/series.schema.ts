import { z } from 'zod';

export const seriesCreateSchema = z.object({
  title: z.string().min(1).max(500),
  kp_id: z.number().int().positive().optional(),
  poster_url: z.string().url().max(2000).optional(),
  rating: z.number().min(0).max(10).optional(),
  status: z.string().max(100).optional(),
  my_rating: z.number().min(0).max(10).optional(),
  opinion: z.string().max(50000).optional(), // Увеличено для markdown контента
  director: z.string().max(500).optional(),
  budget: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  revenue: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  genres: z.array(z.string().max(100)).max(50).optional(),
  actors: z.array(z.string().max(200)).max(100).optional(),
});

export const seriesUpdateSchema = seriesCreateSchema.partial();

export type SeriesCreateDto = z.infer<typeof seriesCreateSchema>;
export type SeriesUpdateDto = z.infer<typeof seriesUpdateSchema>;
