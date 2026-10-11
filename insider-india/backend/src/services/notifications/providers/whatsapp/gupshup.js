const { httpRequest } = require('../../../../utils/http');

module.exports = (cfg) => ({
  name: 'GUPSHUP',
  async send({ to, template }) {
    if (!cfg.apiKey || !cfg.source) return { ok: false, provider: 'GUPSHUP', error: 'Gupshup not configured' };
    if (!template?.id && !template?.name) return { ok: false, provider: 'GUPSHUP', error: 'Template id required for Gupshup' };
    const form = new URLSearchParams({
      channel: 'whatsapp',
      source: cfg.source,
      destination: `91${to}`,
      'src.name': cfg.appName || '',
      template: JSON.stringify({ id: template.id || template.name, params: (template.variables || []).map(String) }),
    });
    const res = await httpRequest('https://api.gupshup.io/wa/api/v1/template/msg', {
      method: 'POST',
      headers: { apikey: cfg.apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const ok = res.ok && res.data?.status !== 'error';
    return { ok, provider: 'GUPSHUP', providerRef: res.data?.messageId, error: ok ? undefined : res.error || res.data?.message };
  },
});
