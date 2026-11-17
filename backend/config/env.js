const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET'];

function missingEnvironmentVariables(env = process.env) {
  return REQUIRED_ENV.filter((name) => {
    const value = env[name];
    return typeof value !== 'string' || value.trim() === '';
  });
}

function assertEnvironment(env = process.env) {
  const missing = missingEnvironmentVariables(env);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}`);
  }
}

module.exports = { REQUIRED_ENV, assertEnvironment, missingEnvironmentVariables };
