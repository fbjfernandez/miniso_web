require('dotenv').config();
const express = require('express');
const cors = require('cors');

const apiRoutes = require('./routes/api');
const { AppError } = require('./errors');

// Falla al arrancar (y no en el primer login) si falta configuración crítica
for (const k of ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET']) {
  if (!process.env[k]) {
    console.error(`❌ Falta la variable de entorno ${k}. Revisa backend/.env.example`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

const origenes = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,https://miniso-web-omega.vercel.app')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: origenes,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.get('/', (req, res) => res.json({ mensaje: 'Servidor MINISO funcionando ✅', version: '2.0.0' }));
app.use('/api', apiRoutes);

app.use((req, res) => res.status(404).json({ ok: false, error: 'Ruta no encontrada' }));

// Manejador central de errores
app.use((err, req, res, next) => {
  if (err instanceof AppError) return res.status(err.status).json({ ok: false, error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ ok: false, error: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
});

app.listen(PORT, () => console.log(`🟢 Servidor MINISO en http://localhost:${PORT}`));
