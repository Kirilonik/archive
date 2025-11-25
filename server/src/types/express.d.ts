import type { Logger } from 'pino';
import type { AuthUser } from '../middlewares/auth.js';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      log?: Logger;
      user?: AuthUser;
    }
  }
}

export {};
