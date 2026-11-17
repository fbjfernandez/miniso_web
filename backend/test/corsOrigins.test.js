const test = require('node:test');
const assert = require('node:assert/strict');
const getAllowedOrigins = require('../utils/corsOrigins');

test('default origins include the deployed Vercel application', () => {
  assert.equal(getAllowedOrigins().has('https://miniso-web-omega.vercel.app'), true);
});

test('configured origins are added without removing defaults', () => {
  const origins = getAllowedOrigins('https://preview.example.com, http://localhost:4000,');

  assert.equal(origins.has('https://miniso-web-omega.vercel.app'), true);
  assert.equal(origins.has('https://preview.example.com'), true);
  assert.equal(origins.has('http://localhost:4000'), true);
  assert.equal(origins.size, 6);
});
