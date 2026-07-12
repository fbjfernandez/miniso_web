// backend/config/supabase.js
// Este archivo le faltaba al proyecto — api.js lo importa con require('../config/supabase')
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = supabase;
