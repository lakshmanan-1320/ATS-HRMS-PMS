const fs = require('fs');
const path = require('path');
const { getPool } = require('../config/db');
const logger = require('../config/logger');

async function runMigrations() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    // 0. Ensure public schema exists and search_path is set
    await client.query(`CREATE SCHEMA IF NOT EXISTS public;`);
    await client.query(`SET search_path TO public;`);

    // 1. Create migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        run_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.warn('Migrations directory not found, skipping migrations execution.');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    logger.info(`Found ${files.length} migration file(s) in database/migrations.`);

    // 3. Run missing migrations
    for (const file of files) {
      const { rows } = await client.query('SELECT id FROM schema_migrations WHERE name = $1', [file]);
      if (rows.length > 0) {
        logger.info(`Migration ${file} already applied.`);
        continue;
      }

      logger.info(`Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute in a transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`Migration ${file} applied successfully.`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Migration ${file} failed. Rolled back transaction.`, err);
        throw err;
      }
    }

    logger.info('Database migrations are up to date.');
  } catch (err) {
    logger.error('Failed to run database migrations:', err);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  } finally {
    client.release();
  }
}

// Support running directly from command line or requiring programmatically
if (require.main === module) {
  runMigrations().then(() => {
    process.exit(0);
  }).catch((err) => {
    process.exit(1);
  });
}

module.exports = runMigrations;
