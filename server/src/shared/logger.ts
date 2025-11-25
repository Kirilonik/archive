import pino from 'pino';
import { env } from '../config/env.js';

const level = env.NODE_ENV === 'production' ? 'info' : 'debug';

export const logger = pino({
  level,
  base: { service: 'media-archive-server' },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
