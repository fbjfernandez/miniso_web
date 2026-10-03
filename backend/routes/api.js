const express         = require('express');
const router          = express.Router();

const UsuarioDAO      = require('../dao/UsuarioDAO');
const ClienteService  = require('../service/ClienteService');
const VentaService    = require('../service/VentaService');
const OrdenCompraService = require('../service/OrdenCompraService');
const EntradaService  = require('../service/EntradaService');
const ProductoDAO     = require('../dao/ProductoDAO');
const ProveedorDAO    = require('../dao/ProveedorDAO');

function handleError(res, error) {
  console.error(error.message);
  res.status(400).json({ ok: false, error: error.message });
}


const autorizarRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];

    if (!userRole) {
      return res.status(401).json({ 
        ok: false, 
        error: 'No autenticado: Debe proporcionar el rol en la cabecera x-user-role' 
      });
    }

    if (!rolesPermitidos.includes(userRole)) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Acceso denegado: No cuenta con los permisos necesarios para realizar esta acción (Forbidden)' 
      });
    }

    next();
  };
};

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Ingrese usuario y contraseña' });
    }

    const result = await UsuarioDAO.login(username, password);
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, error: result.error });
    }

    res.json({ ok: true, data: result.data });
  } catch (e) { handleError(res, e); }
});

router.get('/usuarios', autorizarRoles('Administrador'), async (req, res) => {
  try { res.json({ ok: true, data: await UsuarioDAO.findAll() }); }
  catch (e) { handleError(res, e); }
});

router.post('/usuarios', autorizarRoles('Administrador'), async (req, res) => {
  try { res.json({ ok: true, data: await UsuarioDAO.create(req.body) }); }
  catch (e) { handleError(res, e); }
});

router.put('/usuarios/:id', autorizarRoles('Administrador'), async (req, res) => {
  try { res.json({ ok: true, data: await UsuarioDAO.update(req.params.id, req.body) }); }
  catch (e) { handleError(res, e); }
});

router.get('/clientes', autorizarRoles('Cajero', 'Administrador'), async (req, res) => {
  try { res.json({ ok: true, data: await ClienteService.listar() }); }
  catch (e) { handleError(res, e); }
});

router.post('/clientes', autorizarRoles('Cajero', 'Administrador'), async (req, res) => {
  try {
    const cliente = await ClienteService.registrar(req.body);
    res.json({ ok: true, data: cliente, mensaje: 'Cliente registrado correctamente' });
  } catch (e) { handleError(res, e); }
});

router.put('/clientes/:id', autorizarRoles('Cajero', 'Administrador'), async (req, res) => {
  try { res.json({ ok: true, data: await ClienteService.actualizar(req.params.id, req.body) }); }
  catch (e) { handleError(res, e); }
});

router.get('/productos', autorizarRoles('Cajero', 'Administrador', 'Almacenero'), async (req, res) => {
  try { res.json({ ok: true, data: await ProductoDAO.findAll() }); }
  catch (e) { handleError(res, e); }
});

router.get('/productos/stock-bajo', autorizarRoles('Administrador', 'Almacenero'), async (req, res) => {
  try { res.json({ ok: true, data: await ProductoDAO.findStockBajo() }); }
  catch (e) { handleError(res, e); }
});

router.post('/productos', autorizarRoles('Administrador', 'Almacenero'), async (req, res) => {
  try {
    const id = await ProductoDAO.getNextId();
    res.json({ ok: true, data: await ProductoDAO.create({ id, ...req.body }) });
  } catch (e) { handleError(res, e); }
});

router.put('/productos/:id', autorizarRoles('Administrador', 'Almacenero'), async (req, res) => {
  try { res.json({ ok: true, data: await ProductoDAO.update(req.params.id, req.body) }); }
  catch (e) { handleError(res, e); }
});

router.get('/proveedores', autorizarRoles('Administrador', 'Almacenero'), async (req, res) => {
  try { res.json({ ok: true, data: await ProveedorDAO.findAll() }); }
  catch (e) { handleError(res, e); }
});

router.post('/proveedores', autorizarRoles('Administrador'), async (req, res) => {
  try {
    const existe = await ProveedorDAO.findByRuc(req.body.ruc);
    if (existe) return handleError(res, new Error(`Ya existe un proveedor con RUC ${req.body.ruc}`));
    const id = await ProveedorDAO.getNextId();
    res.json({ ok: true, data: await ProveedorDAO.create({ id, ...req.body }) });
  } catch (e) { handleError(res, e); }
});

router.put('/proveedores/:id', autorizarRoles('Administrador'), async (req, res) => {
  try { res.json({ ok: true, data: await ProveedorDAO.update(req.params.id, req.body) }); }
  catch (e) { handleError(res, e); }
});

router.get('/ventas', autorizarRoles('Cajero', 'Administrador'), async (req, res) => {
  try { res.json({ ok: true, data: await VentaService.listar() }); }
  catch (e) { handleError(res, e); }
});

router.post('/ventas', autorizarRoles('Cajero', 'Administrador'), async (req, res) => {
  try {
    const { id_cliente, username_cajero, items } = req.body;
    if (!id_cliente || !username_cajero || !items || !items.length) {
      return res.status(400).json({ ok: false, error: 'Estructura de venta inválida o cliente no seleccionado' });
    }
    const venta = await VentaService.registrar(req.body);
    res.status(201).json({ ok: true, data: venta, mensaje: `Comprobante ${venta.comprobante || venta.id} emitido correctamente` });
  } catch (e) { handleError(res, e); }
});

router.get('/ventas/:id/detalle', autorizarRoles('Cajero', 'Administrador'), async (req, res) => {
  try {
    const supabase = require('../config/supabase');
    const { data, error } = await supabase
      .from('detalle_venta')
      .select('id_producto, cantidad, precio_unit, subtotal')
      .eq('id_venta', req.params.id);
    if (error) throw error;
    res.json({ ok: true, data });
  } catch(e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.put('/ventas/:id/devolucion', autorizarRoles('Cajero', 'Administrador'), async (req, res) => {
  try {
    const venta = await VentaService.registrarDevolucion(req.params.id);
    res.json({ ok: true, data: venta, mensaje: 'Devolución registrada correctamente' });
  } catch (e) { handleError(res, e); }
});

// ─────────────────────────────────────────────
router.get('/ordenes-compra', autorizarRoles('Administrador', 'Almacenero'), async (req, res) => {
  try { res.json({ ok: true, data: await OrdenCompraService.listar() }); }
  catch (e) { handleError(res, e); }
});

router.post('/ordenes-compra', autorizarRoles('Administrador'), async (req, res) => {
  try {
    const orden = await OrdenCompraService.grabar(req.body);
    res.json({ ok: true, data: orden, mensaje: 'Orden registrada correctamente' });
  } catch (e) { handleError(res, e); }
});

router.put('/ordenes-compra/:id/estado', autorizarRoles('Administrador', 'Almacenero'), async (req, res) => {
  try {
    const orden = await OrdenCompraService.actualizarEstado(req.params.id, req.body.estado);
    res.json({ ok: true, data: orden });
  } catch (e) { handleError(res, e); }
});

router.get('/entradas', autorizarRoles('Almacenero', 'Administrador'), async (req, res) => {
  try { res.json({ ok: true, data: await EntradaService.listar() }); }
  catch (e) { handleError(res, e); }
});

router.post('/entradas', autorizarRoles('Almacenero', 'Administrador'), async (req, res) => {
  try {
    const entrada = await EntradaService.registrar(req.body);
    res.json({ ok: true, data: entrada, mensaje: 'Entrada registrada correctamente' });
  } catch (e) { handleError(res, e); }
});

router.get('/reportes/ventas', autorizarRoles('Administrador'), async (req, res) => {
  try { res.json({ ok: true, data: await VentaService.listar() }); }
  catch (e) { handleError(res, e); }
});

router.get('/reportes/inventario', autorizarRoles('Administrador', 'Almacenero'), async (req, res) => {
  try {
    const supabase = require('../config/supabase');
    const { data, error } = await supabase.from('v_reporte_inventario').select('*');
    if (error) throw error;
    res.json({ ok: true, data });
  } catch (e) { handleError(res, e); }
});

module.exports = router;