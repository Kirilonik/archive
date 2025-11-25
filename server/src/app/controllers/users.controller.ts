import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../../application/users/user.service.js';
import { StatsService } from '../../application/stats/stats.service.js';
import { validateIdParam } from '../validators/params.schema.js';
import { logUnauthorizedAccessAttempt } from '../../middlewares/security-logger.js';

/**
 * Получение IP адреса клиента
 */
function getClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  return req.ip || 'unknown';
}

function toApiProfile(profile: {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}) {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatar_url: profile.avatarUrl,
  };
}

export class UsersController {
  constructor(
    private readonly userService: UserService,
    private readonly statsService: StatsService,
  ) {}

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const requestedId = validateIdParam(req.params.id);
      if (!userId || userId !== requestedId) {
        const ip = getClientIp(req);
        logUnauthorizedAccessAttempt(userId, requestedId, 'user_profile', ip);
        return res.status(403).json({ error: 'Forbidden' });
      }
      const profile = await this.userService.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: 'Not found' });
      }
      const stats = await this.statsService.getSummary(userId);
      res.json({
        profile: toApiProfile(profile),
        stats,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid ID')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number;
      const requestedId = validateIdParam(req.params.id);
      if (!userId || userId !== requestedId) {
        const ip = getClientIp(req);
        logUnauthorizedAccessAttempt(userId, requestedId, 'user_profile', ip);
        return res.status(403).json({ error: 'Forbidden' });
      }
      const updated = await this.userService.updateUserProfile(userId, {
        name: req.body?.name ?? null,
        avatarUrl: req.body?.avatar_url ?? null,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.json(toApiProfile(updated));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid ID')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number;
      const requestedId = validateIdParam(req.params.id);
      if (!userId || userId !== requestedId) {
        const ip = getClientIp(req);
        logUnauthorizedAccessAttempt(userId, requestedId, 'user_delete', ip);
        return res.status(403).json({ error: 'Forbidden' });
      }
      await this.userService.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid ID')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };

  getDetailedStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number;
      const requestedId = validateIdParam(req.params.id);
      if (!userId || userId !== requestedId) {
        const ip = getClientIp(req);
        logUnauthorizedAccessAttempt(userId, requestedId, 'user_stats', ip);
        return res.status(403).json({ error: 'Forbidden' });
      }
      const profile = await this.userService.getUserProfile(userId);
      if (!profile) return res.status(404).json({ error: 'Not found' });
      const stats = await this.statsService.getDetailed(userId);
      res.json(stats);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid ID')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };
}
