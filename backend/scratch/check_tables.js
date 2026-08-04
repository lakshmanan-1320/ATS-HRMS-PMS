const { query } = require('../src/config/db');

async function check() {
  try {
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));

    const cols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'appraisal_cycles';
    `);
    console.log('appraisal_cycles columns:', cols.rows);
  } catch (e) {
    console.error(e);
  }
}

check();
