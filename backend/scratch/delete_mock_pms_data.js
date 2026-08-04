const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orgRes = await client.query(`SELECT organization_id FROM organizations WHERE name = 'Insight Technology Demo' LIMIT 1`);
    if (orgRes.rows.length === 0) {
       console.log("Organization 'Insight Technology Demo' not found.");
       return;
    }
    const orgId = orgRes.rows[0].organization_id;

    console.log('Cleaning up mock configurations and goals/KPIs...');

    await client.query(`
      DELETE FROM performance_configurations 
      WHERE organization_id = $1 
        AND cycle_name IN (
          'Top-Down Performance Period 2026', 
          'Bottom-Up Growth Cycle 2026', 
          'Hybrid Strategy Cycle 2026'
        )
    `, [orgId]);

    // Reactivate a default configuration if one was active previously, or leave empty
    const defaultCycleRes = await client.query(`
      SELECT performance_configuration_id 
      FROM performance_configurations 
      WHERE organization_id = $1 
      LIMIT 1
    `, [orgId]);
    if (defaultCycleRes.rows.length > 0) {
      await client.query(`
        UPDATE performance_configurations 
        SET status = 'ACTIVE' 
        WHERE performance_configuration_id = $1
      `, [defaultCycleRes.rows[0].performance_configuration_id]);
      console.log(`Re-activated configuration: ${defaultCycleRes.rows[0].performance_configuration_id}`);
    }

    await client.query('COMMIT');
    console.log('SUCCESS: Mock PMS data has been completely removed.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
