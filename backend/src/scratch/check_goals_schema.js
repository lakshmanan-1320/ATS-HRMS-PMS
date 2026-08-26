require('dotenv').config();
const { query } = require('../src/config/db');

async function run() {
  try {
    const res = await query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'goals'"
    );
    console.log('\nGoals Table Columns:');
    console.log(res.rows);
  } catch (err) {
    console.error('Error running scratch script:', err);
  }
}

run();
