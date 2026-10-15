const { httpRequest } = require('../../../../utils/http');

module.exports = (cfg) => ({
  name: 'TWILIO',
  async send({ to, body }) {
    if (!cfg.accountSid || !cfg.authToken || !cfg.from) return { ok: false, provider: 'TWILIO', error: 'Twilio SMS not configured' };
    const res = await httpRequest(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: `+91${to}`, From: cfg.from, Body: body }).toString(),
    });
    return { ok: res.ok, provider: 'TWILIO', providerRef: res.data?.sid, error: res.ok ? undefined : res.error || res.data?.message };
  },
});
