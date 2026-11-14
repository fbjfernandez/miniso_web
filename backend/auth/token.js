// Token firmado HS256 con formato JWT, sin dependencias externas.
const crypto = require('crypto');

const b64u = (x) => Buffer.from(x).toString('base64url');
const firmar = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

function sign(payload, secret, ttlSeconds = 8 * 3600) {
  const ahora = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ ...payload, iat: ahora, exp: ahora + ttlSeconds }));
  return `${header}.${body}.${firmar(`${header}.${body}`, secret)}`;
}

function verify(token, secret) {
  const partes = String(token || '').split('.');
  if (partes.length !== 3) throw new Error('Token malformado');
  const [header, body, firma] = partes;
  const esperada = firmar(`${header}.${body}`, secret);
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Firma inválida');
  const h = JSON.parse(Buffer.from(header, 'base64url').toString());
  if (h.alg !== 'HS256') throw new Error('Algoritmo no permitido');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expirado');
  return payload;
}

module.exports = { sign, verify };
