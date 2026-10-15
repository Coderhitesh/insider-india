const logger = require('../../../../utils/logger');

module.exports = () => ({
  name: 'LOG',
  async send({ to, body }) {
    logger.warn(`[SMS:LOG] to +91${to}: ${body}`);
    return { ok: true, provider: 'LOG', providerRef: `log-${Date.now()}` };
  },
});
