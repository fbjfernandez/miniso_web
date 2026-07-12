// routes/api.js
// Equivalente a: r4 : ClienteServlet / r4 : OrdenCompraServlet
// del diagrama de secuencia

const express         = require('express');
const router          = express.Router();

const UsuarioDAO        = require('./dao/UsuarioDAO');
const ClienteService     = require('./service/ClienteService');
const VentaService       = require('./service/VentaService');
const OrdenCompraService = require('./service/OrdenCompraService');
const EntradaService     = require('./service/EntradaService');
const ProductoDAO        = require('./dao/ProductoDAO');
const ProveedorDAO       = require('./dao/ProveedorDAO');


// Helper para respuestas de error
function handleError(res, error) {
  console.error(error.message);
  res.status(400).json({ ok: false, error: error.message });
}

// ─────────────────────────────────────────────
// AUTH
// POST /api/login
// Paso 6 del diagrama: invoca interfaz → servlet → service → DAO
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const usuario = await UsuarioDAO.findByCredentials(username, password);
    
    // Si la base de datos no encontró al usuario
    if (!usuario) {
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos' });
    }
    
    // Si las credenciales son correctas (Formato exacto que pide tu frontend)
    res.json({ ok: true, data: usuario });

  } catch (e) { 
    handleError(res, e); 
  }
});


// ─────────────────────────────────────────────
// USUARIOS
// ─────────────────────────────────────────────
router.get('/usuarios', async (req, res) => {
  try { res.json({ ok: true, data: await UsuarioDAO.findAll() }); }
  catch (e) { handleError(res, e); }
});

router.post('/usuarios', async (req, res) => {
  try { res.json({ ok: true, data: await UsuarioDAO.create(req.body) }); }
  catch (e) { handleError(res, e); }
});

router.put('/usuarios/:id', async (req, res) => {
  try { res.json({ ok: true, data: await UsuarioDAO.update(req.params.id, req.body) }); }
  catch (e) { handleError(res, e); }
});

// ─────────────────────────────────────────────
// CLIENTES  (flujo: Registrar Cliente)
// ─────────────────────────────────────────────
router.get('/clientes', async (req, res) => {
  try { res.json({ ok: true, data: await ClienteService.listar() }); }
  catch (e) { handleError(res, e); }
});

// POST /api/clientes → pasos 6-13 del diagrama Registrar Cliente
router.post('/clientes', async (req, res) => {
  try {
    const cliente = await ClienteService.registrar(req.body);
    // Paso 13: Mostrar mensaje de éxito (retorna JSON al frontend)
    res.json({ ok: true, data: cliente, mensaje: 'Cliente registrado correctamente' });
  } catch (e) { handleError(res, e); }
});

router.put('/clientes/:id', async (req, res) => {
  try { res.json({ ok: true, data: await ClienteService.actualizar(req.params.id, req.body) }); }
  catch (e) { handleError(res, e); }
});

// ─────────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────────
router.get('/productos', async (req, res) => {
  try { res.json({ ok: true, data: await ProductoDAO.findAll() }); }
  catch (e) { handleError(res, e); }
});

router.get('/productos/stock-bajo', async (req, res) => {
  try { res.json({ ok: true, data: await ProductoDAO.findStockBajo() }); }
  catch (e) { handleError(res, e); }
});

router.post('/productos', async (req, res) => {
  try {
    const id = await ProductoDAO.getNextId();
    res.json({ ok: true, data: await ProductoDAO.create({ id, ...req.body }) });
  } catch (e) { handleError(res, e); }
});

router.put('/productos/:id', async (req, res) => {
  try { res.json({ ok: true, data: await ProductoDAO.update(req.params.id, req.body) }); }
  catch (e) { handleError(res, e); }
});

// ─────────────────────────────────────────────
// PROVEEDORES  (flujo: Buscar Proveedor pasos 6-10)
// ─────────────────────────────────────────────
router.get('/proveedores', async (req, res) => {
  try { res.json({ ok: true, data: await ProveedorDAO.findAll() }); }
  catch (e) { handleError(res, e); }
});

router.post('/proveedores', async (req, res) => {
  try {
    // Validar RUC duplicado
    const existe = await ProveedorDAO.findByRuc(req.body.ruc);
    if (existe) return handleError(res, new Error(`Ya existe un proveedor con RUC ${req.body.ruc}`));
    const id = await ProveedorDAO.getNextId();
    res.json({ ok: true, data: await ProveedorDAO.create({ id, ...req.body }) });
  } catch (e) { handleError(res, e); }
});

router.put('/proveedores/:id', async (req, res) => {
  try { res.json({ ok: true, data: await ProveedorDAO.update(req.params.id, req.body) }); }
  catch (e) { handleError(res, e); }
});

// ─────────────────────────────────────────────
// VENTAS
// ─────────────────────────────────────────────
router.get('/ventas', async (req, res) => {
  try { res.json({ ok: true, data: await VentaService.listar() }); }
  catch (e) { handleError(res, e); }
});

router.post('/ventas', async (req, res) => {
  try {
    const venta = await VentaService.registrar(req.body);
    res.json({ ok: true, data: venta, mensaje: 'Venta registrada correctamente' });
  } catch (e) { handleError(res, e); }
});

router.put('/ventas/:id/devolucion', async (req, res) => {
  try {
    const venta = await VentaService.registrarDevolucion(req.params.id);
    res.json({ ok: true, data: venta, mensaje: 'Devolución registrada correctamente' });
  } catch (e) { handleError(res, e); }
});

// ─────────────────────────────────────────────
// ÓRDENES DE COMPRA  (flujo: Generar Orden de Compra)
// ─────────────────────────────────────────────
router.get('/ordenes-compra', async (req, res) => {
  try { res.json({ ok: true, data: await OrdenCompraService.listar() }); }
  catch (e) { handleError(res, e); }
});

// POST /api/ordenes-compra → pasos 17-23 del diagrama
router.post('/ordenes-compra', async (req, res) => {
  try {
    const orden = await OrdenCompraService.grabar(req.body);
    // Paso 24: Muestra mensaje "Orden registrada correctamente"
    res.json({ ok: true, data: orden, mensaje: 'Orden registrada correctamente' });
  } catch (e) { handleError(res, e); }
});

router.put('/ordenes-compra/:id/estado', async (req, res) => {
  try {
    const orden = await OrdenCompraService.actualizarEstado(req.params.id, req.body.estado);
    res.json({ ok: true, data: orden });
  } catch (e) { handleError(res, e); }
});

// ─────────────────────────────────────────────
// ENTRADAS DE INVENTARIO
// ─────────────────────────────────────────────
router.get('/entradas', async (req, res) => {
  try { res.json({ ok: true, data: await EntradaService.listar() }); }
  catch (e) { handleError(res, e); }
});

router.post('/entradas', async (req, res) => {
  try {
    const entrada = await EntradaService.registrar(req.body);
    res.json({ ok: true, data: entrada, mensaje: 'Entrada registrada correctamente' });
  } catch (e) { handleError(res, e); }
});

// ─────────────────────────────────────────────
// REPORTES (usan las vistas del SQL)
// ─────────────────────────────────────────────
router.get('/reportes/ventas', async (req, res) => {
  try { res.json({ ok: true, data: await VentaService.listar() }); }
  catch (e) { handleError(res, e); }
});

router.get('/reportes/inventario', async (req, res) => {
  try {
    const supabase = require('../config/supabase');
    const { data, error } = await supabase.from('v_reporte_inventario').select('*');
    if (error) throw error;
    res.json({ ok: true, data });
  } catch (e) { handleError(res, e); }
});

module.exports = router;
