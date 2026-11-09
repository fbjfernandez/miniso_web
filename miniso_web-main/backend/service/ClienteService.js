const supabase = require('../config/supabase');
const { AppError } = require('../errors');
const { fail } = require('../utils/db');

function validar({ nombre, dni, email, telefono }, parcial = false) {
  const p = {};
  if (!parcial || nombre !== undefined) {
    if (!nombre || !String(nombre).trim()) throw new AppError('El nombre es obligatorio');
    p.nombre = String(nombre).trim();
  }
  if (!parcial || dni !== undefined) {
    if (!/^\d{8}$/.test(String(dni || '').trim())) throw new AppError('El DNI debe tener 8 dígitos');
    p.dni = String(dni).trim();
  }
  if (!parcial || email !== undefined) {
    if (!/^\S+@\S+\.\S+$/.test(String(email || '').trim())) throw new AppError('El email no es válido');
    p.email = String(email).trim();
  }
  if (!parcial || telefono !== undefined) {
    if (!telefono || !String(telefono).trim()) throw new AppError('El teléfono es obligatorio');
    p.telefono = String(telefono).trim();
  }
  return p;
}

const ClienteService = {
  async listar() {
    const { data, error } = await supabase.from('cliente').select('*').order('id');
    if (error) fail(error);
    return data;
  },

  async registrar(body) {
    const p = validar(body);
    const { data, error } = await supabase
      .from('cliente').insert([{ ...p, puntos: 0 }]).select().single();
    if (error) {
      if (error.code === '23505') throw new AppError(`Ya existe un cliente con DNI ${p.dni}`, 409);
      fail(error);
    }
    return data;
  },

  async actualizar(id, body) {
    const p = validar(body, true);
    if (!Object.keys(p).length) throw new AppError('No hay cambios para guardar');
    const { data, error } = await supabase.from('cliente').update(p).eq('id', id).select().maybeSingle();
    if (error) {
      if (error.code === '23505') throw new AppError(`Ya existe un cliente con DNI ${p.dni}`, 409);
      fail(error);
    }
    if (!data) throw new AppError('Cliente no encontrado', 404);
    return data;
  },
};

module.exports = ClienteService;
