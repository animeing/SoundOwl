import express from 'express';

export function configureApi(app) {
  const router = express.Router();

  app.use('/api', router);
}
