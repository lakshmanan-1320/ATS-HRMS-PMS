const { query } = require('../config/db');

async function checkVector() {
  try {
    console.log('1. Checking database connection...');
    const dbNameRes = await query('SELECT current_database()');
    console.log('Connected to Database:', dbNameRes.rows[0].current_database);

    console.log('2. Checking if vector extension is installed...');
    const extRes = await query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    if (extRes.rows.length > 0) {
      console.log('✓ Vector extension is already installed!');
    } else {
      console.log('Vector extension NOT found in pg_extension. Trying to create...');
      await query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('✓ Vector extension created successfully!');
    }

    console.log('3. Checking existing hr_policies...');
    const polRes = await query('SELECT count(*) FROM hr_policies');
    console.log('Total hr_policies count:', polRes.rows[0].count);

    if (parseInt(polRes.rows[0].count) > 0) {
      const samplePol = await query('SELECT policy_id, title, category FROM hr_policies LIMIT 1');
      console.log('Sample Policy:', samplePol.rows[0]);
    }
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    process.exit(0);
  }
}

checkVector();
