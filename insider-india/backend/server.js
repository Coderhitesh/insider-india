const env = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');
const app = require('./src/app');
const logger = require('./src/utils/logger');
const reminders = require('./src/jobs/siteVisitReminders');

let server;

(async () => {
  try {
    await connectDB();
    server = app.listen(env.port, () => logger.info(`API listening on :${env.port} (${env.nodeEnv})`));
    if (process.env.DISABLE_JOBS !== 'true') reminders.start();
    if (env.otpFixedCode) logger.warn(`OTP TEST MODE: every verification code is ${env.otpFixedCode}. Remove OTP_FIXED_CODE before going live.`);
  } catch (err) {
    logger.error('Startup failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
})();

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  reminders.stop();
  if (!server) return process.exit(0);
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason: String(reason), stack: reason?.stack }));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException');
});
