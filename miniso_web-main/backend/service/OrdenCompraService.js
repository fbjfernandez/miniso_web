const supabase = require('../config/supabase');
const { AppError } = require('../errors');
const { fail } = require('../utils/db');
const M = require('../mappers');

const OrdenCompraService = {
  async listar() {
    const { data, error } = await supabase
      .from('orden_compra')
      .select('*, proveedor:id_proveedor(nombre)')
      .order('fecha', { ascending: false });
    if (error) fail(error);
    return data.map(M.orden);
  },

  async detalle(id) {
    const { data, error } = await supabase
      .from('detalle_orden_compra')
      .select('id_producto, cantidad, costo_unit, subtotal, producto(nombre)')
      .eq('id_orden', id)
      .order('id');
    if (error) fail(error);
    return data.map(d => ({
      id_producto: d.id_producto,
      nombre: d.producto ? d.producto.nombre : d.id_producto,
      cantidad: M.n(d.cantidad),
      costo_unit: M.n(d.costo_unit),
      subtotal: M.n(d.subtotal),
    }));
  },

  async grabar({ id_proveedor, items }, username) {
    if (!id_proveedor) throw new AppError('Debes seleccionar un proveedor');
    if (!Array.isArray(items) || !items.length) throw new AppError('La orden debe tener al menos un producto');
    for (const i of items) {
      if (!i.id_producto || !Number.isInteger(i.cantidad) || i.cantidad <= 0) {
        throw new AppError('Cada producto debe tener una cantidad entera mayor a 0');
      }
      if (!Number.isFinite(Number(i.costo_unit)) || Number(i.costo_unit) < 0) {
        throw new AppError('Cada producto debe tener un costo unitario válido');
      }
    }
    const { data, error } = await supabase.rpc('crear_orden_compra', {
      p_proveedor_id: id_proveedor,
      p_username: username,
      p_items: items.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad, costo_unit: Number(i.costo_unit) })),
    });
    if (error) fail(error);
    return data;
  },

  // Recibir se hace desde Entradas; aquí solo se puede cancelar una orden pendiente.
  async actualizarEstado(id, estado) {
    if (estado !== 'Cancelada') {
      throw new AppError('Solo se puede cancelar una orden. La recepción se registra desde Entradas de almacén');
    }
    const { data, error } = await supabase
      .from('orden_compra')
      .update({ estado: 'Cancelada' })
      .eq('id', id).eq('estado', 'Pendiente')
      .select('*, proveedor:id_proveedor(nombre)')
      .maybeSingle();
    if (error) fail(error);
    if (!data) throw new AppError('Solo se pueden cancelar órdenes que estén Pendientes', 409);
    return M.orden(data);
  },
};

module.exports = OrdenCompraService;
