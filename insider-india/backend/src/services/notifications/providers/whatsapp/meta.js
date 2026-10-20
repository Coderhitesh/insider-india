const { httpRequest } = require('../../../../utils/http');

// Meta WhatsApp Cloud API. Business-initiated messages must use approved templates.
module.exports = (cfg) => ({
  name: 'META',
  async send({ to, body, template }) {
    if (!cfg.accessToken || !cfg.phoneNumberId) return { ok: false, provider: 'META', error: 'Meta WhatsApp not configured' };
    let payload;
    if (template?.name) {
      const components = [];
      if (template.variables?.length) {
        components.push({ type: 'body', parameters: template.variables.map((v) => ({ type: 'text', text: String(v ?? '') })) });
      }
      if (template.urlButtonParam) {
        components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(template.urlButtonParam) }] });
      }
      payload = { messaging_product: 'whatsapp', to: `91${to}`, type: 'template', template: { name: template.name, language: { code: template.language || 'en' }, components } };
    } else {
      payload = { messaging_product: 'whatsapp', to: `91${to}`, type: 'text', text: { body } };
    }
    const res = await httpRequest(`https://graph.facebook.com/${cfg.apiVersion || 'v20.0'}/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, provider: 'META', providerRef: res.data?.messages?.[0]?.id, error: res.ok ? undefined : res.error || res.data?.error?.message };
  },
});
