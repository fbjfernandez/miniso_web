// backend/service/VentaService.js
const supabase = require('../config/supabase');

const VentaService = {
  async listar() {
    const { data, error } = await supabase
      .from('v_reporte_ventas').select('*');
    if (error) throw error;
    return data;
  },

  async registrar({ id_cliente, username_cajero, items }) {
    if (!items || items.length === 0)
      throw new Error('La venta debe tener al menos un producto');

    // Generar ID de venta
    const { data: last } = await supabase
      .from('venta').select('id').order('id', { ascending: false }).limit(1);
    const nextNum = last && last.length > 0
      ? parseInt(last[0].id.replace('V', ''), 10) + 1 : 1;
    const id = 'V' + String(nextNum).padStart(3, '0');

    const total = items.reduce((s, i) => s + i.cantidad * i.precio_unit, 0);

    // Grabar cabecera
    const { error: e1 } = await supabase.from('venta').insert([{
      id,
      fecha: new Date().toISOString().slice(0, 10),
      id_cliente: id_cliente || null,
      username_cajero,
      total: parseFloat(total.toFixed(2)),
      estado: 'Completada',
    }]);
    if (e1) throw e1;

    // Grabar detalle
    const detalles = items.map(i => ({
      id_venta: id,
      id_producto: i.id_producto,
      cantidad: i.cantidad,
      precio_unit: i.precio_unit,
      subtotal: parseFloat((i.cantidad * i.precio_unit).toFixed(2)),
    }));
    const { error: e2 } = await supabase.from('detalle_venta').insert(detalles);
    if (e2) throw e2;

    // Descontar stock de cada producto
    for (const item of items) {
      const { data: p } = await supabase
        .from('producto').select('stock').eq('id', item.id_producto).single();
      if (p) {
        await supabase.from('producto')
          .update({ stock: p.stock - item.cantidad })
          .eq('id', item.id_producto);
      }
    }

    // Sumar puntos al cliente (1 punto por cada S/10)
    if (id_cliente) {
      const { data: c } = await supabase
        .from('cliente').select('puntos').eq('id', id_cliente).single();
      if (c) {
        await supabase.from('cliente')
          .update({ puntos: c.puntos + Math.floor(total / 10) })
          .eq('id', id_cliente);
      }
    }

    return { id, total, estado: 'Completada' };
  },

  async registrarDevolucion(id) {
    const { data, error } = await supabase
      .from('venta').update({ estado: 'Devuelta' }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

module.exports = VentaService;