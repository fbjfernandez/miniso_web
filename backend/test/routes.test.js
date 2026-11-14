// Prueba las rutas REALES (auth, permisos, validaciones, servicios) con un Supabase falso.
// No necesita base de datos ni red.
process.env.JWT_SECRET = 'secreto-de-prueba-1234567890';
process.env.SUPABASE_URL = 'http://x'; process.env.SUPABASE_KEY = 'x';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const bcrypt = require('bcryptjs');

// ── Supabase falso inyectado en la caché de require ──
const llamadas = { rpc: [], tablas: [] };
let respuestas = {};   // 'tabla' -> {data,error}   |  'rpc:nombre' -> {data,error}
function builder(tabla) {
  const ops = [];
  const resolver = () => Promise.resolve(respuestas[tabla] || { data: [], error: null });
  const b = new Proxy({}, {
    get(_, prop) {
      if (prop === 'then') return (res, rej) => resolver().then(res, rej);
      return (...args) => { ops.push([prop, args]); llamadas.tablas.push({ tabla, op: prop, args }); return b; };
    },
  });
  return b;
}
const fake = {
  from: builder,
  rpc: (nombre, args) => { llamadas.rpc.push({ nombre, args }); return Promise.resolve(respuestas['rpc:' + nombre] || { data: null, error: null }); },
};
const ruta = path.resolve(__dirname, '../config/supabase.js');
require.cache[ruta] = { id: ruta, filename: ruta, loaded: true, exports: fake };

const router = require('../routes/api');
const { AppError } = require('../errors');
const { emitirToken } = require('../middleware/auth');

// Ejecuta la cadena de middlewares de una ruta como lo haría Express
async function llamar(metodo, url, { token, body = {}, headers = {} } = {}) {
  const layer = router.stack.find(l => l.route && l.route.path === url.replace(/\/[A-Z]\d+|\/\d+(?=\/|$)/g, m => m).split('?')[0] && l.route.methods[metodo.toLowerCase()])
    || router.stack.find(l => l.route && l.route.methods[metodo.toLowerCase()] && new RegExp('^' + l.route.path.replace(/:\w+/g, '[^/]+') + '$').test(url));
  assert.ok(layer, `ruta no encontrada ${metodo} ${url}`);
  const params = {};
  const nombres = (layer.route.path.match(/:\w+/g) || []).map(s => s.slice(1));
  const valores = url.match(new RegExp('^' + layer.route.path.replace(/:\w+/g, '([^/]+)') + '$')) || [];
  nombres.forEach((n, i) => { params[n] = valores[i + 1]; });

  const req = { headers: { ...headers, ...(token ? { authorization: 'Bearer ' + token } : {}) }, body, params };
  const out = { status: 200, json: null };
  const res = { status(c) { out.status = c; return this; }, json(o) { out.json = o; return this; } };
  const pila = layer.route.stack.map(s => s.handle);
  for (const h of pila) {
    let siguiente = false, error = null;
    await h(req, res, (e) => { siguiente = true; error = e; });
    if (error) {
      out.status = error instanceof AppError ? error.status : 500;
      out.json = { ok: false, error: error.message };
      return out;
    }
    if (!siguiente) break; // el handler ya respondió
  }
  return out;
}

const tokenDe = (rol, username = rol.toLowerCase() + '01', id = 9) => emitirToken({ id, username, rol, nombre: 'X' });
const reset = () => { llamadas.rpc.length = 0; llamadas.tablas.length = 0; respuestas = {}; };

test('sin token → 401; header x-user-role falsificado → 401', async () => {
  reset();
  assert.strictEqual((await llamar('GET', '/proveedores')).status, 401);
  assert.strictEqual((await llamar('GET', '/proveedores', { headers: { 'x-user-role': 'Administrador' } })).status, 401);
});

test('Cajero no puede ver proveedores ni órdenes (403), Admin sí', async () => {
  reset(); respuestas.proveedor = { data: [], error: null }; respuestas.orden_compra = { data: [], error: null };
  const c = tokenDe('Cajero');
  assert.strictEqual((await llamar('GET', '/proveedores', { token: c })).status, 403);
  assert.strictEqual((await llamar('GET', '/ordenes-compra', { token: c })).status, 403);
  assert.strictEqual((await llamar('GET', '/proveedores', { token: tokenDe('Administrador') })).status, 200);
});

test('Almacenero puede cargar productos, proveedores y órdenes (antes rompía su dashboard)', async () => {
  reset(); const a = tokenDe('Almacenero');
  respuestas.producto = { data: [], error: null };
  for (const u of ['/productos', '/proveedores', '/ordenes-compra', '/entradas']) {
    assert.strictEqual((await llamar('GET', u, { token: a })).status, 200, u);
  }
  assert.strictEqual((await llamar('GET', '/ventas', { token: a })).status, 403);
});

test('login correcto devuelve token y NO devuelve la contraseña', async () => {
  reset();
  respuestas.usuario = { data: { id: 1, username: 'admin01', password: bcrypt.hashSync('1234', 4), nombre: 'Carlos', rol: 'Administrador', activo: true, intentos_fallidos: 0, bloqueado: false }, error: null };
  const r = await llamar('POST', '/login', { body: { username: 'admin01', password: '1234' } });
  assert.strictEqual(r.status, 200);
  assert.ok(r.json.data.token);
  assert.strictEqual(r.json.data.password, undefined);
});

test('login con clave mala usa el contador atómico y avisa intentos restantes', async () => {
  reset();
  respuestas.usuario = { data: { id: 1, username: 'admin01', password: bcrypt.hashSync('1234', 4), rol: 'Administrador', activo: true, intentos_fallidos: 2, bloqueado: false }, error: null };
  respuestas['rpc:registrar_intento_fallido'] = { data: { intentos: 3, bloqueado: false }, error: null };
  const r = await llamar('POST', '/login', { body: { username: 'admin01', password: 'mala' } });
  assert.strictEqual(r.status, 401);
  assert.match(r.json.error, /Intentos restantes: 2/);
  assert.strictEqual(llamadas.rpc[0].nombre, 'registrar_intento_fallido');
});

test('5.º intento fallido bloquea la cuenta (403)', async () => {
  reset();
  respuestas.usuario = { data: { id: 1, username: 'x', password: bcrypt.hashSync('1234', 4), rol: 'Cajero', activo: true, intentos_fallidos: 4, bloqueado: false }, error: null };
  respuestas['rpc:registrar_intento_fallido'] = { data: { intentos: 5, bloqueado: true }, error: null };
  const r = await llamar('POST', '/login', { body: { username: 'x', password: 'mala' } });
  assert.strictEqual(r.status, 403);
});

test('venta: cajero y precios NO vienen del body; el servidor usa los del token', async () => {
  reset();
  respuestas['rpc:registrar_venta'] = { data: { id: 'V001', comprobante: 'B001-000001', total: 80 }, error: null };
  const r = await llamar('POST', '/ventas', {
    token: tokenDe('Cajero', 'cajero01'),
    body: { id_cliente: 'C001', username_cajero: 'hacker', items: [{ id_producto: 'P001', cantidad: 2, precio_unit: 0.01 }] },
  });
  assert.strictEqual(r.status, 201);
  const args = llamadas.rpc[0].args;
  assert.strictEqual(args.p_cajero_username, 'cajero01');
  assert.deepStrictEqual(args.p_detalles, [{ id_producto: 'P001', cantidad: 2 }]);
});

test('venta sin cliente o con cantidad inválida → 400', async () => {
  reset(); const t = tokenDe('Cajero');
  assert.strictEqual((await llamar('POST', '/ventas', { token: t, body: { items: [{ id_producto: 'P1', cantidad: 1 }] } })).status, 400);
  assert.strictEqual((await llamar('POST', '/ventas', { token: t, body: { id_cliente: 'C1', items: [{ id_producto: 'P1', cantidad: -3 }] } })).status, 400);
  assert.strictEqual(llamadas.rpc.length, 0);
});

test('error de negocio de la BD (stock insuficiente) llega al usuario con su mensaje', async () => {
  reset();
  respuestas['rpc:registrar_venta'] = { data: null, error: { code: 'P0001', message: 'Stock insuficiente para "Peluche" (disponible: 1)' } };
  const r = await llamar('POST', '/ventas', { token: tokenDe('Cajero'), body: { id_cliente: 'C1', items: [{ id_producto: 'P1', cantidad: 5 }] } });
  assert.strictEqual(r.status, 409);
  assert.match(r.json.error, /Stock insuficiente/);
});

test('devolución exige motivo y llama a la función atómica con el usuario del token', async () => {
  reset();
  const t = tokenDe('Cajero', 'cajero01');
  assert.strictEqual((await llamar('PUT', '/ventas/V001/devolucion', { token: t, body: {} })).status, 400);
  respuestas['rpc:registrar_devolucion'] = { data: { id: 'D001', monto: 40 }, error: null };
  const r = await llamar('PUT', '/ventas/V001/devolucion', { token: t, body: { motivo: 'Defectuoso', items: [{ id_producto: 'P001', cantidad: 1 }] } });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual([llamadas.rpc[0].args.p_venta_id, llamadas.rpc[0].args.p_username], ['V001', 'cajero01']);
});

test('producto: valida precio, crea y devuelve formato del frontend', async () => {
  reset(); const t = tokenDe('Administrador');
  assert.strictEqual((await llamar('POST', '/productos', { token: t, body: { nombre: 'X', categoria: 'C', precio: -1 } })).status, 400);
  respuestas.producto = { data: { id: 'P010', nombre: 'X', categoria: 'C', precio: '9.90', stock: 0, stock_min: 5, id_proveedor: 'PR001', proveedor: { nombre: 'Prov' } }, error: null };
  const r = await llamar('POST', '/productos', { token: t, body: { nombre: 'X', categoria: 'C', precio: 9.9, stockMin: 5, proveedor: 'PR001' } });
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual([r.json.data.precio, r.json.data.stockMin, r.json.data.proveedorNombre], [9.9, 5, 'Prov']);
  const insert = llamadas.tablas.find(c => c.op === 'insert');
  assert.strictEqual(insert.args[0][0].stock_min, 5);        // columna de BD
  assert.strictEqual(insert.args[0][0].id, undefined);       // el id lo genera la BD
});

test('proveedor: RUC debe tener 11 dígitos; duplicado → 409', async () => {
  reset(); const t = tokenDe('Administrador');
  const base = { nombre: 'A', contacto: 'B', telefono: '1', email: 'a@b.pe' };
  assert.strictEqual((await llamar('POST', '/proveedores', { token: t, body: { ...base, ruc: '123' } })).status, 400);
  respuestas.proveedor = { data: null, error: { code: '23505', message: 'dup' } };
  assert.strictEqual((await llamar('POST', '/proveedores', { token: t, body: { ...base, ruc: '20601234561' } })).status, 409);
});

test('usuarios: no se puede auto-desactivar y solo se guardan campos permitidos', async () => {
  reset(); const t = tokenDe('Administrador', 'admin01', 1);
  const r = await llamar('PUT', '/usuarios/1', { token: t, body: { activo: false } });
  assert.strictEqual(r.status, 400);
  respuestas.usuario = { data: { id: 3, username: 'cajero01' }, error: null };
  await llamar('PUT', '/usuarios/3', { token: t, body: { nombre: 'Ana', bloqueado: false, intentos_fallidos: 0, id: 99, password_hash: 'x' } });
  const upd = llamadas.tablas.find(c => c.op === 'update').args[0];
  assert.deepStrictEqual(Object.keys(upd).sort(), ['bloqueado', 'intentos_fallidos', 'nombre']);
});

test('orden de compra: solo se puede cancelar; el admin sale del token', async () => {
  reset(); const t = tokenDe('Administrador', 'admin01');
  assert.strictEqual((await llamar('PUT', '/ordenes-compra/OC001/estado', { token: t, body: { estado: 'Recibida' } })).status, 400);
  respuestas['rpc:crear_orden_compra'] = { data: { id: 'OC001' }, error: null };
  await llamar('POST', '/ordenes-compra', { token: t, body: { id_proveedor: 'PR001', username_admin: 'otro', items: [{ id_producto: 'P1', cantidad: 2, costo_unit: 5 }] } });
  assert.strictEqual(llamadas.rpc[0].args.p_username, 'admin01');
});

test('entrada: Cajero no puede registrar (403); Almacenero sí', async () => {
  reset();
  assert.strictEqual((await llamar('POST', '/entradas', { token: tokenDe('Cajero'), body: {} })).status, 403);
  respuestas['rpc:registrar_entrada'] = { data: { id: 'E001' }, error: null };
  const r = await llamar('POST', '/entradas', { token: tokenDe('Almacenero'), body: { id_orden: 'OC001', items: [{ id_producto: 'P1', cantidad: 3 }] } });
  assert.strictEqual(r.status, 201);
});

// ───────── Adaptación a la BD real ─────────
test('errores de la BD (MN001/MN002/MN003/MN004) se traducen al status correcto', async () => {
  reset(); const t = tokenDe('Cajero');
  for (const [code, status] of [['MN001', 409], ['MN002', 400], ['MN003', 409], ['MN004', 404]]) {
    respuestas['rpc:registrar_venta'] = { data: null, error: { code, message: 'msg ' + code } };
    const r = await llamar('POST', '/ventas', { token: t, body: { id_cliente: 'C1', items: [{ id_producto: 'P1', cantidad: 1 }] } });
    assert.strictEqual(r.status, status, code);
    assert.strictEqual(r.json.error, 'msg ' + code);
  }
});

test('producto sin proveedor se rechaza (id_proveedor es obligatorio en la BD)', async () => {
  reset();
  const r = await llamar('POST', '/productos', { token: tokenDe('Administrador'), body: { nombre: 'X', categoria: 'C', precio: 5 } });
  assert.strictEqual(r.status, 400);
  assert.match(r.json.error, /proveedor/i);
});

test('listados de productos y proveedores piden solo los activos', async () => {
  reset(); respuestas.producto = { data: [], error: null }; respuestas.proveedor = { data: [], error: null };
  await llamar('GET', '/productos', { token: tokenDe('Cajero') });
  await llamar('GET', '/proveedores', { token: tokenDe('Administrador') });
  const filtros = llamadas.tablas.filter(c => c.op === 'eq' && c.args[0] === 'activo');
  assert.strictEqual(filtros.length, 2);
});

test('fechas timestamptz se muestran en hora de Lima (8 pm del 7/11 no pasa al 8/11)', () => {
  const M = require('../mappers');
  assert.strictEqual(M.orden({ id: 'OC001', fecha: '2026-11-08T01:30:00+00:00', total: 1 }).fecha, '2026-11-07');
  assert.strictEqual(M.orden({ id: 'OC002', fecha: '2026-11-07', total: 1 }).fecha, '2026-11-07');
});
