const supabase = require('../config/supabase');
const { AppError } = require('../errors');
const { fail } = require('../utils/db');
const M = require('../mappers');

const SELECT = '*, proveedor:id_proveedor(nombre)';

function validar(c, parcial = false) {
  const p = {};
  const req = (k) => !parcial || c[k] !== undefined;

  if (req('nombre')) {
    if (!c.nombre || !String(c.nombre).trim()) throw new AppError('El nombre del producto es obligatorio');
    p.nombre = String(c.nombre).trim();
  }
  if (req('categoria')) {
    if (!c.categoria || !String(c.categoria).trim()) throw new AppError('La categoría es obligatoria');
    p.categoria = String(c.categoria).trim();
  }
  if (req('precio')) {
    const v = Number(c.precio);
    if (!Number.isFinite(v) || v < 0) throw new AppError('El precio debe ser un número mayor o igual a 0');
    p.precio = v;
  }
  if (c.costo !== undefined && c.costo !== null && c.costo !== '') {
    const v = Number(c.costo);
    if (!Number.isFinite(v) || v < 0) throw new AppError('El costo debe ser un número mayor o igual a 0');
    p.costo = v;
  } else if (c.costo === null || c.costo === '') {
    p.costo = null;
  }
  if (c.stock !== undefined) {
    const v = Number(c.stock);
    if (!Number.isInteger(v) || v < 0) throw new AppError('El stock debe ser un entero mayor o igual a 0');
    p.stock = v;
  }
  if (c.stockMin !== undefined) {
    const v = Number(c.stockMin);
    if (!Number.isInteger(v) || v < 0) throw new AppError('El stock mínimo debe ser un entero mayor o igual a 0');
    p.stock_min = v;
  }
  if (!parcial || c.proveedor !== undefined) {
    if (!c.proveedor) throw new AppError('Debes seleccionar un proveedor');
    p.id_proveedor = c.proveedor;
  }
  return p;
}

const ProductoDAO = {
  async findAll() {
    const { data, error } = await supabase.from('producto').select(SELECT).eq('activo', true).order('id');
    if (error) fail(error);
    return data.map(M.producto);
  },

  async findStockBajo() {
    const { data, error } = await supabase.from('v_productos_stock_bajo').select('*');
    if (error) fail(error);
    return data.map(M.producto);
  },

  async create(campos) {
    const p = validar(campos);
    const { data, error } = await supabase.from('producto').insert([p]).select(SELECT).single();
    if (error) fail(error);
    return M.producto(data);
  },

  async update(id, campos) {
    const p = validar(campos, true);
    if (!Object.keys(p).length) throw new AppError('No hay cambios para guardar');
    const { data, error } = await supabase.from('producto').update(p).eq('id', id).select(SELECT).maybeSingle();
    if (error) fail(error);
    if (!data) throw new AppError('Producto no encontrado', 404);
    return M.producto(data);
  },
};

module.exports = ProductoDAO;
