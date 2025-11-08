import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createSeriesRouter } from './series.routes.js';
import { SeriesController } from '../controllers/series.controller.js';
import type { SeriesService } from '../../application/series/series.service.js';
import { env } from '../../config/env.js';

const series = {
  id: 5,
  title: 'Dark',
  poster_url: 'https://example.com/dark.jpg',
  rating: 9.0,
  year: 2017,
  description: 'Time travel mystery',
  kp_is_series: true,
  kp_episodes_count: 26,
  kp_seasons_count: 3,
  kp_id: 999,
  director: 'Baran bo Odar',
  budget: null,
  revenue: null,
  genres: ['Sci-Fi'],
  actors: ['Louis Hofmann'],
  my_rating: 9,
  opinion: 'Mind-bending',
  status: 'Смотрю',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: 1,
};

function makeToken(userId = 1) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, env.JWT_SECRET);
}

function buildApp(overrides: Partial<SeriesService>) {
  const service = overrides as SeriesService;
  const controller = new SeriesController(service);
  const router = createSeriesRouter(controller);
  const app = express();
  app.use(express.json());
  app.use('/api/series', router);
  return app;
}

describe('series routes', () => {
  it('возвращает сериалы пользователя', async () => {
    const listSeries = jest.fn().mockResolvedValue({
      items: [series],
      total: 1,
      limit: 24,
      offset: 0,
      hasMore: false,
    });
    const app = buildApp({
      listSeries,
    });

    const response = await request(app)
      .get('/api/series')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [series],
      total: 1,
      limit: 24,
      offset: 0,
      hasMore: false,
    });
    expect(listSeries).toHaveBeenCalledWith({
      query: undefined,
      status: undefined,
      ratingGte: undefined,
      limit: 24,
      offset: 0,
      userId: 1,
    });
  });

  it('создаёт сериал', async () => {
    const createSeries = jest.fn().mockResolvedValue(series);
    const app = buildApp({
      createSeries,
    });

    const payload = { title: 'Dark' };
    const response = await request(app)
      .post('/api/series')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(series);
    expect(createSeries).toHaveBeenCalledWith(payload, 1);
  });

  it('обновляет сериал', async () => {
    const updateSeries = jest.fn().mockResolvedValue({ ...series, status: 'Просмотрено' });
    const app = buildApp({
      updateSeries,
    });

    const response = await request(app)
      .put('/api/series/5')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'Просмотрено' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('Просмотрено');
    expect(updateSeries).toHaveBeenCalledWith(5, { status: 'Просмотрено' }, 1);
  });

  it('удаляет сериал', async () => {
    const deleteSeries = jest.fn().mockResolvedValue(undefined);
    const app = buildApp({
      deleteSeries,
    });

    const response = await request(app)
      .delete('/api/series/5')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(204);
    expect(deleteSeries).toHaveBeenCalledWith(5, 1);
  });

  it('возвращает 401 без токена', async () => {
    const listSeries = jest.fn();
    const app = buildApp({
      listSeries,
    });

    const response = await request(app).get('/api/series');
    expect(response.status).toBe(401);
    expect(listSeries).not.toHaveBeenCalled();
  });
});

