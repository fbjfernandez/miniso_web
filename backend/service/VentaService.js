const supabase = require('../config/supabase');
const { AppError } = require('../errors');
const { fail } = require('../utils/db');
const M = require('../mappers');

const VentaService = {
  async listar() {
    const { data, error } = await supabase.from('v_reporte_ventas').select('*');
    if (error) fail(error);
    return data.map(M.venta);
  },

  // Todo ocurre dentro de la función SQL registrar_venta (una transacción):
  // valida stock, toma el precio de la BD, genera boleta, descuenta stock y suma puntos.
  async registrar({ id_cliente, username_cajero, items }) {
    if (!Array.isArray(items) || !items.length) throw new AppError('La venta debe tener al menos un producto');
    for (const i of items) {
      if (!i.id_producto || !Number.isInteger(i.cantidad) || i.cantidad <= 0) {
        throw new AppError('Cada producto debe tener un código y una cantidad entera mayor a 0');
      }
    }
    const { data, error } = await supabase.rpc('registrar_venta', {
      p_cliente_id: id_cliente || null,
      p_cajero_username: username_cajero,
      p_detalles: items.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
    });
    if (error) fail(error);
    return data;
  },

  async detalle(id) {
    const { data, error } = await supabase
      .from('detalle_venta')
      .select('id_producto, cantidad, cantidad_devuelta, precio_unit, subtotal, producto(nombre)')
      .eq('id_venta', id)
      .order('id');
    if (error) fail(error);
    return data.map(d => ({
      id_producto: d.id_producto,
      nombre: d.producto ? d.producto.nombre : d.id_producto,
      cantidad: M.n(d.cantidad),
      cantidad_devuelta: M.n(d.cantidad_devuelta) || 0,
      precio_unit: M.n(d.precio_unit),
      subtotal: M.n(d.subtotal),
    }));
  },

  async registrarDevolucion(id, username, { motivo, items } = {}) {
    if (!motivo || !String(motivo).trim()) throw new AppError('El motivo de la devolución es obligatorio');
    if (items !== undefined && items !== null) {
      if (!Array.isArray(items) || !items.length) throw new AppError('Seleccione al menos un producto a devolver');
      for (const i of items) {
        if (!i.id_producto || !Number.isInteger(i.cantidad) || i.cantidad < 0) {
          throw new AppError('Cantidad de devolución inválida');
        }
      }
    }
    const { data, error } = await supabase.rpc('registrar_devolucion', {
      p_venta_id: id,
      p_username: username,
      p_motivo: String(motivo).trim(),
      p_items: items || null,
    });
    if (error) fail(error);
    return data;
  },
};

module.exports = VentaService;
