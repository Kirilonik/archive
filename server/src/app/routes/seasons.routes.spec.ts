import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createSeasonsRouter } from './seasons.routes.js';
import { SeasonsController } from '../controllers/seasons.controller.js';
import type { SeasonService } from '../../application/seasons/season.service.js';
import { env } from '../../config/env.js';

const season = {
  id: 3,
  series_id: 1,
  number: 2,
  watched: true,
  created_at: null,
  updated_at: null,
};

function makeToken(userId = 1) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, env.JWT_SECRET);
}

function buildApp(overrides: Partial<SeasonService>) {
  const service = overrides as SeasonService;
  const controller = new SeasonsController(service);
  const router = createSeasonsRouter(controller);
  const app = express();
  app.use(express.json());
  app.use('/api/seasons', router);
  return app;
}

describe('seasons routes', () => {
  it('возвращает сезоны пользователя', async () => {
    const listSeasons = jest.fn().mockResolvedValue([season]);
    const app = buildApp({
      listSeasons,
    });

    const response = await request(app)
      .get('/api/seasons/1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([season]);
    expect(listSeasons).toHaveBeenCalledWith(1, 1);
  });

  it('создаёт сезон', async () => {
    const createSeason = jest.fn().mockResolvedValue(season);
    const app = buildApp({
      createSeason,
    });

    const response = await request(app)
      .post('/api/seasons')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ series_id: 1, number: 2 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(season);
    expect(createSeason).toHaveBeenCalledWith(1, 2, 1);
  });

  it('помечает сезон просмотренным', async () => {
    const markSeasonWatched = jest.fn().mockResolvedValue({ id: 3, watched: true });
    const app = buildApp({
      markSeasonWatched,
    });

    const response = await request(app)
      .patch('/api/seasons/3/watched')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ watched: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 3, watched: true });
    expect(markSeasonWatched).toHaveBeenCalledWith(3, true, 1);
  });

  it('возвращает 401 без токена', async () => {
    const listSeasons = jest.fn();
    const app = buildApp({
      listSeasons,
    });

    const response = await request(app).get('/api/seasons/1');
    expect(response.status).toBe(401);
    expect(listSeasons).not.toHaveBeenCalled();
  });
});

