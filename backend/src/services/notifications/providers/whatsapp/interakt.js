const { httpRequest } = require('../../../../utils/http');

module.exports = (cfg) => ({
  name: 'INTERAKT',
  async send({ to, template }) {
    if (!cfg.apiKey) return { ok: false, provider: 'INTERAKT', error: 'Interakt API key not configured' };
    if (!template?.name) return { ok: false, provider: 'INTERAKT', error: 'Template name required for Interakt' };
    const tpl = { name: template.name, languageCode: template.language || 'en', bodyValues: (template.variables || []).map(String) };
    if (template.urlButtonParam) tpl.buttonValues = { 0: [String(template.urlButtonParam)] };
    const res = await httpRequest('https://api.interakt.ai/v1/public/message/', {
      method: 'POST',
      headers: { Authorization: `Basic ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode: '+91', phoneNumber: to, type: 'Template', template: tpl }),
    });
    const ok = res.ok && res.data?.result !== false;
    return { ok, provider: 'INTERAKT', providerRef: res.data?.id, error: ok ? undefined : res.error || res.data?.message };
  },
});
