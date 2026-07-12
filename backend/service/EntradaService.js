// backend/service/EntradaService.js
const supabase = require('../config/supabase');

const EntradaService = {
  async listar() {
    const { data, error } = await supabase
      .from('entrada_inventario')
      .select('*, orden_compra(id, proveedor(nombre))')
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data;
  },

  async registrar({ id_orden, username_almacenero, items }) {
    if (!id_orden) throw new Error('Debes seleccionar una orden de compra');
    if (!items || items.length === 0) throw new Error('Debes registrar al menos un producto');

    // Generar ID
    const { data: last } = await supabase
      .from('entrada_inventario').select('id').order('id', { ascending: false }).limit(1);
    const nextNum = last && last.length > 0
      ? parseInt(last[0].id.replace('E', ''), 10) + 1 : 1;
    const id = 'E' + String(nextNum).padStart(3, '0');

    // Grabar entrada
    const { error: e1 } = await supabase.from('entrada_inventario').insert([{
      id,
      fecha: new Date().toISOString().slice(0, 10),
      id_orden,
      username_almacenero,
      cantidad_productos: items.length,
    }]);
    if (e1) throw e1;

    // Incrementar stock de cada producto recibido
    for (const item of items) {
      const { data: p } = await supabase
        .from('producto').select('stock').eq('id', item.id_producto).single();
      if (p) {
        await supabase.from('producto')
          .update({ stock: p.stock + item.cantidad })
          .eq('id', item.id_producto);
      }
    }

    // Marcar la orden como Recibida
    await supabase.from('orden_compra')
      .update({ estado: 'Recibida' }).eq('id', id_orden);

    return { id, estado: 'ok' };
  },
};

module.exports = EntradaService;