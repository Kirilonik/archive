import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createAuthRouter } from './auth.routes.js';
import { AuthController } from '../controllers/auth.controller.js';
import type { AuthService } from '../../application/auth/auth.service.js';
import type { UserService } from '../../application/users/user.service.js';
import type { AuthUser } from '../../domain/auth/auth.types.js';
import { env } from '../../config/env.js';

const user: AuthUser = {
  id: 1,
  email: 'user@example.com',
  name: 'Tester',
  avatarUrl: null,
  authProvider: 'local',
  googleId: null,
};

function buildApp(authOverrides: Partial<AuthService>, userOverrides: Partial<UserService>) {
  const authService = authOverrides as AuthService;
  const userService = userOverrides as UserService;
  const controller = new AuthController(authService, (id) => userService.getUserById(id));
  const router = createAuthRouter(controller);
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', router);
  return app;
}

describe('auth routes', () => {
  it('регистрирует пользователя', async () => {
    const app = buildApp(
      {
        register: jest.fn().mockResolvedValue({
          user,
          tokens: {
            accessToken: jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET),
            refreshToken: jwt.sign({ id: user.id, email: user.email }, env.JWT_REFRESH_SECRET),
          },
        }),
        login: jest.fn(),
        rotateTokens: jest.fn(),
        verifyRefreshToken: jest.fn(),
      },
      {
        getUserById: jest.fn(),
      },
    );

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Tester', email: user.email, password: 'Password123' });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({
      id: 1,
      email: 'user@example.com',
      name: 'Tester',
      avatar_url: null,
    });
  });

  it('выполняет вход', async () => {
    const app = buildApp(
      {
        login: jest.fn().mockResolvedValue({
          user,
          tokens: {
            accessToken: jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET),
            refreshToken: jwt.sign({ id: user.id, email: user.email }, env.JWT_REFRESH_SECRET),
          },
        }),
        register: jest.fn(),
        rotateTokens: jest.fn(),
        verifyRefreshToken: jest.fn(),
      },
      {
        getUserById: jest.fn(),
      },
    );

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password' });

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
  });

  it('обновляет токены', async () => {
    const refresh = jwt.sign({ id: user.id, email: user.email }, env.JWT_REFRESH_SECRET);
    const app = buildApp(
      {
        rotateTokens: jest.fn().mockReturnValue({
          accessToken: jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET),
          refreshToken: refresh,
        }),
        verifyRefreshToken: jest.fn().mockReturnValue({ id: user.id, email: user.email }),
        register: jest.fn(),
        login: jest.fn(),
      },
      {
        getUserById: jest.fn().mockResolvedValue(user),
      },
    );

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refresh_token=${refresh}`]);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('возвращает 401 при обновлении без refresh cookie', async () => {
    const app = buildApp(
      {
        rotateTokens: jest.fn(),
        verifyRefreshToken: jest.fn(),
        register: jest.fn(),
        login: jest.fn(),
      },
      {
        getUserById: jest.fn(),
      },
    );

    const response = await request(app).post('/api/auth/refresh');
    expect(response.status).toBe(401);
  });
});

