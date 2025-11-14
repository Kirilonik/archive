import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthUser {
  id: number;
  email: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers['authorization'];
    let token: string | null = null;
    if (header?.startsWith('Bearer ')) {
      token = header.slice('Bearer '.length);
    } else if (req.cookies?.access_token) {
      token = req.cookies.access_token;
    }
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
