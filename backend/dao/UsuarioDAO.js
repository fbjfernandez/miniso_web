const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const UsuarioDAO = {
  async login(username, password) {
    const { data: user, error } = await supabase
      .from('usuario')
      .select('id, username, password, nombre, apellido_paterno, apellido_materno, rol, activo, intentos_fallidos, bloqueado')
      .eq('username', username)
      .single();

    if (error || !user || !user.activo) {
      return { ok: false, status: 401, error: 'Credenciales inválidas' };
    }

    if (user.bloqueado) {
      return { ok: false, status: 403, error: 'Usuario bloqueado. Contacte al administrador' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      const nuevosIntentos = (user.intentos_fallidos || 0) + 1;
      const debeBloquear = nuevosIntentos >= 5;

      await supabase
        .from('usuario')
        .update({
          intentos_fallidos: nuevosIntentos,
          bloqueado: debeBloquear
        })
        .eq('id', user.id);

      if (debeBloquear) {
        return { ok: false, status: 403, error: 'Usuario bloqueado por superar el límite de intentos' };
      }

      return {
        ok: false,
        status: 401,
        error: `Credenciales inválidas. Intentos restantes: ${5 - nuevosIntentos}`
      };
    }

    if (user.intentos_fallidos > 0) {
      await supabase
        .from('usuario')
        .update({ intentos_fallidos: 0 })
        .eq('id', user.id);
    }

    const { password: _, ...usuarioSesion } = user;
    return { ok: true, data: usuarioSesion };
  },

  async findAll() {
    const { data, error } = await supabase
      .from('usuario')
      .select('id, username, nombre, apellido_paterno, apellido_materno, rol, activo, bloqueado')
      .order('id');

    if (error) throw new Error(error.message);
    return data;
  },

  async create(usuario) {
    const { username, password, nombre, apellido_paterno, apellido_materno, rol } = usuario;

    if (!username || !password || !nombre || !rol) {
      throw new Error('Campos obligatorios incompletos');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('usuario')
      .insert([{
        username,
        password: hashedPassword,
        nombre,
        apellido_paterno: apellido_paterno || '',
        apellido_materno: apellido_materno || '',
        rol,
        activo: true,
        intentos_fallidos: 0,
        bloqueado: false
      }])
      .select('id, username, nombre, apellido_paterno, apellido_materno, rol, activo')
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async update(id, campos) {
    const payload = { ...campos };

    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    const { data, error } = await supabase
      .from('usuario')
      .update(payload)
      .eq('id', id)
      .select('id, username, nombre, apellido_paterno, apellido_materno, rol, activo, bloqueado')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
};

module.exports = UsuarioDAO;