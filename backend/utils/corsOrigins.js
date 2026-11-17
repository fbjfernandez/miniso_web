const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'https://miniso-web-omega.vercel.app',
];

function getAllowedOrigins(configuredOrigins = '') {
  const extraOrigins = configuredOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extraOrigins]);
}

module.exports = getAllowedOrigins;
