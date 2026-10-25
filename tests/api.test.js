import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { openStore } from '../server/store.js';

const db = openStore(':memory:');
let server, base, alice, bob, clientId, quoteId, publicPath;
const validUntil = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
const clientData = {
  name: 'Cliente de prueba',
  company: '',
  email: '',
  phone: '',
  taxId: '',
  address: '',
};
const quoteData = () => ({
  clientId,
  title: 'Propuesta de prueba',
  currency: 'PEN',
  validUntil,
  discountPercent: 10,
  taxPercent: 18,
  notes: '',
  terms: '',
  items: [{ description: 'Servicio', quantity: 1.5, unitPriceCents: 10001 }],
});

async function request(path, { cookie, body, method = 'GET', headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
before(async () => {
  server = createApp(db).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

test('protege los datos sin sesión y empieza sin cuentas', async () => {
  assert.equal(db.prepare('SELECT count(*) AS count FROM users').get().count, 0);
  assert.equal((await request('/api/quotes')).status, 401);
});
test('crea cuentas con sesiones separadas y contraseñas derivadas', async () => {
  const first = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Alice', email: 'alice@test.invalid', password: 'a-long-password-123' },
  });
  const second = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Bob', email: 'bob@test.invalid', password: 'a-long-password-456' },
  });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  alice = first.cookie;
  bob = second.cookie;
  assert.notEqual(alice, bob);
  assert.equal('password_hash' in first.data.user, false);
  assert.notEqual(
    db.prepare('SELECT password_hash FROM users WHERE email = ?').get('alice@test.invalid')
      .password_hash,
    'a-long-password-123',
  );
  assert.deepEqual((await request('/api/quotes', { cookie: alice })).data.quotes, []);
});
test('rechaza el registro repetido y las credenciales incorrectas', async () => {
  assert.equal(
    (
      await request('/api/auth/register', {
        method: 'POST',
        body: { name: 'Alice', email: 'alice@test.invalid', password: 'a-long-password-123' },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request('/api/auth/login', {
        method: 'POST',
        body: { email: 'alice@test.invalid', password: 'wrong-password-123' },
      })
    ).status,
    401,
  );
});
test('bloquea solicitudes de otro origen y contenido ajeno a JSON', async () => {
  assert.equal(
    (
      await request('/api/clients', {
        cookie: alice,
        method: 'POST',
        body: clientData,
        headers: { Origin: 'https://untrusted.invalid' },
      })
    ).status,
    403,
  );
  const response = await fetch(base + '/api/clients', {
    method: 'POST',
    headers: { Cookie: alice, 'Content-Type': 'text/plain' },
    body: '{}',
  });
  assert.equal(response.status, 415);
});
test('mantiene clientes aislados por cuenta', async () => {
  const created = await request('/api/clients', {
    cookie: alice,
    method: 'POST',
    body: clientData,
  });
  assert.equal(created.status, 201);
  clientId = created.data.client.id;
  assert.deepEqual((await request('/api/clients', { cookie: bob })).data.clients, []);
  assert.equal(
    (await request('/api/clients/' + clientId, { cookie: bob, method: 'PUT', body: clientData }))
      .status,
    404,
  );
  assert.equal(
    (await request('/api/quotes', { cookie: bob, method: 'POST', body: quoteData() })).status,
    404,
  );
});
test('guarda cotizaciones y asigna números dentro de una transacción', async () => {
  const created = await request('/api/quotes', {
    cookie: alice,
    method: 'POST',
    body: quoteData(),
  });
  assert.equal(created.status, 201);
  quoteId = created.data.quote.id;
  assert.equal(created.data.quote.number, 1);
  assert.equal(
    (await request('/api/quotes/' + quoteId, { cookie: bob, method: 'PUT', body: quoteData() }))
      .status,
    404,
  );
  assert.equal(
    (await request('/api/clients/' + clientId, { cookie: alice, method: 'DELETE' })).status,
    409,
  );
});
test('congela los datos al compartir y conserva los importes originales', async () => {
  const shared = await request('/api/quotes/' + quoteId + '/share', {
    cookie: alice,
    method: 'POST',
    body: {},
  });
  assert.equal(shared.status, 200);
  publicPath = new URL(shared.data.url).pathname.replace('/p/', '/api/public/');
  assert.equal(shared.data.quote.snapshot.totals.total, 15932);
  assert.equal(
    (await request('/api/quotes/' + quoteId, { cookie: alice, method: 'PUT', body: quoteData() }))
      .status,
    409,
  );
  await request('/api/clients/' + clientId, {
    cookie: alice,
    method: 'PUT',
    body: { ...clientData, name: 'Nombre nuevo' },
  });
  const visible = await request(publicPath);
  assert.equal(visible.data.quote.snapshot.client.name, clientData.name);
  assert.equal(visible.data.quote.status, 'sent');
});
test('regenerar el enlace invalida el anterior', async () => {
  const previous = publicPath;
  const shared = await request('/api/quotes/' + quoteId + '/share', {
    cookie: alice,
    method: 'POST',
    body: {},
  });
  publicPath = new URL(shared.data.url).pathname.replace('/p/', '/api/public/');
  assert.equal((await request(previous)).status, 404);
  assert.equal((await request(publicPath)).status, 200);
});
test('registra una sola decisión y bloquea modificaciones posteriores', async () => {
  const response = await request(publicPath + '/decision', {
    method: 'POST',
    body: { decision: 'accepted', name: 'Contacto autorizado' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.data.quote.status, 'accepted');
  assert.equal(response.data.quote.responseName, 'Contacto autorizado');
  assert.equal(
    (
      await request(publicPath + '/decision', {
        method: 'POST',
        body: { decision: 'rejected', name: 'Otro contacto' },
      })
    ).status,
    409,
  );
  assert.equal(
    (await request('/api/quotes/' + quoteId, { cookie: alice, method: 'DELETE' })).status,
    409,
  );
});
test('duplica como borrador y no copia el enlace ni la respuesta', async () => {
  const copy = await request('/api/quotes/' + quoteId + '/duplicate', {
    cookie: alice,
    method: 'POST',
    body: {},
  });
  assert.equal(copy.status, 201);
  assert.equal(copy.data.quote.number, 2);
  assert.equal(copy.data.quote.status, 'draft');
  assert.equal(copy.data.quote.snapshot, null);
  assert.equal(copy.data.quote.respondedAt, null);
});
test('una propuesta vencida no admite decisiones', async () => {
  const created = await request('/api/quotes', {
    cookie: alice,
    method: 'POST',
    body: quoteData(),
  });
  const id = created.data.quote.id;
  const shared = await request('/api/quotes/' + id + '/share', {
    cookie: alice,
    method: 'POST',
    body: {},
  });
  const path = new URL(shared.data.url).pathname.replace('/p/', '/api/public/');
  db.prepare('UPDATE quotes SET data = ? WHERE id = ?').run(
    JSON.stringify({ ...quoteData(), validUntil: '2000-01-01' }),
    id,
  );
  assert.equal((await request(path)).data.quote.status, 'expired');
  assert.equal(
    (
      await request(path + '/decision', {
        method: 'POST',
        body: { decision: 'accepted', name: 'Contacto' },
      })
    ).status,
    409,
  );
});
test('exporta solo los datos propios y omite credenciales y tokens', async () => {
  const result = await request('/api/export', { cookie: alice });
  assert.equal(result.status, 200);
  assert.equal(result.data.clients.length, 1);
  assert.equal(JSON.stringify(result.data).includes('password_hash'), false);
  assert.equal(JSON.stringify(result.data).includes('token_hash'), false);
  assert.deepEqual((await request('/api/export', { cookie: bob })).data.quotes, []);
});
test('revoca el enlace sin borrar la respuesta registrada', async () => {
  assert.equal(
    (
      await request('/api/quotes/' + quoteId + '/revoke', {
        cookie: alice,
        method: 'POST',
        body: {},
      })
    ).status,
    200,
  );
  assert.equal((await request(publicPath)).status, 404);
  const quotes = (await request('/api/quotes', { cookie: alice })).data.quotes;
  assert.equal(quotes.find((quote) => quote.id === quoteId).status, 'accepted');
});
test('permite eliminar un borrador sin enviar cuerpo en DELETE', async () => {
  const created = await request('/api/quotes', {
    cookie: alice,
    method: 'POST',
    body: quoteData(),
  });
  assert.equal(
    (await request('/api/quotes/' + created.data.quote.id, { cookie: alice, method: 'DELETE' }))
      .status,
    200,
  );
});

test('el acceso con contraseña válida crea una nueva sesión', async () => {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'alice@test.invalid', password: 'a-long-password-123' },
  });
  assert.equal(result.status, 200);
  assert.equal(
    (await request('/api/me', { cookie: result.cookie })).data.user.email,
    'alice@test.invalid',
  );
});

test('cerrar sesión invalida la cookie en el servidor', async () => {
  assert.equal(
    (await request('/api/auth/logout', { cookie: alice, method: 'POST', body: {} })).status,
    200,
  );
  assert.equal((await request('/api/me', { cookie: alice })).status, 401);
});
