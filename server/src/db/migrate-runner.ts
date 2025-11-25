#!/usr/bin/env node
/**
 * Отдельный скрипт для запуска миграций
 * Устанавливает IS_MIGRATION=true для безопасной проверки в env.ts
 */
process.env.IS_MIGRATION = 'true';

import { runMigrations } from './migrate.js';
import { logger } from '../shared/logger.js';

runMigrations()
  .then(() => {
    logger.info('Migrations completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ err }, 'Migration failed');
    process.exit(1);
  });
