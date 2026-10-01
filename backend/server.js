
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app  = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

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


app.options('*', cors());                   
app.use(express.json());            


app.use('/api', apiRoutes);


app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor MINISO funcionando ✅', version: '1.0.0' });
});

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