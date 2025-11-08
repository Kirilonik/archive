import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../src/routes/register';
import { errorMiddleware } from '../src/middlewares/error';

function buildApp() {
  const app = express();
  app.use(express.json());
  registerRoutes(app);
  app.use(errorMiddleware);
  return app;
}

describe('health', () => {
  it('GET /api/health returns ok', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});


