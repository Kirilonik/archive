import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import type { Express } from 'express';

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
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
}


