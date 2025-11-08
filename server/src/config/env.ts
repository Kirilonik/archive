import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().positive().optional(),

    PGHOST: z.string().min(1).default('localhost'),
    PGPORT: z.coerce.number().int().positive().default(5432),
    PGUSER: z.string().min(1).default('postgres'),
    PGPASSWORD: z.string().min(1).default('postgres'),
    PGDATABASE: z.string().min(1).default('media_archive'),

    JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters long'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(10, 'JWT_REFRESH_SECRET must be at least 10 characters long')
      .optional(),

    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    KINOPOISK_API_URL: z
      .string()
      .url()
      .default('https://kinopoiskapiunofficial.tech'),
    KINOPOISK_API_KEY: z.string().min(1, 'KINOPOISK_API_KEY is required'),
  })
  .transform((values) => ({
    ...values,
    JWT_REFRESH_SECRET: values.JWT_REFRESH_SECRET ?? `${values.JWT_SECRET}-refresh`,
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.flatten();
  const message = Object.entries(formatted.fieldErrors)
    .map(([key, errors]) => `${key}: ${errors?.join(', ')}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsed.data;

