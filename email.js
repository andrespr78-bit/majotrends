'use strict';
const nodemailer = require('nodemailer');

const configured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = configured
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    })
  : null;

const FROM = process.env.EMAIL_FROM || `MaJo Trends <${process.env.EMAIL_USER}>`;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

async function send({ to, subject, html }) {
  if (!configured) {
    console.log(`\n📧 [EMAIL SIMULADO]\n  Para: ${to}\n  Asunto: ${subject}\n`);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
}

const base = (content) => `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0D0D0D;color:#F0EDE8;margin:0;padding:0}
  .wrap{max-width:540px;margin:0 auto;padding:40px 20px}
  .logo{font-family:Georgia,serif;font-size:22px;color:#C9A96E;letter-spacing:2px;margin-bottom:32px}
  .card{background:#161616;border:1px solid #2A2A2A;border-radius:12px;padding:32px}
  h2{font-family:Georgia,serif;font-weight:300;font-size:28px;color:#F0EDE8;margin:0 0 16px}
  p{font-size:15px;line-height:1.7;color:#A09890;margin:0 0 16px}
  .btn{display:inline-block;background:#C9A96E;color:#0D0D0D;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:8px 0}
  .footer{margin-top:28px;font-size:12px;color:#4A4540;text-align:center}
  .gold{color:#C9A96E}
</style></head><body><div class="wrap">
  <div class="logo">MJ · MAJO TRENDS</div>
  <div class="card">${content}</div>
  <div class="footer">MaJo Colombia · Inteligencia de Moda · <a href="${BASE_URL}" style="color:#C9A96E">majotrends.co</a></div>
</div></body></html>`;

async function sendWelcome(user) {
  const expiry = new Date(user.fecha_vencimiento_trial);
  const fechaStr = expiry.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  await send({
    to: user.email,
    subject: '✦ Bienvenida a MaJo Trends — Tu trial está activo',
    html: base(`
      <h2>Hola, ${user.nombre} 👋</h2>
      <p>Tu solicitud fue <span class="gold">aprobada</span>. Tienes acceso completo a MaJo Trends por <strong>30 días</strong>.</p>
      <p>Tu trial vence el <strong class="gold">${fechaStr}</strong>. Después podrás continuar por <strong>$4.99/mes</strong>.</p>
      <a href="${BASE_URL}/login" class="btn">Entrar a MaJo Trends →</a>
      <p style="margin-top:24px">Explora tendencias, consulta la cronología 2023–2025 y proyecta escenarios para tu próxima colección.</p>
    `),
  });
}

async function sendTrialReminder(user, daysLeft) {
  const expiry = new Date(user.fecha_vencimiento_trial);
  const fechaStr = expiry.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  await send({
    to: user.email,
    subject: `⏰ Tu trial de MaJo Trends vence en ${daysLeft} días`,
    html: base(`
      <h2>Faltan ${daysLeft} días</h2>
      <p>Tu acceso a MaJo Trends vence el <strong class="gold">${fechaStr}</strong>.</p>
      <p>Para no perder acceso a las tendencias, proyecciones y la consulta con IA, activa tu suscripción por solo <strong>$4.99/mes</strong>.</p>
      <a href="${BASE_URL}/pago" class="btn">Activar suscripción →</a>
    `),
  });
}

async function sendPaymentConfirmation(user) {
  await send({
    to: user.email,
    subject: '✓ Suscripción activada — MaJo Trends',
    html: base(`
      <h2>¡Suscripción activa!</h2>
      <p>Tu pago fue procesado correctamente. Tu suscripción a MaJo Trends por <strong class="gold">$4.99/mes</strong> está activa.</p>
      <p>Accede en cualquier momento desde cualquier dispositivo.</p>
      <a href="${BASE_URL}" class="btn">Ir a MaJo Trends →</a>
    `),
  });
}

module.exports = { sendWelcome, sendTrialReminder, sendPaymentConfirmation };
