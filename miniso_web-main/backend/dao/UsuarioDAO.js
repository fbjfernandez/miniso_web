const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { AppError } = require('../errors');
const { fail } = require('../utils/db');

const PUBLICOS = 'id, username, nombre, apellido_paterno, apellido_materno, rol, activo, bloqueado';
const ROLES = ['Cajero', 'Administrador', 'Almacenero'];

const UsuarioDAO = {
  async login(username, password) {
    const { data: user, error } = await supabase
      .from('usuario')
      .select('id, username, password, nombre, apellido_paterno, apellido_materno, rol, activo, intentos_fallidos, bloqueado')
      .eq('username', username)
      .maybeSingle();
    if (error) fail(error);

    if (!user || !user.activo) {
      return { ok: false, status: 401, error: 'Credenciales inválidas' };
    }
    if (user.bloqueado) {
      return { ok: false, status: 403, error: 'Usuario bloqueado. Contacte al administrador' };
    }

    const coincide = await bcrypt.compare(password, user.password);
    if (!coincide) {
      // Incremento y bloqueo atómicos en la BD
      const { data, error: e2 } = await supabase.rpc('registrar_intento_fallido', { p_user_id: user.id });
      if (e2) fail(e2);
      if (data && data.bloqueado) {
        return { ok: false, status: 403, error: 'Usuario bloqueado por superar el límite de intentos' };
      }
      const restantes = Math.max(0, 5 - ((data && data.intentos) || 0));
      return { ok: false, status: 401, error: `Credenciales inválidas. Intentos restantes: ${restantes}` };
    }

    if (user.intentos_fallidos > 0) {
      await supabase.from('usuario').update({ intentos_fallidos: 0 }).eq('id', user.id);
    }

    const { password: _omitida, intentos_fallidos: _i, ...usuarioSesion } = user;
    return { ok: true, data: usuarioSesion };
  },

  async findAll() {
    const { data, error } = await supabase.from('usuario').select(PUBLICOS).order('id');
    if (error) fail(error);
    return data;
  },

  async create({ username, password, nombre, apellido_paterno, apellido_materno, rol }) {
    if (!username || !password || !nombre || !apellido_paterno || !rol) {
      throw new AppError('Nombre, Apellido Paterno, Usuario, Contraseña y Rol son obligatorios.');
    }
    if (!ROLES.includes(rol)) throw new AppError('El rol seleccionado no es válido.');
    if (String(password).length < 4) throw new AppError('La contraseña debe tener al menos 4 caracteres.');

    const { data, error } = await supabase
      .from('usuario')
      .insert([{
        username: username.trim(),
        password: await bcrypt.hash(password, 10),
        nombre: nombre.trim(),
        apellido_paterno: apellido_paterno.trim(),
        apellido_materno: (apellido_materno || '').trim(),
        rol, activo: true, intentos_fallidos: 0, bloqueado: false
      }])
      .select(PUBLICOS)
      .single();
    if (error) {
      if (error.code === '23505') throw new AppError(`El usuario "${username}" ya existe`, 409);
      fail(error);
    }
    return data;
  },

  // Solo estos campos pueden modificarse (evita asignación masiva desde el body)
  async update(id, campos, solicitante) {
    const p = {};
    for (const k of ['nombre', 'apellido_paterno', 'apellido_materno', 'username']) {
      if (campos[k] !== undefined) p[k] = String(campos[k]).trim();
    }
    if (campos.rol !== undefined) {
      if (!ROLES.includes(campos.rol)) throw new AppError('El rol seleccionado no es válido.');
      p.rol = campos.rol;
    }
    if (campos.password) {
      if (String(campos.password).length < 4) throw new AppError('La contraseña debe tener al menos 4 caracteres.');
      p.password = await bcrypt.hash(campos.password, 10);
    }
    if (campos.activo !== undefined) p.activo = !!campos.activo;
    if (campos.bloqueado !== undefined) {
      p.bloqueado = !!campos.bloqueado;
      if (!p.bloqueado) p.intentos_fallidos = 0; // desbloquear reinicia el contador
    }

    // Un administrador no puede quitarse el acceso a sí mismo
    if (solicitante && String(solicitante.id) === String(id)) {
      if ((p.rol && p.rol !== 'Administrador') || p.activo === false || p.bloqueado === true) {
        throw new AppError('No puede quitarse el rol de administrador, desactivarse ni bloquearse a sí mismo');
      }
    }
    if (!Object.keys(p).length) throw new AppError('No hay cambios para guardar');

    const { data, error } = await supabase
      .from('usuario').update(p).eq('id', id).select(PUBLICOS).maybeSingle();
    if (error) {
      if (error.code === '23505') throw new AppError('Ese nombre de usuario ya está en uso', 409);
      fail(error);
    }
    if (!data) throw new AppError('Usuario no encontrado', 404);
    return data;
  }
};

module.exports = UsuarioDAO;
