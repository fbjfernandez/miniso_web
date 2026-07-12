// backend/dao/UsuarioDAO.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const UsuarioDAO = {
  async findByCredentials(username, password) {
    const { data, error } = await supabase
      .from('usuario')
      .select('id, username, nombre, rol')
      .eq('username', username)
      .eq('password', password)
      .eq('activo', true)
      .single();
    if (error || !data) return null;
    return data;
  },

  async findAll() {
    const { data, error } = await supabase
      .from('usuario')
      .select('id, username, nombre, rol, activo')
      .order('id');
    if (error) throw error;
    return data;
  },

  async create(usuario) {
    const { data, error } = await supabase
      .from('usuario').insert([{ ...usuario, activo: true }]).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, campos) {
    const { data, error } = await supabase
      .from('usuario').update(campos).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

module.exports = UsuarioDAO;