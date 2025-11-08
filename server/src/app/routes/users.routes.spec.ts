import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createUsersRouter } from './users.routes.js';
import { UsersController } from '../controllers/users.controller.js';
import type { UserService } from '../../application/users/user.service.js';
import type { StatsService } from '../../application/stats/stats.service.js';
import type { UserProfile } from '../../domain/users/user.types.js';
import type { UserSummaryStats, UserDetailedStats } from '../../domain/stats/stats.types.js';
import { env } from '../../config/env.js';

const profile: UserProfile = {
  id: 1,
  email: 'user@example.com',
  name: 'Test User',
  avatarUrl: null,
};

const summaryStats: UserSummaryStats = {
  films: 1,
  series: 2,
  avgRating: 7.5,
  watchedEpisodes: 5,
  totalSeasons: 3,
  totalEpisodes: 12,
  filmsWithRating: 1,
  seriesWithRating: 2,
  filmsWithOpinion: 1,
  seriesWithOpinion: 1,
  filmsDurationMinutes: 95,
  seriesDurationMinutes: 360,
};

const detailedStats: UserDetailedStats = {
  genres: [],
  years: [],
  ratings: [],
  filmsVsSeries: { films: 1, series: 2 },
  monthly: [],
  avgRatingByGenre: [],
  statuses: [],
  directors: [],
};

function createTestApp(service: Partial<UserService>, stats: Partial<StatsService>) {
  const userService = service as UserService;
  const statsService = stats as StatsService;
  const controller = new UsersController(userService, statsService);
  const router = createUsersRouter(controller);
  const app = express();
  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = header.slice('Bearer '.length);
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { id: number; email: string };
      (req as any).user = { id: payload.id, email: payload.email };
      next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  });
  app.use('/api/users', router);
  return app;
}

function makeToken(userId = 1) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, env.JWT_SECRET);
}

describe('users routes', () => {
  it('возвращает профиль текущего пользователя', async () => {
    const app = createTestApp(
      {
        getUserProfile: jest.fn().mockResolvedValue(profile),
        updateUserProfile: jest.fn(),
        deleteUser: jest.fn(),
      },
      {
        getSummary: jest.fn().mockResolvedValue(summaryStats),
        getDetailed: jest.fn(),
      },
    );

    const response = await request(app)
      .get('/api/users/1')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(response.status).toBe(200);
    expect(response.body.profile).toEqual({
      id: 1,
      email: 'user@example.com',
      name: 'Test User',
      avatar_url: null,
    });
    expect(response.body.stats).toEqual(summaryStats);
  });

  it('возвращает 403 при попытке доступа к чужому профилю', async () => {
    const app = createTestApp(
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
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(response.status).toBe(403);
  });

  it('обновляет профиль и возвращает snake_case поля', async () => {
    const app = createTestApp(
      {
        updateUserProfile: jest.fn().mockResolvedValue(profile),
        getUserProfile: jest.fn(),
        deleteUser: jest.fn(),
      },
      {
        getSummary: jest.fn(),
        getDetailed: jest.fn(),
      },
    );

    const response = await request(app)
      .put('/api/users/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ name: 'Updated', avatar_url: 'data:image/png;base64,abc' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      email: 'user@example.com',
      name: 'Test User',
      avatar_url: null,
    });
  });

  it('возвращает расширенную статистику', async () => {
    const app = createTestApp(
      {
        getUserProfile: jest.fn().mockResolvedValue(profile),
        updateUserProfile: jest.fn(),
        deleteUser: jest.fn(),
      },
      {
        getSummary: jest.fn(),
        getDetailed: jest.fn().mockResolvedValue(detailedStats),
      },
    );

    const response = await request(app)
      .get('/api/users/1/stats/detailed')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(detailedStats);
  });
});

