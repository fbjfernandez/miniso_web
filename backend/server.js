require('dotenv').config();

const { assertEnvironment } = require('./config/env');

assertEnvironment();

const createApp = require('./app');

const app = createApp();
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const port = Number(process.env.PORT) || 3000;

  app.listen(port, () => {
    console.log(`Servidor MINISO disponible en http://localhost:${port}`);
  });
}

module.exports = app;
