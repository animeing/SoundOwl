import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { configureFrontend } from './server/frontend.js';
import { configureApi } from './server/api.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

configureFrontend(app);
configureApi(app);

export default app;

const entryFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] === entryFilePath) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
