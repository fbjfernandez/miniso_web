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

    const total = items.reduce((s, i) => s + i.cantidad * i.precio_unit, 0);

    const { data: ventaGenerada, error: rpcError } = await supabase.rpc('registrar_venta', {
      p_cliente_id: id_cliente || null,
      p_cajero_username: username_cajero,
      p_detalles: items
    });

    if (rpcError) throw new Error(`Error en el motor de BD: ${rpcError.message}`);

    for (const item of items) {
      const { data: p } = await supabase
        .from('producto').select('stock').eq('id', item.id_producto).single();
      if (p) {
        await supabase.from('producto')
          .update({ stock: p.stock - item.cantidad })
          .eq('id', item.id_producto);
      }
    }

    if (id_cliente) {
      const { data: c } = await supabase
        .from('cliente').select('puntos').eq('id', id_cliente).single();
      if (c) {
        await supabase.from('cliente')
          .update({ puntos: c.puntos + Math.floor(total / 10) })
          .eq('id', id_cliente);
      }
    }

    return { 
      id: ventaGenerada.id,
      comprobante: ventaGenerada.comprobante,
      estado_almacen: ventaGenerada.estado_almacen,
      total: total, 
      estado: 'Completada' 
    };
  },

  async registrarDevolucion(id) {
    const { data, error } = await supabase
      .from('venta').update({ estado: 'Devuelta' }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

module.exports = VentaService;