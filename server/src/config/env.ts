import { z } from 'zod';
import { resolveAppConfig } from './app-config.js';

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
          // Для миграций используем переменную окружения вместо process.argv для безопасности
          const isMigration = process.env.IS_MIGRATION === 'true';
          if (!isProd || isMigration) return true;
          // В продакшене проверяем, что секрет не дефолтный
          const isDefault = val === 'dev-access-secret-change-me' || val === 'postgres';
          return !isDefault && val.length >= 32;
        },
        {
          message:
            'JWT_SECRET must be at least 32 characters long in production and not use default value',
        },
      )
      .optional(),
    JWT_REFRESH_SECRET: z
      .string()
      .min(10, 'JWT_REFRESH_SECRET must be at least 10 characters long')
      .refine(
        (val) => {
          const isProd = process.env.NODE_ENV === 'production';
          // Для миграций используем переменную окружения вместо process.argv для безопасности
          const isMigration = process.env.IS_MIGRATION === 'true';
          if (!isProd || isMigration) return true;
          const isDefault = val === 'dev-refresh-secret-change-me' || val === 'postgres';
          return !isDefault && val.length >= 32;
        },
        {
          message:
            'JWT_REFRESH_SECRET must be at least 32 characters long in production and not use default value',
        },
      )
      .optional(),

    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    KINOPOISK_API_URL: z.string().url().default('https://kinopoiskapiunofficial.tech'),
    KINOPOISK_API_KEY: z.string().optional(),
    YOUTUBE_API_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    API_BASE_URL: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    SWAGGER_USER: z.string().optional(),
    SWAGGER_PASSWORD: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_SECURE: z.coerce.boolean().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().email().optional(),
    EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),
    PASSWORD_RESET_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(1),
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

// Для миграций используем переменную окружения вместо process.argv для безопасности
const isMigration = process.env.IS_MIGRATION === 'true';

export const env = {
  ...parsed.data,
  API_BASE_URL: appConfig.apiBaseUrl,
  FRONTEND_URL: appConfig.frontendUrl,
  corsOrigins,
  allowedOrigins,
  // Для миграций эти переменные могут быть не установлены
  KINOPOISK_API_KEY: parsed.data.KINOPOISK_API_KEY || '',
  YOUTUBE_API_KEY: parsed.data.YOUTUBE_API_KEY || '',
  GOOGLE_CLIENT_ID: parsed.data.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: parsed.data.GOOGLE_CLIENT_SECRET || '',
  // Для миграций используем дефолтные значения JWT секретов
  JWT_SECRET:
    parsed.data.JWT_SECRET || (isMigration ? 'migration-temp-secret-key-min-32-chars' : ''),
  JWT_REFRESH_SECRET:
    parsed.data.JWT_REFRESH_SECRET ||
    (isMigration ? 'migration-temp-refresh-secret-key-min-32-chars' : ''),
  // SMTP настройки
  SMTP_HOST: parsed.data.SMTP_HOST || '',
  SMTP_PORT: parsed.data.SMTP_PORT || 587,
  SMTP_SECURE: parsed.data.SMTP_SECURE ?? false,
  SMTP_USER: parsed.data.SMTP_USER || '',
  SMTP_PASSWORD: parsed.data.SMTP_PASSWORD || '',
  SMTP_FROM: parsed.data.SMTP_FROM || 'noreply@example.com',
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: parsed.data.EMAIL_VERIFICATION_TOKEN_TTL_HOURS || 24,
  PASSWORD_RESET_TOKEN_TTL_HOURS: parsed.data.PASSWORD_RESET_TOKEN_TTL_HOURS || 1,
};
