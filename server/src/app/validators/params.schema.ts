import { z } from 'zod';

// Схема для валидации ID параметров из URL
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer'),
});

// Схема для валидации seriesId параметра
export const seriesIdParamSchema = z.object({
  seriesId: z.coerce.number().int().positive('Series ID must be a positive integer'),
});

// Схема для валидации seasonId параметра
export const seasonIdParamSchema = z.object({
  seasonId: z.coerce.number().int().positive('Season ID must be a positive integer'),
});

// Вспомогательная функция для валидации ID параметра
export function validateIdParam(id: string | undefined): number {
  const parsed = z.coerce.number().int().positive().safeParse(id);
  if (!parsed.success) {
    throw new Error('Invalid ID parameter: must be a positive integer');
  }
  return parsed.data;
}
