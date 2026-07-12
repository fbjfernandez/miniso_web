// backend/service/ClienteService.js
const supabase = require('../config/supabase');

const ClienteService = {
  async listar() {
    const { data, error } = await supabase
      .from('cliente').select('*').order('id');
    if (error) throw error;
    return data;
  },

  async registrar({ nombre, dni, email, telefono }) {
    if (!nombre || !dni || !email || !telefono)
      throw new Error('Todos los campos son obligatorios');
    if (dni.length !== 8 || !/^\d+$/.test(dni))
      throw new Error('El DNI debe tener 8 dígitos');

    // Verificar duplicidad por DNI (paso 10 del diagrama)
    const { data: existe } = await supabase
      .from('cliente').select('id').eq('dni', dni).single();
    if (existe) throw new Error(`Ya existe un cliente con DNI ${dni}`);

    // Generar ID correlativo (paso 11)
    const { data: last } = await supabase
      .from('cliente').select('id').order('id', { ascending: false }).limit(1);
    const nextNum = last && last.length > 0
      ? parseInt(last[0].id.replace('C', ''), 10) + 1 : 1;
    const id = 'C' + String(nextNum).padStart(3, '0');

    // Grabar cliente (paso 12)
    const { data, error } = await supabase
      .from('cliente').insert([{ id, nombre, dni, email, telefono, puntos: 0 }]).select().single();
    if (error) throw error;
    return data;
  },

  async actualizar(id, campos) {
    if (campos.dni) {
      const { data: existe } = await supabase
        .from('cliente').select('id').eq('dni', campos.dni).neq('id', id).single();
      if (existe) throw new Error(`Ya existe un cliente con DNI ${campos.dni}`);
    }
    const { data, error } = await supabase
      .from('cliente').update(campos).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

module.exports = ClienteService;