import { z } from 'zod';
import { resolveAppConfig } from '@media/shared';

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().positive().optional(),

    PGHOST: z.string().min(1).default('localhost'),
    PGPORT: z.coerce.number().int().positive().default(5432),
    PGUSER: z.string().min(1).default('postgres'),
    PGPASSWORD: z.string().min(1).default('postgres'),
    PGDATABASE: z.string().min(1).default('media_archive'),

    JWT_SECRET: z
      .string()
      .min(10, 'JWT_SECRET must be at least 10 characters long')
      .refine(
        (val) => {
          // Проверяем NODE_ENV из process.env
          const isProd = process.env.NODE_ENV === 'production';
          // Для миграций (когда запускается migrate.js) разрешаем дефолтные значения
          const isMigration = process.argv[1]?.includes('migrate.js');
          if (!isProd || isMigration) return true;
          // В продакшене проверяем, что секрет не дефолтный
          const isDefault = val === 'dev-access-secret-change-me' || val === 'postgres';
          return !isDefault && val.length >= 32;
        },
        { message: 'JWT_SECRET must be at least 32 characters long in production and not use default value' },
      )
      .optional(),
    JWT_REFRESH_SECRET: z
      .string()
      .min(10, 'JWT_REFRESH_SECRET must be at least 10 characters long')
      .refine(
        (val) => {
          const isProd = process.env.NODE_ENV === 'production';
          // Для миграций разрешаем дефолтные значения
          const isMigration = process.argv[1]?.includes('migrate.js');
          if (!isProd || isMigration) return true;
          const isDefault = val === 'dev-refresh-secret-change-me' || val === 'postgres';
          return !isDefault && val.length >= 32;
        },
        { message: 'JWT_REFRESH_SECRET must be at least 32 characters long in production and not use default value' },
      )
      .optional(),

    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    KINOPOISK_API_URL: z
      .string()
      .url()
      .default('https://kinopoiskapiunofficial.tech'),
    KINOPOISK_API_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    API_BASE_URL: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    SWAGGER_USER: z.string().optional(),
    SWAGGER_PASSWORD: z.string().optional(),
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

const appConfig = resolveAppConfig(process.env);
const corsOriginsRaw = parseCorsOrigins(parsed.data.CORS_ALLOWED_ORIGINS);
const corsOrigins = corsOriginsRaw.map((origin) => {
  try {
    return new URL(origin).toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`CORS_ALLOWED_ORIGINS must contain valid URLs (received "${origin}")`);
  }
});

const allowedOrigins = [appConfig.frontendUrl, ...corsOrigins].filter(
  (origin, index, array) => array.indexOf(origin) === index,
);

// Для миграций используем дефолтные значения, если переменные не установлены
const isMigration = process.argv[1]?.includes('migrate.js');

export const env = {
  ...parsed.data,
  API_BASE_URL: appConfig.apiBaseUrl,
  FRONTEND_URL: appConfig.frontendUrl,
  corsOrigins,
  allowedOrigins,
  // Для миграций эти переменные могут быть не установлены
  KINOPOISK_API_KEY: parsed.data.KINOPOISK_API_KEY || '',
  GOOGLE_CLIENT_ID: parsed.data.GOOGLE_CLIENT_ID || '',
  // Для миграций используем дефолтные значения JWT секретов
  JWT_SECRET: parsed.data.JWT_SECRET || (isMigration ? 'migration-temp-secret-key-min-32-chars' : ''),
  JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET || (isMigration ? 'migration-temp-refresh-secret-key-min-32-chars' : ''),
};

