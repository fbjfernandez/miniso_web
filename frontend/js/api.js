// js/api.js
// En local usa el backend local; en producción, el de Render.
// Para forzar otra URL: define window.MINISO_API_URL antes de cargar este script.
const API_URL = window.MINISO_API_URL ||
  (['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:3000/api'
    : 'https://miniso-web.onrender.com/api');

async function request(method, endpoint, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (typeof APP !== 'undefined' && APP.currentUser && APP.currentUser.token) {
    headers['Authorization'] = 'Bearer ' + APP.currentUser.token;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${API_URL}${endpoint}`, options);
  } catch (e) {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión (el servidor gratuito puede tardar ~30 s en despertar).');
  }

  let json = null;
  try { json = await res.json(); } catch (e) { /* respuesta sin JSON */ }

  // Sesión vencida o inválida (excepto en el propio login)
  if (res.status === 401 && endpoint !== '/login' && typeof APP !== 'undefined' && APP.currentUser) {
    logout();
    showToast('Tu sesión expiró. Inicia sesión nuevamente.', 'warning');
    throw new Error('Sesión expirada');
  }

  if (!json || !json.ok) throw new Error((json && json.error) || `Error en el servidor (${res.status})`);
  return json.data;
}

const get  = (endpoint)       => request('GET',  endpoint);
const post = (endpoint, body) => request('POST', endpoint, body);
const put  = (endpoint, body) => request('PUT',  endpoint, body);

const API = {
  login: (username, password) => post('/login', { username, password }),

  // ── USUARIOS ──
  getUsuarios:   ()         => get('/usuarios'),
  createUsuario: (data)     => post('/usuarios', data),
  updateUsuario: (id, data) => put(`/usuarios/${id}`, data),

  // ── CLIENTES ──
  getClientes:   ()         => get('/clientes'),
  createCliente: (data)     => post('/clientes', data),
  updateCliente: (id, data) => put(`/clientes/${id}`, data),

  // ── PRODUCTOS ──
  getProductos:      ()         => get('/productos'),
  getProductosBajos: ()         => get('/productos/stock-bajo'),
  createProducto:    (data)     => post('/productos', data),
  updateProducto:    (id, data) => put(`/productos/${id}`, data),

  // ── PROVEEDORES ──
  getProveedores:   ()         => get('/proveedores'),
  createProveedor:  (data)     => post('/proveedores', data),
  updateProveedor:  (id, data) => put(`/proveedores/${id}`, data),

  // ── VENTAS ──
  getVentas:           ()           => get('/ventas'),
  createVenta:         (data)       => post('/ventas', data),
  registrarDevolucion: (id, data)   => put(`/ventas/${id}/devolucion`, data),
  getDetalleVenta:     (id)         => get(`/ventas/${id}/detalle`),

  // ── ÓRDENES DE COMPRA ──
  getOrdenes:        ()             => get('/ordenes-compra'),
  getDetalleOrden:   (id)           => get(`/ordenes-compra/${id}/detalle`),
  createOrden:       (data)         => post('/ordenes-compra', data),
  updateOrdenEstado: (id, estado)   => put(`/ordenes-compra/${id}/estado`, { estado }),

  // ── ENTRADAS ──
  getEntradas:   ()     => get('/entradas'),
  createEntrada: (data) => post('/entradas', data),

  // ── REPORTES ──
  getReporteVentas:     () => get('/reportes/ventas'),
  getReporteInventario: () => get('/reportes/inventario'),
};
