// server.js — Punto de entrada del backend MINISO
// Equivalente a: r4 : OrdenCompraServlet / ClienteServlet
// del diagrama de secuencia

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const apiRoutes = require('./api');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());                    // Permite peticiones desde el frontend (otro puerto)
app.use(express.json());            // Parsea body en JSON

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