import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const setupSwagger = (app: Express): void => {
  const specPath = join(__dirname, '..', 'docs', 'openapi.json');
  const swaggerDocument = JSON.parse(readFileSync(specPath, 'utf-8'));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customSiteTitle: 'Chat App API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      deepLinking: true,
    },
  }));

  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
};
