const supabase = require('../config/supabase');
const { AppError } = require('../errors');
const { fail } = require('../utils/db');

function validar(c, parcial = false) {
  const p = {};
  for (const [k, etiqueta] of [['nombre', 'La razón social'], ['contacto', 'El contacto'], ['telefono', 'El teléfono'], ['email', 'El email']]) {
    if (!parcial || c[k] !== undefined) {
      if (!c[k] || !String(c[k]).trim()) throw new AppError(`${etiqueta} es obligatorio`);
      p[k] = String(c[k]).trim();
    }
  }
  if (!parcial || c.ruc !== undefined) {
    if (!/^\d{11}$/.test(String(c.ruc || '').trim())) throw new AppError('El RUC debe tener 11 dígitos');
    p.ruc = String(c.ruc).trim();
  }
  if (p.email && !/^\S+@\S+\.\S+$/.test(p.email)) throw new AppError('El email no es válido');
  return p;
}

const ProveedorDAO = {
  async findAll() {
    const { data, error } = await supabase.from('proveedor').select('*').eq('activo', true).order('id');
    if (error) fail(error);
    return data;
  },

  async create(campos) {
    const p = validar(campos);
    const { data, error } = await supabase.from('proveedor').insert([p]).select().single();
    if (error) {
      if (error.code === '23505') throw new AppError(`Ya existe un proveedor con RUC ${p.ruc}`, 409);
      fail(error);
    }
    return data;
  },

  async update(id, campos) {
    const p = validar(campos, true);
    if (!Object.keys(p).length) throw new AppError('No hay cambios para guardar');
    const { data, error } = await supabase.from('proveedor').update(p).eq('id', id).select().maybeSingle();
    if (error) {
      if (error.code === '23505') throw new AppError(`Ya existe un proveedor con RUC ${p.ruc}`, 409);
      fail(error);
    }
    if (!data) throw new AppError('Proveedor no encontrado', 404);
    return data;
  },
};

module.exports = ProveedorDAO;
