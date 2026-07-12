// js/api.js
// Capa de comunicación entre el frontend y el backend Express
// Equivalente al flujo: FrmXxx → Servlet → Service → DAO

const API_URL = 'https://miniso-web.onrender.com';

// Helper base para todas las llamadas
async function request(method, endpoint, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res  = await fetch(`${API_URL}${endpoint}`, options);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error || 'Error en el servidor');
  return json.data;
}

// ── Atajos ──
const get  = (endpoint)       => request('GET',  endpoint);
const post = (endpoint, body) => request('POST', endpoint, body);
const put  = (endpoint, body) => request('PUT',  endpoint, body);

// ── AUTH ──
const API = {
  login: (username, password) => post('/login', { username, password }),

  // ── USUARIOS ──
  getUsuarios:   ()           => get('/usuarios'),
  createUsuario: (data)       => post('/usuarios', data),
  updateUsuario: (id, data)   => put(`/usuarios/${id}`, data),

  // ── CLIENTES ──
  getClientes:   ()           => get('/clientes'),
  createCliente: (data)       => post('/clientes', data),
  updateCliente: (id, data)   => put(`/clientes/${id}`, data),

  // ── PRODUCTOS ──
  getProductos:      ()       => get('/productos'),
  getProductosBajos: ()       => get('/productos/stock-bajo'),
  createProducto:    (data)   => post('/productos', data),
  updateProducto:    (id, data) => put(`/productos/${id}`, data),

  // ── PROVEEDORES ──
  getProveedores:   ()        => get('/proveedores'),
  createProveedor:  (data)    => post('/proveedores', data),
  updateProveedor:  (id, data) => put(`/proveedores/${id}`, data),

  // ── VENTAS ──
  getVentas:           ()     => get('/ventas'),
  createVenta:         (data) => post('/ventas', data),
  registrarDevolucion: (id)   => put(`/ventas/${id}/devolucion`, {}),
  getDetalleVenta:     (id)   => get(`/ventas/${id}/detalle`),

  // ── ÓRDENES DE COMPRA ──
  getOrdenes:      ()         => get('/ordenes-compra'),
  createOrden:     (data)     => post('/ordenes-compra', data),
  updateOrdenEstado: (id, estado) => put(`/ordenes-compra/${id}/estado`, { estado }),

  // ── ENTRADAS ──
  getEntradas:   ()           => get('/entradas'),
  createEntrada: (data)       => post('/entradas', data),

  // ── REPORTES ──
  getReporteVentas:     ()    => get('/reportes/ventas'),
  getReporteInventario: ()    => get('/reportes/inventario'),
};