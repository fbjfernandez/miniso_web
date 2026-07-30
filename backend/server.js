// server.js — Punto de entrada del backend MINISO
// Equivalente a: r4 : OrdenCompraServlet / ClienteServlet
// del diagrama de secuencia

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://miniso-web-omega.vercel.app',  
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Responder explícitamente a las peticiones preflight
app.options('*', cors());                   
app.use(express.json());            

// ── Rutas ──
app.use('/api', apiRoutes);

// Ruta de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor MINISO funcionando ✅', version: '1.0.0' });
});

// ── Inicio ──
app.listen(PORT, () => {
  console.log(`\n🟢 Servidor MINISO corriendo en http://localhost:${PORT}`);
  console.log(`   Endpoints disponibles:`);
  console.log(`   POST  /api/login`);
  console.log(`   GET   /api/clientes        POST /api/clientes`);
  console.log(`   GET   /api/productos       POST /api/productos`);
  console.log(`   GET   /api/proveedores     POST /api/proveedores`);
  console.log(`   GET   /api/ventas          POST /api/ventas`);
  console.log(`   GET   /api/ordenes-compra  POST /api/ordenes-compra`);
  console.log(`   GET   /api/entradas        POST /api/entradas`);
  console.log(`   GET   /api/reportes/ventas`);
  console.log(`   GET   /api/reportes/inventario\n`);
});