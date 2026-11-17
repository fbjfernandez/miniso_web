const express = require('express');
const cors = require('cors');

const apiRoutes = require('./routes/api');
const { AppError } = require('./errors');
const { buildCorsOptions } = require('./utils/cors');

function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada' });
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ ok: false, error: err.message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'JSON inválido' });
  }

  console.error(err);
  return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
}

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors(buildCorsOptions));
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', runtime: 'vercel-serverless' });
  });

  app.get('/', (req, res) => {
    res.json({ mensaje: 'Servidor MINISO funcionando ✅', version: '2.0.0' });
  });

  app.use('/api', apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
