const pg = require('pg');
const { Pool } = pg;
const env = require('./env');
const logger = require('./logger');

// Prevent pg from converting DATE OID (1082) to local JS Date objects (which shifts them based on timezone)
pg.types.setTypeParser(1082, (val) => val);

let pool;

function getPool() {
  if (!pool) {
    const config = env.db.connectionString
      ? {
          connectionString: env.db.connectionString,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
          min: env.db.min,
          max: env.db.max,
        }
      : {
          host: env.db.host,
          port: env.db.port,
          database: env.db.database,
          user: env.db.user,
          password: env.db.password,
          min: env.db.min,
          max: env.db.max,
        };

    pool = new Pool(config);

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
      // Do NOT exit — let the pool recover the connection automatically
    });
  }
  return pool;
}

async function query(text, params) {
  const start = Date.now();
  const dbPool = getPool();
  try {
    const res = await dbPool.query(text, params);
    const duration = Date.now() - start;
    logger.info(`Executed query: ${text.slice(0, 80).replace(/\s+/g, ' ')}... (${duration}ms)`);
    return res;
  } catch (err) {
    logger.error('Query execution error', err);
    throw err;
  }
}

async function withTransaction(callback) {
  const dbPool = getPool();
  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getPool,
  query,
  withTransaction,
};
