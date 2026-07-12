// backend/dao/ProveedorDAO.js
const supabase = require('../config/supabase');

const ProveedorDAO = {
  async findAll() {
    const { data, error } = await supabase
      .from('proveedor').select('*').order('id');
    if (error) throw error;
    return data;
  },

  async findByRuc(ruc) {
    const { data, error } = await supabase
      .from('proveedor').select('*').eq('ruc', ruc).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async getNextId() {
    const { data, error } = await supabase
      .from('proveedor').select('id').order('id', { ascending: false }).limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return 'PR001';
    const lastNum = parseInt(data[0].id.replace('PR', ''), 10);
    return 'PR' + String(lastNum + 1).padStart(3, '0');
  },

  async create(proveedor) {
    const { data, error } = await supabase
      .from('proveedor').insert([proveedor]).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, campos) {
    const { data, error } = await supabase
      .from('proveedor').update(campos).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

module.exports = ProveedorDAO;