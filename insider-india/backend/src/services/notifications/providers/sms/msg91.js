const { httpRequest } = require('../../../../utils/http');

// MSG91 Flow API (DLT-registered template). Variables are sent by name.
module.exports = (cfg) => ({
  name: 'MSG91',
  async send({ to, template }) {
    if (!cfg.authKey) return { ok: false, provider: 'MSG91', error: 'MSG91 auth key not configured' };
    if (!template?.id) return { ok: false, provider: 'MSG91', error: 'MSG91 flow/template id missing for this event' };
    const res = await httpRequest('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: { authkey: cfg.authKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        template_id: template.id,
        short_url: '0',
        recipients: [{ mobiles: `91${to}`, ...(template.namedVariables || {}) }],
      }),
    });
    const ok = res.ok && res.data?.type !== 'error';
    return { ok, provider: 'MSG91', providerRef: res.data?.message, error: ok ? undefined : res.error || JSON.stringify(res.data) };
  },
});
