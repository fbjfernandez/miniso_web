// backend/dao/ProductoDAO.js
const supabase = require('../config/supabase');

const ProductoDAO = {
  async findAll() {
    const { data, error } = await supabase
      .from('producto')
      .select('*, proveedor(nombre)')
      .order('id');
    if (error) throw error;
    return data;
  },

  async findStockBajo() {
    const { data, error } = await supabase
      .from('v_productos_stock_bajo')
      .select('*');
    if (error) throw error;
    return data;
  },

  async getNextId() {
    const { data, error } = await supabase
      .from('producto').select('id').order('id', { ascending: false }).limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return 'P001';
    const lastNum = parseInt(data[0].id.replace('P', ''), 10);
    return 'P' + String(lastNum + 1).padStart(3, '0');
  },

  async create(producto) {
    const { data, error } = await supabase
      .from('producto').insert([producto]).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, campos) {
    const { data, error } = await supabase
      .from('producto').update(campos).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async decrementarStock(id, cantidad) {
    const { data: p, error: e1 } = await supabase
      .from('producto').select('stock').eq('id', id).single();
    if (e1) throw e1;
    if (p.stock - cantidad < 0) throw new Error(`Stock insuficiente para ${id}`);
    const { data, error } = await supabase
      .from('producto').update({ stock: p.stock - cantidad }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async incrementarStock(id, cantidad) {
    const { data: p, error: e1 } = await supabase
      .from('producto').select('stock').eq('id', id).single();
    if (e1) throw e1;
    const { data, error } = await supabase
      .from('producto').update({ stock: p.stock + cantidad }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

module.exports = ProductoDAO;