require('dotenv').config();
const { query } = require('../src/config/db');

async function run() {
  try {
    const res = await query(
      "SELECT performance_configuration_id, cycle_name, cycle_type, status, start_date, end_date FROM performance_configurations"
    );
    console.log('\nPerformance Configurations in DB:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error running scratch script:', err);
  }
}

run();
