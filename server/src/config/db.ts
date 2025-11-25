import { Pool } from 'pg';
import { env } from './env.js';
import { logger } from '../shared/logger.js';

export const pool = new Pool({
  host: env.PGHOST,
  port: env.PGPORT,
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
  max: 20, // Максимум соединений в pool
  idleTimeoutMillis: 30000, // Закрывать неиспользуемые соединения через 30 секунд
  connectionTimeoutMillis: 5000, // Таймаут подключения 5 секунд
});

// Обработка ошибок соединения
pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle client');
});
