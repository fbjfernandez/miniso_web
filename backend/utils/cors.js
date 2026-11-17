const { AppError } = require('../errors');
const getAllowedOrigins = require('./corsOrigins');

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = ['Content-Type', 'Authorization'];

function firstHeaderValue(value) {
  if (!value) return '';
  return String(value).split(',')[0].trim();
}

function resolveRequestOrigin(req) {
  const host = firstHeaderValue(req.headers['x-forwarded-host'] || req.headers.host);
  if (!host) return null;

  const protocol = firstHeaderValue(req.headers['x-forwarded-proto']) || req.protocol || 'https';
  return `${protocol}://${host}`;
}

function buildCorsOptions(req, callback) {
  const allowedOrigins = getAllowedOrigins(process.env.ALLOWED_ORIGINS);
  const requestOrigin = resolveRequestOrigin(req);

  callback(null, {
    origin(origin, done) {
      const isAllowed =
        !origin ||
        origin === 'null' ||
        origin === requestOrigin ||
        allowedOrigins.has(origin);

      if (isAllowed) return done(null, true);
      done(new AppError('Origen no permitido por CORS', 403));
    },
    methods: METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    optionsSuccessStatus: 204,
  });
}

module.exports = { buildCorsOptions };
