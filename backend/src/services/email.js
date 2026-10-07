/**
 * Email service (spec §17 — notifications/errors localized; §21 — password reset by email).
 *
 * Configure via .env to send real email through any SMTP provider:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=465
 *   SMTP_USER=you@gmail.com
 *   SMTP_PASS=<16-char Gmail App Password>
 *   MAIL_FROM="HabitGo <you@gmail.com>"
 *
 * Without SMTP config the API runs in demo mode: the OTP is returned in the
 * API response (dev only) instead of being emailed.
 */
const nodemailer = require('nodemailer');

const config = {
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT || 465),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.MAIL_FROM || process.env.SMTP_USER || 'HabitGo',
};

function isMailConfigured() {
  return !!(config.host && config.user && config.pass);
}

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
  }
  return transporter;
}

/** Branded OTP email (bilingual). */
function otpEmailHtml(code) {
  return `
  <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F8FAF9;border-radius:16px;">
    <div style="background:linear-gradient(135deg,#22C55E,#14B8A6);border-radius:14px;padding:22px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:.5px;">HabitGo</h1>
      <p style="color:rgba(255,255,255,.92);margin:6px 0 0;font-size:13px;">Build Better Habits. Earn Real Rewards.</p>
    </div>
    <div style="background:#fff;border:1px solid #E1E8E3;border-radius:14px;padding:28px;margin-top:14px;text-align:center;">
      <h2 style="color:#17201B;font-size:18px;margin:0 0 8px;">رمز إعادة تعيين كلمة المرور</h2>
      <p style="color:#66736B;font-size:13px;margin:0 0 18px;">Your password reset code</p>
      <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#16A34A;background:#F0FDF4;border:1px solid #DCFCE7;border-radius:12px;padding:14px 0;">${code}</div>
      <p style="color:#98A29C;font-size:12px;margin:18px 0 0;">صالح لمدة 10 دقائق · Valid for 10 minutes</p>
      <p style="color:#98A29C;font-size:12px;margin:6px 0 0;">لو مش إنت الطلبته، تجاهل الإيميل · If you didn't request this, ignore this email</p>
    </div>
  </div>`;
}

async function sendOtpEmail(to, code) {
  if (!isMailConfigured()) return { sent: false };
  await getTransporter().sendMail({
    from: config.from,
    to,
    subject: `HabitGo — رمز إعادة التعيين ${code}`,
    text: `رمز إعادة تعيين كلمة المرور / Password reset code: ${code} (valid 10 minutes)`,
    html: otpEmailHtml(code),
  });
  return { sent: true };
}

module.exports = { isMailConfigured, sendOtpEmail };
