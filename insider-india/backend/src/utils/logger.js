const fs = require('fs');
const path = require('path');
const winston = require('winston');
const env = require('../config/env');

const logDir = path.resolve(__dirname, '../../logs');
fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const logger = winston.createLogger({
  level: env.logLevel,
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: { service: 'insider-india-api' },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log'), maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
  ],
});

logger.add(
  new winston.transports.Console({
    format: env.isProd
      ? combine(timestamp(), json())
      : combine(colorize(), printf(({ level, message, timestamp: t, service, ...meta }) => {
        const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${t} ${level}: ${message}${rest}`;
      })),
  }),
);

logger.stream = { write: (msg) => logger.http(msg.trim()) };

module.exports = logger;
