const logger = require('../../../../utils/logger');

module.exports = () => ({
  name: 'LOG',
  async send({ to, body, template }) {
    logger.warn(`[WHATSAPP:LOG] to +91${to} (${template?.name || 'text'}): ${body}`);
    return { ok: true, provider: 'LOG', providerRef: `log-${Date.now()}` };
  },
});
