'use strict';
const { Resend } = require('resend');

const FROM  = 'noreply@majocolombia.com';
const ADMIN = 'hola@majocolombia.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

let resend = null;

function getClient() {
  if (!resend) {
    console.log('[EMAIL] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
    if (!process.env.RESEND_API_KEY) return null;
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

async function send({ to, subject, html }) {
  const client = getClient();
  if (!client) {
    console.log(`\n📧 [EMAIL SIMULADO]\n  Para: ${to}\n  Asunto: ${subject}\n`);
    return;
  }
  const { error } = await client.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(error.message);
}

// ===== BASE TEMPLATE =====
const base = (content) => `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0D0D0D;color:#F0EDE8;margin:0;padding:0}
  .wrap{max-width:560px;margin:0 auto;padding:40px 20px}
  .logo{display:flex;align-items:center;gap:10px;margin-bottom:36px}
  .logo-mark{width:30px;height:30px;background:#C9A96E;color:#0D0D0D;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;letter-spacing:1px;font-family:Georgia,serif;text-align:center;line-height:30px}
  .logo-name{font-family:Georgia,serif;font-size:16px;font-weight:400;color:#C9A96E;letter-spacing:2px}
  .card{background:#161616;border:1px solid #2A2A2A;border-radius:12px;padding:36px}
  h2{font-family:Georgia,serif;font-weight:300;font-size:28px;color:#F0EDE8;margin:0 0 14px;line-height:1.25}
  p{font-size:14px;line-height:1.75;color:#A09890;margin:0 0 16px}
  .gold{color:#C9A96E;font-weight:500}
  .btn{display:inline-block;background:#C9A96E;color:#0D0D0D;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:8px 0;letter-spacing:.2px}
  .divider{border:none;border-top:1px solid #2A2A2A;margin:24px 0}
  .meta{font-size:12px;color:#4A4540;padding:14px 18px;background:#111;border:1px solid #222;border-radius:8px;margin-bottom:16px}
  .meta strong{color:#7A7470}
  .footer{margin-top:28px;font-size:12px;color:#3A3530;text-align:center;line-height:1.8}
  .footer a{color:#6A5A4A;text-decoration:none}
</style></head><body><div class="wrap">
  <div class="logo">
    <div class="logo-mark">MJ</div>
    <span class="logo-name">MAJO TRENDS</span>
  </div>
  <div class="card">${content}</div>
  <div class="footer">MaJo Colombia · Inteligencia de Moda<br>
    <a href="${BASE_URL}">majotrends.co</a> · <a href="mailto:${ADMIN}">hola@majocolombia.com</a>
  </div>
</div></body></html>`;

// ===== 1. NUEVA SOLICITUD → ADMIN =====
async function sendNewRequest(user) {
  console.log('[EMAIL] sendNewRequest called for:', user?.email);
  const fechaStr = new Date(user.fecha_solicitud).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  await send({
    to: ADMIN,
    subject: `✦ Nueva solicitud de acceso — ${user.nombre}`,
    html: base(`
      <h2>Nueva solicitud</h2>
      <p>Una persona acaba de solicitar acceso a MaJo Trends.</p>
      <div class="meta">
        <strong>Nombre:</strong> ${user.nombre}<br>
        <strong>Email:</strong> ${user.email}<br>
        <strong>Fecha:</strong> ${fechaStr}
        ${user.mensaje_solicitud ? `<br><strong>Mensaje:</strong> ${user.mensaje_solicitud}` : ''}
      </div>
      <p>Revisa y aprueba o rechaza la solicitud desde el panel de administración.</p>
      <a href="${BASE_URL}/admin" class="btn">Ir al panel admin →</a>
    `),
  });
}

// ===== 2. ACCESO APROBADO → USUARIA =====
async function sendWelcome(user) {
  console.log('[EMAIL] sendWelcome called for:', user?.email);
  const expiry   = new Date(user.fecha_vencimiento_trial);
  const fechaStr = expiry.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  await send({
    to: user.email,
    subject: '✦ Tu acceso a MaJo Trends está activo',
    html: base(`
      <h2>Hola, ${user.nombre} 👋</h2>
      <p>Tu solicitud fue <span class="gold">aprobada</span>. Tienes acceso completo a MaJo Trends durante <strong>30 días</strong>.</p>
      <p>Tu trial vence el <span class="gold">${fechaStr}</span>. Después puedes continuar por <strong>$4.99/mes</strong>.</p>
      <a href="${BASE_URL}" class="btn">Entrar a MaJo Trends →</a>
      <hr class="divider"/>
      <p style="font-size:13px">Explora tendencias SS/FW, consulta la cronología 2023–2025 y proyecta escenarios para tu próxima colección con Majo IA.</p>
    `),
  });
}

// ===== 3. RECORDATORIO TRIAL → USUARIA =====
async function sendTrialReminder(user, daysLeft) {
  console.log('[EMAIL] sendTrialReminder called for:', user?.email, '— days left:', daysLeft);
  const expiry   = new Date(user.fecha_vencimiento_trial);
  const fechaStr = expiry.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  await send({
    to: user.email,
    subject: `⏰ Tu trial de MaJo Trends vence en ${daysLeft} días`,
    html: base(`
      <h2>Faltan ${daysLeft} días</h2>
      <p>Tu acceso a MaJo Trends vence el <span class="gold">${fechaStr}</span>.</p>
      <p>Para no perder las tendencias, proyecciones y consultas con Majo IA, activa tu suscripción por solo <strong>$4.99/mes</strong>.</p>
      <a href="${BASE_URL}/pago" class="btn">Activar suscripción →</a>
      <hr class="divider"/>
      <p style="font-size:13px;color:#6A6460">Cancela cuando quieras. Sin contratos ni compromisos.</p>
    `),
  });
}

// ===== 4. PAGO CONFIRMADO → USUARIA =====
async function sendPaymentConfirmation(user) {
  console.log('[EMAIL] sendPaymentConfirmation called for:', user?.email);
  await send({
    to: user.email,
    subject: '✓ Suscripción activada — MaJo Trends',
    html: base(`
      <h2>¡Suscripción activa!</h2>
      <p>Tu pago fue procesado correctamente. Tu suscripción a MaJo Trends por <span class="gold">$4.99/mes</span> está activa.</p>
      <p>Accede en cualquier momento desde cualquier dispositivo.</p>
      <a href="${BASE_URL}" class="btn">Ir a MaJo Trends →</a>
    `),
  });
}

module.exports = { sendNewRequest, sendWelcome, sendTrialReminder, sendPaymentConfirmation };
