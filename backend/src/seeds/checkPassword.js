const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const db = new Pool({ host: 'localhost', port: 5432, database: 'pms_db', user: 'postgres', password: 'postgres@123' })

async function run() {
  const r = await db.query('SELECT id, email, password_hash FROM client_admins LIMIT 5')
  for (const row of r.rows) {
    const match = await bcrypt.compare('Admin@1234', row.password_hash)
    console.log(`id=${row.id} | email=${row.email} | 'Admin@1234' matches: ${match}`)
  }
  await db.end()
}
run().catch(e => { console.error(e.message); db.end() })
