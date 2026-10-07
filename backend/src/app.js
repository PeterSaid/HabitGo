const express = require('express');
const cors = require('cors');
const { config } = require('./config');
const { migrate } = require('./db');
const { errorHandler } = require('./middleware/errors');
const { rateLimit } = require('./middleware/rateLimit');

const { router: authRouter } = require('./routes/auth');
const usersRouter = require('./routes/users');
const habitsRouter = require('./routes/habits');
const metaRouter = require('./routes/meta');
const dashboardRouter = require('./routes/dashboard');
const rewardsRouter = require('./routes/rewards');
const engagementRouter = require('./routes/engagement');
const adminRouter = require('./routes/admin');

function buildApp() {
  migrate();

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(cors({ origin: config.corsOrigins === '*' ? true : config.corsOrigins.split(',') }));

  app.get('/api/health', (req, res) => res.json({ ok: true, service: 'habitgo-api', version: '1.0.0' }));

  app.use('/api/v1/auth', rateLimit({ key: 'auth', max: 60 }), authRouter);
  app.use('/api/v1', metaRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/habits', habitsRouter);
  app.use('/api/v1', dashboardRouter);
  app.use('/api/v1', rewardsRouter);
  app.use('/api/v1', engagementRouter);
  app.use('/api/v1/admin', adminRouter);

  app.use((req, res) => res.status(404).json({ error: { code: 'not_found', message: 'Not found' } }));
  app.use(errorHandler);
  return app;
}

module.exports = { buildApp };
