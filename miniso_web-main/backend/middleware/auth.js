const { sign, verify } = require('../auth/token');

function secreto() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error('Falta JWT_SECRET (mínimo 16 caracteres) en las variables de entorno');
  }
  return s;
}

const ttlSegundos = () => (parseFloat(process.env.JWT_TTL_HOURS) || 8) * 3600;

function emitirToken(usuario) {
  return sign(
    { id: usuario.id, username: usuario.username, rol: usuario.rol, nombre: usuario.nombre },
    secreto(),
    ttlSegundos()
  );
}

// 401 si no hay token válido; si lo hay, deja el usuario en req.user
function autenticar(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) {
    return res.status(401).json({ ok: false, error: 'No autenticado: inicie sesión' });
  }
  try {
    req.user = verify(token, secreto());
    next();
  } catch (e) {
    res.status(401).json({ ok: false, error: 'Sesión inválida o expirada: vuelva a iniciar sesión' });
  }
}

// 403 si el rol del token no está permitido
const autorizarRoles = (...roles) => [
  autenticar,
  (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        ok: false,
        error: 'Acceso denegado: No cuenta con los permisos necesarios para realizar esta acción (Forbidden)'
      });
    }
    next();
  }
];

module.exports = { autenticar, autorizarRoles, emitirToken };
