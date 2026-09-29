const nodemailer = require('nodemailer');

module.exports = (cfg) => {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: Number(cfg.port) || 587,
    secure: Boolean(cfg.secure),
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  return {
    name: 'SMTP',
    async send({ to, subject, body, html }) {
      if (!cfg.host || !cfg.from) return { ok: false, provider: 'SMTP', error: 'SMTP not configured' };
      try {
        const info = await transporter.sendMail({ from: cfg.from, to, subject, text: body, html });
        return { ok: true, provider: 'SMTP', providerRef: info.messageId };
      } catch (err) {
        return { ok: false, provider: 'SMTP', error: err.message };
      }
    },
  };
};
