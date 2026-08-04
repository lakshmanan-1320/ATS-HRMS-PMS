const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');

async function start() {
  // Run migrations only in development (use `npm run db:migrate` in production)
  if (env.nodeEnv === 'development') {
    try {
      const runMigrations = require('./database/runMigrations');
      logger.info('Running database migrations (development mode)...');
      await runMigrations();

      // Auto-seed: always run idempotent seeds in development mode
      // Seeders are designed to skip existing data (upsert/check-before-insert)
      const { query } = require('./config/db');
      try {
        const res = await query('SELECT COUNT(*) FROM client_admins');
        if (parseInt(res.rows[0].count) === 0) {
          logger.info('No client admins found. Running initial seeds...');
        } else {
          logger.info('Ensuring seed data is up to date...');
        }
        const runSeeds = require('./database/runSeeds');
        await runSeeds();
      } catch (err) {
        logger.info('Database tables may not exist. Running full reset and seed...');
        try {
          const resetDB = require('./database/resetDB');
          await resetDB();
        } catch (seedErr) {
          logger.error('Failed to initialize database on startup:', seedErr);
        }
      }
    } catch (migrationErr) {
      // Non-fatal: log and continue — server should still start
      logger.error('Migration/seed error during startup (non-fatal):', migrationErr.message);
    }
  }

  // Warm up the DB connection pool so the first API request doesn't pay cold-connect latency
  try {
    const { getPool } = require('./config/db');
    getPool().query('SELECT 1').catch(err => logger.warn('DB pool warmup failed:', err.message));
  } catch (err) {
    logger.warn('DB pool warmup skipped:', err.message);
  }

  // ALWAYS start listening — even if DB is temporarily down
  app.listen(env.port, () => {
    const listenTarget = typeof env.port === 'number' ? `http://localhost:${env.port}` : env.port;
    logger.info(`Backend running on ${listenTarget} [${env.nodeEnv}]`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  // Last resort: still try to start the HTTP server
  try {
    app.listen(env.port, () => {
      logger.info('Server started in fallback mode (DB may be unavailable)');
    });
  } catch (listenErr) {
    logger.error('FATAL: Cannot start HTTP listener:', listenErr);
    process.exit(1);
  }
});
