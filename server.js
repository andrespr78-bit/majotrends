'use strict';
const express   = require('express');
const path      = require('path');
const session   = require('express-session');
const bcrypt    = require('bcryptjs');
const Anthropic = require('@anthropic-ai/sdk');
const emailSvc  = require('./email');
const db        = require('./db');

const app       = express();
const PORT      = process.env.PORT || 3001;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const stripe    = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// ===== STRIPE WEBHOOK (raw body — before any parser) =====
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.json({ received: true });
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const userId = parseInt(s.metadata?.userId);
      if (userId) {
        db.updateUserStripe.run(s.customer, s.subscription, 'activo', userId);
        const user = db.getUserById.get(userId);
        if (user) await emailSvc.sendPaymentConfirmation(user);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const all = db.getAllUsers.all();
      const user = all.find(u => u.stripe_subscription_id === sub.id);
      if (user) db.updateUserEstado.run('expirado', user.id);
    }
  } catch (e) { console.error('Webhook handler error:', e.message); }
  res.json({ received: true });
});

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'majo-trends-2026-xK9pQ',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true },
}));

// ===== AUTH HELPERS =====
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return req.path.startsWith('/api/')
      ? res.status(401).json({ error: 'No autorizado.' })
      : res.redirect('/login');
  }
  const user = db.getUserById.get(req.session.userId);
  if (!user) { req.session.destroy(() => {}); return res.redirect('/login'); }

  if (user.estado === 'trial') {
    const expired = new Date() > new Date(user.fecha_vencimiento_trial);
    if (expired) {
      db.updateUserEstado.run('expirado', user.id);
      return req.path.startsWith('/api/')
        ? res.status(402).json({ error: 'Trial expirado.', redirect: '/pago' })
        : res.redirect('/pago?expirado=1');
    }
  }
  if (user.estado === 'pendiente')  return res.redirect('/pendiente');
  if (user.estado === 'expirado')   return req.path.startsWith('/api/') ? res.status(402).json({ error: 'Suscripción vencida.', redirect: '/pago' }) : res.redirect('/pago');
  if (['rechazado','revocado'].includes(user.estado))
    return req.path.startsWith('/api/') ? res.status(403).json({ error: `Acceso denegado.` }) : res.redirect('/login?error=' + user.estado);

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin)
    return req.path.startsWith('/admin/api/') ? res.status(401).json({ error: 'No autorizado.' }) : res.redirect('/admin');
  next();
}

// ===== STATIC (index: false so we control /) =====
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ===== PAGE ROUTES =====
app.get('/',          requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/login',     (req, res) => req.session.userId ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/registro',  (req, res) => req.session.userId ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public/registro.html')));
app.get('/pendiente', (req, res) => res.sendFile(path.join(__dirname, 'public/pendiente.html')));
app.get('/pago',      (req, res) => res.sendFile(path.join(__dirname, 'public/pago.html')));
app.get('/pago/exitoso', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public/pago-exitoso.html')));
app.get('/admin',     (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

// ===== AUTH ROUTES =====
app.post('/auth/registro', async (req, res) => {
  const { nombre, email, password, mensaje } = req.body;
  if (!nombre?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos.' });
  if (password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });

  const existing = db.getUserByEmail.get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'Este email ya está registrado.' });

  const hash = await bcrypt.hash(password, 12);
  db.createUser.run(nombre.trim(), email.toLowerCase().trim(), hash, mensaje?.trim() || null, new Date().toISOString());
  const newUser = db.getUserByEmail.get(email.toLowerCase().trim());
  try { await emailSvc.sendNewRequest(newUser); } catch (e) { console.error('Email nueva solicitud ERROR:', e.message, e.stack); }
  res.json({ ok: true });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos.' });

  const user = db.getUserByEmail.get(email.toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

  if (user.estado === 'rechazado') return res.status(403).json({ error: 'Tu solicitud fue rechazada. Escríbenos a soporte.' });
  if (user.estado === 'revocado')  return res.status(403).json({ error: 'Tu acceso fue revocado. Contacta soporte.' });

  req.session.userId = user.id;
  const redirects = { pendiente: '/pendiente', trial: '/', activo: '/', expirado: '/pago' };
  res.json({ ok: true, redirect: redirects[user.estado] || '/' });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ===== ADMIN AUTH =====
app.post('/admin/login', (req, res) => {
  const ok = req.body.password === (process.env.ADMIN_PASSWORD || 'majo2026admin');
  if (ok) { req.session.isAdmin = true; return res.json({ ok: true }); }
  res.status(401).json({ error: 'Contraseña incorrecta.' });
});
app.post('/admin/logout', (req, res) => { req.session.isAdmin = false; res.json({ ok: true }); });

// ===== ADMIN API =====
app.get('/admin/api/status', (req, res) => res.json({ isAdmin: !!req.session.isAdmin }));

app.get('/admin/api/pendientes', requireAdmin, (req, res) => res.json(db.getPendingUsers.all()));

app.get('/admin/api/usuarios', requireAdmin, (req, res) => res.json(db.getActiveUsers.all()));

app.post('/admin/api/aprobar/:id', requireAdmin, async (req, res) => {
  const user = db.getUserById.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  db.updateUserApproved.run('trial', new Date().toISOString(), expiry.toISOString(), user.id);
  const updated = db.getUserById.get(user.id);
  try { await emailSvc.sendWelcome(updated); } catch (e) { console.error('Email:', e.message); }
  res.json({ ok: true });
});

app.post('/admin/api/rechazar/:id', requireAdmin, (req, res) => {
  const user = db.getUserById.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  db.updateUserEstado.run('rechazado', user.id);
  res.json({ ok: true });
});

app.post('/admin/api/revocar/:id', requireAdmin, (req, res) => {
  db.updateUserEstado.run('revocado', req.params.id);
  res.json({ ok: true });
});

// ===== PROTECTED CONTENT API =====
app.get('/api/me', requireAuth, (req, res) => {
  const { password_hash, ...safe } = req.user;
  // Compute days left if trial
  if (safe.estado === 'trial' && safe.fecha_vencimiento_trial) {
    const ms = new Date(safe.fecha_vencimiento_trial) - new Date();
    safe.dias_restantes = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }
  res.json(safe);
});

app.get('/api/tendencias',         requireAuth, (req, res) => res.json(db.getTendencias.all()));
app.get('/api/tendencias/:cat',    requireAuth, (req, res) => res.json(db.getTendenciasCat.all(req.params.cat)));
app.get('/api/cronologia',         requireAuth, (req, res) => {
  const { anio } = req.query;
  res.json(anio ? db.getCronologiaFiltro.all(anio) : db.getCronologia.all());
});
app.get('/api/proyecciones',       requireAuth, (req, res) => {
  const { anio, escenario } = req.query;
  res.json(anio && escenario ? db.getProyFiltro.all(anio, escenario) : db.getProyecciones.all());
});

app.post('/api/consulta', requireAuth, async (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta?.trim()) return res.status(400).json({ error: 'La pregunta es requerida.' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `Eres la asesora de tendencias de moda de MaJo Colombia, marca de ropa exterior femenina con presencia en Colombia y el mercado latino en EE.UU. Tu nombre es Majo IA. Respondes SIEMPRE en español, de forma elegante, directa y con criterio editorial. Tu especialidad: tendencias de ropa exterior femenina, mercados Colombia y Latino EE.UU., ciclos SS/FW, paletas de color, siluetas, telas, estampados. La cliente MaJo: mujer latinoamericana 28-55 años, profesional, poder adquisitivo medio-alto. Sé concreta y editorial, no genérica.`,
      messages: [{ role: 'user', content: pregunta.trim() }],
    });
    for await (const event of stream)
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta')
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    res.write('data: [DONE]\n\n');
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  } finally { res.end(); }
});

// ===== STRIPE CHECKOUT =====
app.post('/api/stripe/checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY.' });
  try {
    const s = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'MaJo Trends — Suscripción Mensual', description: 'Acceso completo: tendencias, cronología, IA y proyecciones' },
          unit_amount: 499,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: `${req.protocol}://${req.get('host')}/pago/exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${req.protocol}://${req.get('host')}/pago`,
      metadata: { userId: String(req.user.id) },
    });
    res.json({ url: s.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== TRIAL EXPIRY CRON =====
async function checkTrials() {
  const users = db.getAllUsers.all();
  const now = new Date();
  for (const user of users) {
    if (user.estado !== 'trial') continue;
    const expiry = new Date(user.fecha_vencimiento_trial);
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
      db.updateUserEstado.run('expirado', user.id);
    } else if (daysLeft === 5) {
      try { await emailSvc.sendTrialReminder(user, 5); } catch (e) { console.error('Email reminder:', e.message); }
    }
  }
}
checkTrials();
setInterval(checkTrials, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`MaJo Trends corriendo en http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('⚠  ANTHROPIC_API_KEY no configurada.');
  if (!stripe)                        console.warn('⚠  STRIPE_SECRET_KEY no configurada — pagos deshabilitados.');
  console.log(`⚙  Admin password: ${process.env.ADMIN_PASSWORD || 'majo2026admin'}`);
});
