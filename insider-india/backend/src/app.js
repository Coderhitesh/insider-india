const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const env = require('./config/env');
const logger = require('./utils/logger');
const ApiError = require('./utils/ApiError');
const { sanitize, requestId } = require('./middleware/security');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/error');
const routes = require('./routes');

const app = express();

app.set('trust proxy', env.trustProxy);
app.disable('x-powered-by');

app.use(requestId);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({
  origin: (origin, cb) => (!origin || env.corsOrigins.includes(origin) ? cb(null, true) : cb(ApiError.forbidden('Origin not allowed', 'CORS'))),
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Lead-Token', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy'],
  maxAge: 600,
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(sanitize);
app.use(morgan(env.isProd ? 'combined' : 'dev', { stream: logger.stream, skip: (req) => req.path === '/health' }));

app.get('/health', (req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ success: db, status: db ? 'ok' : 'degraded', uptime: Math.round(process.uptime()) });
});

app.use('/api', apiLimiter);
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
