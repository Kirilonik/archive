import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import type { Express, Request, Response, NextFunction } from 'express';
import basicAuth from 'basic-auth';
import { env } from '../config/env.js';

function swaggerGuard(req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV !== 'production') {
    next();
    return;
  }
  const credentials = basicAuth(req);
  if (
    credentials &&
    env.SWAGGER_USER &&
    env.SWAGGER_PASSWORD &&
    credentials.name === env.SWAGGER_USER &&
    credentials.pass === env.SWAGGER_PASSWORD
  ) {
    next();
    return;
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="Swagger UI"');
  res.status(401).end('Authentication required');
}

export function registerSwagger(app: Express) {
  const options = {
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'Archive API',
        version: '1.0.0'
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    apis: [] as string[]
  };
  const spec = swaggerJSDoc(options as any);
  app.use('/api/docs', swaggerGuard, swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
}


