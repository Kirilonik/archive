import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createEpisodesRouter } from './episodes.routes.js';
import { EpisodesController } from '../controllers/episodes.controller.js';
import type { EpisodeService } from '../../application/episodes/episode.service.js';
import { env } from '../../config/env.js';

const episode = {
  id: 7,
  season_id: 3,
  number: 1,
  title: 'Episode 1',
  release_date: '2024-01-01',
  duration: 45,
  watched: false,
  created_at: null,
  updated_at: null,
};

function makeToken(userId = 1) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, env.JWT_SECRET);
}

function buildApp(overrides: Partial<EpisodeService>) {
  const service = overrides as EpisodeService;
  const controller = new EpisodesController(service);
  const router = createEpisodesRouter(controller);
  const app = express();
  app.use(express.json());
  app.use('/api/episodes', router);
  return app;
}

describe('episodes routes', () => {
  it('возвращает эпизоды пользователя', async () => {
    const listEpisodes = jest.fn().mockResolvedValue([episode]);
    const app = buildApp({
      listEpisodes,
    });

    const response = await request(app)
      .get('/api/episodes/3')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([episode]);
    expect(listEpisodes).toHaveBeenCalledWith(3, 1);
  });

  it('создаёт эпизод', async () => {
    const createEpisode = jest.fn().mockResolvedValue(episode);
    const app = buildApp({
      createEpisode,
    });

    const response = await request(app)
      .post('/api/episodes')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ season_id: 3, number: 1, title: 'Episode 1' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(episode);
    expect(createEpisode).toHaveBeenCalledWith(3, 1, 'Episode 1', 1, null, null);
  });

  it('отмечает эпизод просмотренным', async () => {
    const markEpisodeWatched = jest.fn().mockResolvedValue({ id: 7, watched: true });
    const app = buildApp({
      markEpisodeWatched,
    });

    const response = await request(app)
      .patch('/api/episodes/7/watched')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ watched: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 7, watched: true });
    expect(markEpisodeWatched).toHaveBeenCalledWith(7, true, 1);
  });

  it('возвращает 401 без токена', async () => {
    const listEpisodes = jest.fn();
    const app = buildApp({
      listEpisodes,
    });

    const response = await request(app).get('/api/episodes/3');
    expect(response.status).toBe(401);
    expect(listEpisodes).not.toHaveBeenCalled();
  });
});
