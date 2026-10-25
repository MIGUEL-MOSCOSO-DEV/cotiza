import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import {
  requireSession,
  hashPassword,
  verifyPassword,
  startSession,
  sessionToken,
  hashToken,
  createToken,
} from './auth.js';
import { readClient, readQuote, transaction } from './store.js';
import {
  registrationSchema,
  credentialsSchema,
  clientSchema,
  profileSchema,
  quoteSchema,
  decisionSchema,
} from './validation.js';
import { calculateTotals, effectiveStatus } from '../shared/quote.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const publicUser = (user) => ({ id: user.id, email: user.email, ...JSON.parse(user.profile) });
const today = () => new Date().toISOString().slice(0, 10);

export function createApp(db, { appUrl = 'http://localhost:3000', production = false } = {}) {
  const app = express();
  const origin = new URL(appUrl).origin;
  const secure = new URL(appUrl).protocol === 'https:';
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: production
        ? { directives: { upgradeInsecureRequests: secure ? [] : null } }
        : false,
      strictTransportSecurity: secure ? undefined : false,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.headers.origin && req.headers.origin !== origin)
        return next(fail(403, 'El origen de la solicitud no está permitido.'));
      if (req.headers['sec-fetch-site'] === 'cross-site')
        return next(fail(403, 'Solicitud no permitida.'));
      if (
        (req.method !== 'DELETE' ||
          Number(req.headers['content-length']) > 0 ||
          req.headers['transfer-encoding']) &&
        !req.is('application/json')
      )
        return next(fail(415, 'Envía el contenido como JSON.'));
    }
    next();
  });
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Inténtalo en unos minutos.' },
  });
  const responseLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Inténtalo más tarde.' },
  });

  app.post('/api/auth/register', authLimit, async (req, res) => {
    const input = registrationSchema.parse(req.body);
    const id = randomUUID();
    const profile = {
      name: input.name,
      businessName: input.name,
      businessEmail: input.email,
      phone: '',
      taxId: '',
      address: '',
      currency: 'USD',
      terms: '',
    };
    const passwordHash = await hashPassword(input.password);
    try {
      db.prepare('INSERT INTO users (id, email, password_hash, profile) VALUES (?, ?, ?, ?)').run(
        id,
        input.email,
        passwordHash,
        JSON.stringify(profile),
      );
    } catch (error) {
      if (
        error.code?.startsWith('ERR_SQLITE') &&
        db.prepare('SELECT id FROM users WHERE email = ?').get(input.email)
      )
        throw fail(409, 'Ya existe una cuenta con ese correo.');
      throw error;
    }
    startSession(db, res, id, secure);
    res.status(201).json({ user: { id, email: input.email, ...profile } });
  });

  app.post('/api/auth/login', authLimit, async (req, res) => {
    const input = credentialsSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(input.email);
    const stored = user?.password_hash || '00000000000000000000000000000000:' + '00'.repeat(64);
    const valid = await verifyPassword(input.password, stored);
    if (!user || !valid) throw fail(401, 'Correo o contraseña incorrectos.');
    startSession(db, res, user.id, secure);
    res.json({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(sessionToken(req)));
    res.clearCookie('cotiza_session', { path: '/', httpOnly: true, sameSite: 'lax', secure });
    res.json({ ok: true });
  });

  function findPublic(token) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw fail(404, 'La propuesta no está disponible.');
    const row = db.prepare('SELECT * FROM quotes WHERE token_hash = ?').get(hashToken(token));
    if (!row || row.status === 'draft') throw fail(404, 'La propuesta no está disponible.');
    return readQuote(row);
  }

  app.get('/api/public/:token', (req, res) => {
    const quote = findPublic(req.params.token);
    res.json({ quote: { ...quote, status: effectiveStatus(quote) } });
  });

  app.post('/api/public/:token/decision', responseLimit, (req, res) => {
    const input = decisionSchema.parse(req.body);
    const quote = findPublic(req.params.token);
    if (effectiveStatus(quote) !== 'sent')
      throw fail(409, 'Esta propuesta ya fue respondida o ha vencido.');
    const result = db
      .prepare(
        "UPDATE quotes SET status = ?, response_name = ?, responded_at = ?, updated_at = ? WHERE id = ? AND status = 'sent'",
      )
      .run(
        input.decision,
        input.name,
        new Date().toISOString(),
        new Date().toISOString(),
        quote.id,
      );
    if (!result.changes) throw fail(409, 'La propuesta ya fue respondida.');
    res.json({ quote: findPublic(req.params.token) });
  });

  app.use('/api', requireSession(db));
  const clientFor = (id, userId) =>
    readClient(db.prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?').get(id, userId));
  const quoteFor = (id, userId) => {
    const quote = readQuote(
      db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(id, userId),
    );
    if (!quote) throw fail(404, 'No se encontró la cotización.');
    return quote;
  };

  app.get('/api/me', (req, res) => res.json({ user: publicUser(req.user) }));
  app.put('/api/me', (req, res) => {
    const profile = profileSchema.parse(req.body);
    db.prepare('UPDATE users SET profile = ? WHERE id = ?').run(
      JSON.stringify(profile),
      req.user.id,
    );
    res.json({ user: { id: req.user.id, email: req.user.email, ...profile } });
  });
  app.get('/api/clients', (req, res) =>
    res.json({
      clients: db
        .prepare('SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC, rowid DESC')
        .all(req.user.id)
        .map(readClient),
    }),
  );
  app.post('/api/clients', (req, res) => {
    const data = clientSchema.parse(req.body);
    const id = randomUUID();
    db.prepare('INSERT INTO clients (id, user_id, data) VALUES (?, ?, ?)').run(
      id,
      req.user.id,
      JSON.stringify(data),
    );
    res.status(201).json({ client: clientFor(id, req.user.id) });
  });
  app.put('/api/clients/:id', (req, res) => {
    const data = clientSchema.parse(req.body);
    if (!clientFor(req.params.id, req.user.id)) throw fail(404, 'No se encontró el cliente.');
    db.prepare('UPDATE clients SET data = ? WHERE id = ? AND user_id = ?').run(
      JSON.stringify(data),
      req.params.id,
      req.user.id,
    );
    res.json({ client: clientFor(req.params.id, req.user.id) });
  });
  app.delete('/api/clients/:id', (req, res) => {
    if (!clientFor(req.params.id, req.user.id)) throw fail(404, 'No se encontró el cliente.');
    if (db.prepare('SELECT id FROM quotes WHERE client_id = ?').get(req.params.id))
      throw fail(
        409,
        'Este cliente tiene cotizaciones. Conserva su historial o elimina primero sus borradores.',
      );
    db.prepare('DELETE FROM clients WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ ok: true });
  });

  function createQuote(userId, input) {
    if (!clientFor(input.clientId, userId)) throw fail(404, 'Selecciona un cliente de tu cuenta.');
    return transaction(db, () => {
      const number = db
        .prepare('SELECT next_number FROM users WHERE id = ?')
        .get(userId).next_number;
      const id = randomUUID();
      db.prepare('UPDATE users SET next_number = next_number + 1 WHERE id = ?').run(userId);
      db.prepare(
        'INSERT INTO quotes (id, user_id, client_id, number, data) VALUES (?, ?, ?, ?, ?)',
      ).run(id, userId, input.clientId, number, JSON.stringify(input));
      return quoteFor(id, userId);
    });
  }

  app.get('/api/quotes', (req, res) =>
    res.json({
      quotes: db
        .prepare('SELECT * FROM quotes WHERE user_id = ? ORDER BY created_at DESC, rowid DESC')
        .all(req.user.id)
        .map(readQuote),
    }),
  );
  app.post('/api/quotes', (req, res) =>
    res.status(201).json({ quote: createQuote(req.user.id, quoteSchema.parse(req.body)) }),
  );
  app.put('/api/quotes/:id', (req, res) => {
    const input = quoteSchema.parse(req.body);
    const quote = quoteFor(req.params.id, req.user.id);
    if (quote.status !== 'draft')
      throw fail(
        409,
        'Una propuesta compartida no se puede editar. Duplica la cotización para preparar una nueva.',
      );
    if (!clientFor(input.clientId, req.user.id)) throw fail(404, 'No se encontró el cliente.');
    db.prepare(
      'UPDATE quotes SET data = ?, client_id = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    ).run(JSON.stringify(input), input.clientId, new Date().toISOString(), quote.id, req.user.id);
    res.json({ quote: quoteFor(quote.id, req.user.id) });
  });
  app.delete('/api/quotes/:id', (req, res) => {
    const quote = quoteFor(req.params.id, req.user.id);
    if (quote.status !== 'draft') throw fail(409, 'Solo puedes eliminar borradores.');
    db.prepare('DELETE FROM quotes WHERE id = ? AND user_id = ?').run(quote.id, req.user.id);
    res.json({ ok: true });
  });
  app.post('/api/quotes/:id/duplicate', (req, res) => {
    const quote = quoteFor(req.params.id, req.user.id);
    const validUntil = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    res
      .status(201)
      .json({ quote: createQuote(req.user.id, quoteSchema.parse({ ...quote, validUntil })) });
  });
  app.post('/api/quotes/:id/share', (req, res) => {
    const quote = quoteFor(req.params.id, req.user.id);
    if (!['draft', 'sent'].includes(quote.status))
      throw fail(409, 'La propuesta ya tiene una respuesta.');
    if (quote.validUntil < today())
      throw fail(409, 'Actualiza la fecha de validez antes de compartir.');
    const token = createToken();
    const profile = JSON.parse(req.user.profile);
    const snapshot = quote.snapshot || {
      business: profile,
      client: clientFor(quote.clientId, req.user.id),
      totals: calculateTotals(quote.items, quote.discountPercent, quote.taxPercent),
    };
    db.prepare(
      "UPDATE quotes SET status = 'sent', snapshot = ?, token_hash = ?, sent_at = COALESCE(sent_at, ?), updated_at = ? WHERE id = ? AND user_id = ?",
    ).run(
      JSON.stringify(snapshot),
      hashToken(token),
      new Date().toISOString(),
      new Date().toISOString(),
      quote.id,
      req.user.id,
    );
    res.json({ quote: quoteFor(quote.id, req.user.id), url: origin + '/p/' + token });
  });
  app.post('/api/quotes/:id/revoke', (req, res) => {
    const quote = quoteFor(req.params.id, req.user.id);
    if (quote.status === 'draft') throw fail(409, 'El borrador no tiene un enlace activo.');
    db.prepare('UPDATE quotes SET token_hash = NULL WHERE id = ? AND user_id = ?').run(
      quote.id,
      req.user.id,
    );
    res.json({ ok: true });
  });
  app.get('/api/export', (req, res) => {
    res.attachment('cotiza-export.json').json({
      exportedAt: new Date().toISOString(),
      profile: publicUser(req.user),
      clients: db
        .prepare('SELECT * FROM clients WHERE user_id = ?')
        .all(req.user.id)
        .map(readClient),
      quotes: db.prepare('SELECT * FROM quotes WHERE user_id = ?').all(req.user.id).map(readQuote),
    });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'La ruta no existe.' }));
  app.use((error, req, res, next) => {
    if (error instanceof ZodError) {
      const field = error.issues[0]?.path.join('.') || 'datos';
      return res.status(400).json({
        error: 'Revisa el campo «' + field + '».',
        issues: error.issues.map(({ path, message }) => ({ path, message })),
      });
    }
    if (error.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'El JSON no es válido.' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'El contenido es demasiado grande.' });
    if (!error.status) console.error(error);
    res
      .status(error.status || 500)
      .json({ error: error.status ? error.message : 'No se pudo completar la operación.' });
  });
  return app;
}
