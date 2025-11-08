import { z } from 'zod';

export const filmCreateSchema = z.object({
  title: z.string().min(1),
  kp_id: z.number().int().positive().optional(),
  poster_url: z.string().url().optional(),
  rating: z.number().min(0).max(10).optional(),
  status: z.string().optional(),
  my_rating: z.number().min(0).max(10).optional(),
  opinion: z.string().max(5000).optional(),
  director: z.string().optional(),
  budget: z.number().int().optional(),
  revenue: z.number().int().optional(),
  genres: z.array(z.string()).optional(),
  actors: z.array(z.string()).optional(),
});

export const filmUpdateSchema = filmCreateSchema.partial();

export type FilmCreateDto = z.infer<typeof filmCreateSchema>;
export type FilmUpdateDto = z.infer<typeof filmUpdateSchema>;

