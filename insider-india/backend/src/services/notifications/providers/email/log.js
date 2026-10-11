const logger = require('../../../../utils/logger');

module.exports = () => ({
  name: 'LOG',
  async send({ to, subject, body }) {
    logger.warn(`[EMAIL:LOG] to ${to} | ${subject}: ${body}`);
    return { ok: true, provider: 'LOG', providerRef: `log-${Date.now()}` };
  },
});
