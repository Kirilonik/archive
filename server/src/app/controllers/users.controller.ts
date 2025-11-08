import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../../application/users/user.service.js';
import { StatsService } from '../../application/stats/stats.service.js';

function toApiProfile(profile: { id: number; email: string; name: string | null; avatarUrl: string | null }) {
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
      const userId = (req as any).user?.id as number;
      const requestedId = Number(req.params.id);
      if (!userId || userId !== requestedId) {
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
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number;
      const requestedId = Number(req.params.id);
      if (!userId || userId !== requestedId) {
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
      next(error);
    }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number;
      const requestedId = Number(req.params.id);
      if (!userId || userId !== requestedId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await this.userService.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  getDetailedStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number;
      const requestedId = Number(req.params.id);
      if (!userId || userId !== requestedId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const profile = await this.userService.getUserProfile(userId);
      if (!profile) return res.status(404).json({ error: 'Not found' });
      const stats = await this.statsService.getDetailed(userId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };
}

