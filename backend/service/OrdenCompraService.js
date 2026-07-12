// backend/service/OrdenCompraService.js
const supabase = require('../config/supabase');

const OrdenCompraService = {
  async listar() {
    const { data, error } = await supabase
      .from('orden_compra')
      .select('*, proveedor(nombre)')
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data;
  },

  async grabar({ id_proveedor, username_admin, items }) {
    if (!id_proveedor) throw new Error('Debes seleccionar un proveedor');
    if (!items || items.length === 0) throw new Error('La orden debe tener al menos un producto');

    // Generar ID (paso 19: Generar nro orden)
    const { data: last } = await supabase
      .from('orden_compra').select('id').order('id', { ascending: false }).limit(1);
    const nextNum = last && last.length > 0
      ? parseInt(last[0].id.replace('OC', ''), 10) + 1 : 1;
    const id = 'OC' + String(nextNum).padStart(3, '0');

    const total = items.reduce((s, i) => s + i.cantidad * i.costo_unit, 0);

    // Grabar cabecera (paso 21)
    const { error: e1 } = await supabase.from('orden_compra').insert([{
      id,
      fecha: new Date().toISOString().slice(0, 10),
      id_proveedor,
      username_admin,
      total: parseFloat(total.toFixed(2)),
      estado: 'Pendiente',
    }]);
    if (e1) throw e1;

    // Grabar detalle (paso 22)
    const detalles = items.map(i => ({
      id_orden: id,
      id_producto: i.id_producto,
      cantidad: i.cantidad,
      costo_unit: i.costo_unit,
      subtotal: parseFloat((i.cantidad * i.costo_unit).toFixed(2)),
    }));
    const { error: e2 } = await supabase.from('detalle_orden_compra').insert(detalles);
    if (e2) throw e2;

    return { id, total, estado: 'Pendiente' };
  },

  async actualizarEstado(id, estado) {
    const { data, error } = await supabase
      .from('orden_compra').update({ estado }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

module.exports = OrdenCompraService;