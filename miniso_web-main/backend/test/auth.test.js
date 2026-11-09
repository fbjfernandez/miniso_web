const test = require('node:test');
const assert = require('node:assert');
const { sign, verify } = require('../auth/token');
const M = require('../mappers');

const S = 'secreto-de-prueba-123456';

test('token válido se verifica y conserva el rol', () => {
  const p = verify(sign({ username: 'cajero01', rol: 'Cajero' }, S), S);
  assert.strictEqual(p.rol, 'Cajero');
});
test('token con firma alterada se rechaza (no se puede falsificar el rol)', () => {
  const t = sign({ username: 'cajero01', rol: 'Cajero' }, S);
  const [h, , f] = t.split('.');
  const falso = Buffer.from(JSON.stringify({ username: 'cajero01', rol: 'Administrador', exp: 9999999999 })).toString('base64url');
  assert.throws(() => verify(`${h}.${falso}.${f}`, S));
});
test('token firmado con otra clave se rechaza', () => {
  assert.throws(() => verify(sign({ rol: 'Administrador' }, 'otra-clave-distinta-123'), S));
});
test('token expirado se rechaza', () => {
  assert.throws(() => verify(sign({ rol: 'Cajero' }, S, -10), S), /expirado/);
});
test('mapper de producto entrega el formato del frontend', () => {
  const p = M.producto({ id: 'P001', nombre: 'X', categoria: 'C', precio: '10.5', stock: 3, stock_min: 5, id_proveedor: 'PR001', proveedor: { nombre: 'Prov' } });
  assert.deepStrictEqual([p.precio, p.stockMin, p.proveedor, p.proveedorNombre], [10.5, 5, 'PR001', 'Prov']);
});
