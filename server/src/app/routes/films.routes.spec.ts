import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createFilmsRouter } from './films.routes.js';
import { FilmsController } from '../controllers/films.controller.js';
import type { FilmService } from '../../application/films/film.service.js';
import { env } from '../../config/env.js';

const film = {
  id: 10,
  title: 'Inception',
  poster_url: 'https://example.com/poster.jpg',
  rating: 8.8,
  year: 2010,
  description: 'Dream within a dream',
  kp_is_series: false,
  kp_episodes_count: null,
  kp_seasons_count: null,
  kp_id: 123,
  director: 'Christopher Nolan',
  budget: 160000000,
  revenue: 800000000,
  genres: ['Sci-Fi'],
  actors: ['Leonardo DiCaprio'],
  my_rating: 9,
  opinion: 'Amazing',
  status: 'Просмотрено',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: 1,
};

function makeToken(userId = 1) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, env.JWT_SECRET);
}

function buildApp(overrides: Partial<FilmService>) {
  const service = overrides as FilmService;
  const controller = new FilmsController(service);
  const router = createFilmsRouter(controller);
  const app = express();
  app.use(express.json());
  app.use('/api/films', router);
  return app;
}

describe('films routes', () => {
  it('возвращает фильмы пользователя', async () => {
    const listFilms = jest.fn().mockResolvedValue([film]);
    const app = buildApp({
      listFilms,
    });

    const response = await request(app)
      .get('/api/films')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([film]);
    expect(listFilms).toHaveBeenCalledWith(undefined, undefined, undefined, 1);
  });

  it('создаёт фильм', async () => {
    const createFilm = jest.fn().mockResolvedValue(film);
    const app = buildApp({
      createFilm,
    });

    const payload = { title: 'Inception' };
    const response = await request(app)
      .post('/api/films')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(film);
    expect(createFilm).toHaveBeenCalledWith(payload, 1);
  });

  it('обновляет фильм', async () => {
    const updateFilm = jest.fn().mockResolvedValue({ ...film, my_rating: 10 });
    const app = buildApp({
      updateFilm,
    });

    const response = await request(app)
      .put('/api/films/10')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ my_rating: 10 });

    expect(response.status).toBe(200);
    expect(response.body.my_rating).toBe(10);
    expect(updateFilm).toHaveBeenCalledWith(10, { my_rating: 10 }, 1);
  });

  it('удаляет фильм', async () => {
    const deleteFilm = jest.fn().mockResolvedValue(undefined);
    const app = buildApp({
      deleteFilm,
    });

    const response = await request(app)
      .delete('/api/films/10')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(204);
    expect(deleteFilm).toHaveBeenCalledWith(10, 1);
  });

  it('возвращает 401 без токена', async () => {
    const listFilms = jest.fn();
    const app = buildApp({
      listFilms,
    });

    const response = await request(app).get('/api/films');
    expect(response.status).toBe(401);
    expect(listFilms).not.toHaveBeenCalled();
  });
});

