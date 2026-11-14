const supabase = require('../config/supabase');
const { AppError } = require('../errors');
const { fail } = require('../utils/db');
const M = require('../mappers');

const EntradaService = {
  async listar() {
    const { data, error } = await supabase
      .from('entrada_inventario')
      .select('*, orden_compra(id, proveedor:id_proveedor(nombre))')
      .order('fecha', { ascending: false });
    if (error) fail(error);
    return data.map(M.entrada);
  },

  async registrar({ id_orden, items }, username) {
    if (!id_orden) throw new AppError('Debes seleccionar una orden de compra');
    if (!Array.isArray(items) || !items.length) throw new AppError('Debes registrar al menos un producto');
    for (const i of items) {
      if (!i.id_producto || !Number.isInteger(i.cantidad) || i.cantidad <= 0) {
        throw new AppError('Cada producto debe tener una cantidad entera mayor a 0');
      }
    }
    const { data, error } = await supabase.rpc('registrar_entrada', {
      p_orden_id: id_orden,
      p_username: username,
      p_items: items.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
    });
    if (error) fail(error);
    return data;
  },
};

module.exports = EntradaService;
