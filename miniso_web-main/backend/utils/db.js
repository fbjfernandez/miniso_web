const { AppError } = require('../errors');

// Convierte un error de Supabase/Postgres en un AppError con el status correcto.
// Los errores de negocio (raise exception en las funciones SQL) llegan como P0001.
function fail(error) {
  if (!error) return;
  if (error instanceof AppError) throw error;
  const code = error.code;
  // Errores de negocio lanzados por los triggers/funciones SQL (raise exception ... errcode)
  if (code === 'MN001') throw new AppError(error.message, 409);   // stock insuficiente
  if (code === 'MN002') throw new AppError(error.message, 400);   // dato inválido
  if (code === 'MN003') throw new AppError(error.message, 409);   // estado / regla de negocio
  if (code === 'MN004') throw new AppError(error.message, 404);   // no encontrado
  if (code === 'P0001') throw new AppError(error.message, 409);
  if (code === '23505') throw new AppError('Ya existe un registro con esos datos (valor duplicado)', 409);
  if (code === '23503') throw new AppError('El registro está relacionado con otros datos o la referencia no existe', 409);
  if (code === '23514' || code === '22P02' || code === '23502') throw new AppError('Datos inválidos: ' + error.message, 400);
  if (code === 'PGRST116') throw new AppError('Registro no encontrado', 404);
  console.error('[DB]', error);
  throw new AppError('Error interno de base de datos', 500);
}

module.exports = { fail };
