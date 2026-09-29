const { httpRequest } = require('../../../../utils/http');

// Twilio WhatsApp: template = Content SID (providerTemplateId), variables numbered 1..n.
module.exports = (cfg) => ({
  name: 'TWILIO',
  async send({ to, body, template }) {
    if (!cfg.accountSid || !cfg.authToken || !cfg.from) return { ok: false, provider: 'TWILIO', error: 'Twilio WhatsApp not configured' };
    const params = { To: `whatsapp:+91${to}`, From: cfg.from.startsWith('whatsapp:') ? cfg.from : `whatsapp:${cfg.from}` };
    if (template?.id) {
      params.ContentSid = template.id;
      params.ContentVariables = JSON.stringify(Object.fromEntries((template.variables || []).map((v, i) => [String(i + 1), String(v ?? '')])));
    } else {
      params.Body = body;
    }
    const res = await httpRequest(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });
    return { ok: res.ok, provider: 'TWILIO', providerRef: res.data?.sid, error: res.ok ? undefined : res.error || res.data?.message };
  },
});
