import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { UserService } from '../../application/users/user.service.js';
import type { StatsService } from '../../application/stats/stats.service.js';
import { env } from '../../config/env.js';
import type { UserProfile } from '../../domain/users/user.types.js';
import type { UserSummaryStats, UserDetailedStats } from '../../domain/stats/stats.types.js';
import { UsersController } from '../controllers/users.controller.js';
import { createUsersRouter } from './users.routes.js';

const profile: UserProfile = {
  id: 1,
  email: 'user@example.com',
  name: 'Tester',
  avatarUrl: null,
};

const summary: UserSummaryStats = {
  films: 2,
  series: 1,
  avgRating: 8.5,
  watchedEpisodes: 12,
  totalSeasons: 3,
  totalEpisodes: 15,
  filmsWithRating: 2,
  seriesWithRating: 1,
  filmsWithOpinion: 1,
  seriesWithOpinion: 1,
  filmsDurationMinutes: 180,
  seriesDurationMinutes: 420,
};

const detailed: UserDetailedStats = {
  genres: [{ genre: 'Drama', count: 2 }],
  years: [{ year: 2022, count: 2 }],
  ratings: [{ range: '8-10', count: 3 }],
  filmsVsSeries: { films: 2, series: 1 },
  monthly: [{ month: '2025-01', count: 2 }],
  avgRatingByGenre: [{ genre: 'Drama', avgRating: 8.5, count: 2 }],
  statuses: [{ status: 'Просмотрено', count: 3 }],
  directors: [{ director: 'John Doe', count: 1 }],
};

function token(userId = 1) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, env.JWT_SECRET);
}

function buildApp(userOverrides: Partial<UserService>, statsOverrides: Partial<StatsService>) {
  const userService = userOverrides as UserService;
  const statsService = statsOverrides as StatsService;
  const controller = new UsersController(userService, statsService);
  const router = createUsersRouter(controller);
  const app = express();
  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const tokenValue = header.slice('Bearer '.length);
    try {
      const payload = jwt.verify(tokenValue, env.JWT_SECRET) as { id: number; email: string };
      (req as any).user = { id: payload.id, email: payload.email };
      next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  });
  app.use('/api/users', router);
  return app;
}

describe('users stats routes', () => {
  it('возвращает профиль и сводную статистику', async () => {
    const summaryMock = jest.fn().mockResolvedValue(summary);
    const app = buildApp(
      {
        getUserProfile: jest.fn().mockResolvedValue(profile),
        updateUserProfile: jest.fn(),
        deleteUser: jest.fn(),
      },
      {
        getSummary: summaryMock,
        getDetailed: jest.fn(),
      },
    );

    const response = await request(app)
      .get('/api/users/1')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.profile).toEqual({
      id: 1,
      email: 'user@example.com',
      name: 'Tester',
      avatar_url: null,
    });
    expect(response.body.stats).toEqual(summary);
    expect(summaryMock).toHaveBeenCalledWith(1);
  });

  it('возвращает детальную статистику', async () => {
    const detailedMock = jest.fn().mockResolvedValue(detailed);
    const app = buildApp(
      {
        getUserProfile: jest.fn().mockResolvedValue(profile),
        updateUserProfile: jest.fn(),
        deleteUser: jest.fn(),
      },
      {
        getSummary: jest.fn(),
        getDetailed: detailedMock,
      },
    );

    const response = await request(app)
      .get('/api/users/1/stats/detailed')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(detailed);
    expect(detailedMock).toHaveBeenCalledWith(1);
  });

  it('возвращает 403 при запросе чужой статистики', async () => {
    const app = buildApp(
      {
        getUserProfile: jest.fn(),
        updateUserProfile: jest.fn(),
        deleteUser: jest.fn(),
      },
      {
        getSummary: jest.fn(),
        getDetailed: jest.fn(),
      },
    );

    const response = await request(app)
      .get('/api/users/2')
      .set('Authorization', `Bearer ${token(1)}`);

    expect(response.status).toBe(403);
  });

  it('возвращает 401 без авторизации', async () => {
    const app = buildApp(
      {
        getUserProfile: jest.fn(),
        updateUserProfile: jest.fn(),
        deleteUser: jest.fn(),
      },
      {
        getSummary: jest.fn(),
        getDetailed: jest.fn(),
      },
    );

    const response = await request(app).get('/api/users/1');
    expect(response.status).toBe(401);
  });
});

