const express = require('express');
const router = express.Router();

const UsuarioDAO = require('../dao/UsuarioDAO');
const ProductoDAO = require('../dao/ProductoDAO');
const ProveedorDAO = require('../dao/ProveedorDAO');
const ClienteService = require('../service/ClienteService');
const VentaService = require('../service/VentaService');
const OrdenCompraService = require('../service/OrdenCompraService');
const EntradaService = require('../service/EntradaService');
const supabase = require('../config/supabase');
const { AppError } = require('../errors');
const { fail } = require('../utils/db');
const M = require('../mappers');
const { autorizarRoles, emitirToken } = require('../middleware/auth');

// Envuelve handlers async: cualquier error va al manejador central de server.js
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ADMIN = 'Administrador', CAJERO = 'Cajero', ALMACEN = 'Almacenero';

// ───────── AUTH ─────────
router.post('/login', ah(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) throw new AppError('Ingrese usuario y contraseña');
  const result = await UsuarioDAO.login(String(username).trim(), String(password));
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
  res.json({ ok: true, data: { ...result.data, token: emitirToken(result.data) } });
}));

// ───────── USUARIOS (solo Administrador) ─────────
router.get('/usuarios', autorizarRoles(ADMIN), ah(async (req, res) => {
  res.json({ ok: true, data: await UsuarioDAO.findAll() });
}));
router.post('/usuarios', autorizarRoles(ADMIN), ah(async (req, res) => {
  res.status(201).json({ ok: true, data: await UsuarioDAO.create(req.body || {}) });
}));
router.put('/usuarios/:id', autorizarRoles(ADMIN), ah(async (req, res) => {
  res.json({ ok: true, data: await UsuarioDAO.update(req.params.id, req.body || {}, req.user) });
}));

// ───────── CLIENTES ─────────
router.get('/clientes', autorizarRoles(CAJERO, ADMIN), ah(async (req, res) => {
  res.json({ ok: true, data: await ClienteService.listar() });
}));
router.post('/clientes', autorizarRoles(CAJERO, ADMIN), ah(async (req, res) => {
  res.status(201).json({ ok: true, data: await ClienteService.registrar(req.body || {}), mensaje: 'Cliente registrado correctamente' });
}));
router.put('/clientes/:id', autorizarRoles(CAJERO, ADMIN), ah(async (req, res) => {
  res.json({ ok: true, data: await ClienteService.actualizar(req.params.id, req.body || {}) });
}));

// ───────── PRODUCTOS ─────────
router.get('/productos', autorizarRoles(CAJERO, ADMIN, ALMACEN), ah(async (req, res) => {
  res.json({ ok: true, data: await ProductoDAO.findAll() });
}));
router.get('/productos/stock-bajo', autorizarRoles(ADMIN, ALMACEN), ah(async (req, res) => {
  res.json({ ok: true, data: await ProductoDAO.findStockBajo() });
}));
router.post('/productos', autorizarRoles(ADMIN, ALMACEN), ah(async (req, res) => {
  res.status(201).json({ ok: true, data: await ProductoDAO.create(req.body || {}) });
}));
router.put('/productos/:id', autorizarRoles(ADMIN, ALMACEN), ah(async (req, res) => {
  res.json({ ok: true, data: await ProductoDAO.update(req.params.id, req.body || {}) });
}));

// ───────── PROVEEDORES ─────────
router.get('/proveedores', autorizarRoles(ADMIN, ALMACEN), ah(async (req, res) => {
  res.json({ ok: true, data: await ProveedorDAO.findAll() });
}));
router.post('/proveedores', autorizarRoles(ADMIN), ah(async (req, res) => {
  res.status(201).json({ ok: true, data: await ProveedorDAO.create(req.body || {}) });
}));
router.put('/proveedores/:id', autorizarRoles(ADMIN), ah(async (req, res) => {
  res.json({ ok: true, data: await ProveedorDAO.update(req.params.id, req.body || {}) });
}));

// ───────── VENTAS ─────────
router.get('/ventas', autorizarRoles(CAJERO, ADMIN), ah(async (req, res) => {
  res.json({ ok: true, data: await VentaService.listar() });
}));
router.post('/ventas', autorizarRoles(CAJERO, ADMIN), ah(async (req, res) => {
  const { id_cliente, items } = req.body || {};
  if (!id_cliente) throw new AppError('Debe seleccionar o registrar un cliente antes de procesar la venta');
  // El cajero sale del token, no del body (no se puede falsificar)
  const venta = await VentaService.registrar({ id_cliente, username_cajero: req.user.username, items });
  res.status(201).json({ ok: true, data: venta, mensaje: `Comprobante ${venta.comprobante} emitido correctamente` });
}));
router.get('/ventas/:id/detalle', autorizarRoles(CAJERO, ADMIN), ah(async (req, res) => {
  res.json({ ok: true, data: await VentaService.detalle(req.params.id) });
}));
router.put('/ventas/:id/devolucion', autorizarRoles(CAJERO, ADMIN), ah(async (req, res) => {
  const r = await VentaService.registrarDevolucion(req.params.id, req.user.username, req.body || {});
  res.json({ ok: true, data: r, mensaje: 'Devolución registrada correctamente' });
}));

// ───────── ÓRDENES DE COMPRA ─────────
router.get('/ordenes-compra', autorizarRoles(ADMIN, ALMACEN), ah(async (req, res) => {
  res.json({ ok: true, data: await OrdenCompraService.listar() });
}));
router.get('/ordenes-compra/:id/detalle', autorizarRoles(ADMIN, ALMACEN), ah(async (req, res) => {
  res.json({ ok: true, data: await OrdenCompraService.detalle(req.params.id) });
}));
router.post('/ordenes-compra', autorizarRoles(ADMIN), ah(async (req, res) => {
  const orden = await OrdenCompraService.grabar(req.body || {}, req.user.username);
  res.status(201).json({ ok: true, data: orden, mensaje: 'Orden registrada correctamente' });
}));
router.put('/ordenes-compra/:id/estado', autorizarRoles(ADMIN), ah(async (req, res) => {
  res.json({ ok: true, data: await OrdenCompraService.actualizarEstado(req.params.id, (req.body || {}).estado) });
}));

// ───────── ENTRADAS DE ALMACÉN ─────────
router.get('/entradas', autorizarRoles(ALMACEN, ADMIN), ah(async (req, res) => {
  res.json({ ok: true, data: await EntradaService.listar() });
}));
router.post('/entradas', autorizarRoles(ALMACEN, ADMIN), ah(async (req, res) => {
  const entrada = await EntradaService.registrar(req.body || {}, req.user.username);
  res.status(201).json({ ok: true, data: entrada, mensaje: 'Entrada registrada correctamente' });
}));

// ───────── REPORTES ─────────
router.get('/reportes/ventas', autorizarRoles(ADMIN), ah(async (req, res) => {
  res.json({ ok: true, data: await VentaService.listar() });
}));
router.get('/reportes/inventario', autorizarRoles(ADMIN, ALMACEN), ah(async (req, res) => {
  const { data, error } = await supabase.from('v_reporte_inventario').select('*');
  if (error) fail(error);
  res.json({ ok: true, data: data.map(M.producto) });
}));

module.exports = router;
