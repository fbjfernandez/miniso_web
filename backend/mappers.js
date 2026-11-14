// Traduce filas de la BD (snake_case) al formato que consume el frontend.
const n = (v) => (v === null || v === undefined ? v : Number(v));
// Las columnas date llegan como 'YYYY-MM-DD'; las timestamptz en UTC: se convierten al día de Lima
const dia = (f) => {
  if (!f) return null;
  const t = String(f);
  if (t.length <= 10) return t;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? t.slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
};

const producto = (r) => ({
  id: r.id,
  nombre: r.nombre,
  categoria: r.categoria,
  precio: n(r.precio),
  costo: n(r.costo),
  stock: n(r.stock),
  stockMin: n(r.stock_min ?? r.stockMin ?? 0),
  proveedor: r.id_proveedor ?? null,
  proveedorNombre: (r.proveedor && r.proveedor.nombre) || r.proveedor_nombre || null,
});

const orden = (r) => ({
  id: r.id,
  fecha: dia(r.fecha),
  proveedor: r.id_proveedor,
  proveedorNombre: (r.proveedor && r.proveedor.nombre) || null,
  admin: r.username_admin,
  total: n(r.total),
  estado: r.estado,
});

const entrada = (r) => ({
  id: r.id,
  fecha: dia(r.fecha),
  orden: r.id_orden,
  almacenero: r.username_almacenero,
  productos: n(r.cantidad_productos),
  proveedorNombre: (r.orden_compra && r.orden_compra.proveedor && r.orden_compra.proveedor.nombre) || null,
});

const venta = (r) => ({
  id: r.id,
  comprobante: r.comprobante,
  fecha: dia(r.fecha),
  id_cliente: r.id_cliente,
  nombre_cliente: r.nombre_cliente,
  cajero: r.cajero,
  total: n(r.total),
  monto_devuelto: n(r.monto_devuelto) || 0,
  estado: r.estado,
});

module.exports = { producto, orden, entrada, venta, n };
