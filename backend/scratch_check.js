const db = require('./src/config/db');

async function main() {
  try {
    const gaCols = await db.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'goal_assignments'`);
    console.log('goal_assignments cols:', gaCols.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
