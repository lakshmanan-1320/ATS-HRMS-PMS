const { query } = require('../../config/db');
const env = require('../../config/env');

async function getSmtpSettings() {
  try {
    const result = await query('SELECT * FROM smtp_settings LIMIT 1');
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        host: row.host,
        port: row.port,
        encryption: row.encryption,
        username: row.username,
        password: row.password,
        fromAddress: row.from_address,
        fromName: row.from_name,
      };
    }
  } catch (err) {
    // fallback below
  }
  return {
    host: env.mailFallback.host,
    port: env.mailFallback.port,
    encryption: env.mailFallback.encryption,
    username: env.mailFallback.username,
    password: env.mailFallback.password,
    fromAddress: env.mailFallback.fromAddress,
    fromName: env.mailFallback.fromName,
  };
}

async function saveSmtpSettings(settings) {
  const { host, port, encryption, username, password, fromAddress, fromName } = settings;
  await query(`
    INSERT INTO smtp_settings (id, host, port, encryption, username, password, from_address, from_name)
    VALUES (1, $1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (id) DO UPDATE
    SET host=$1, port=$2, encryption=$3, username=$4,
        password = CASE WHEN $5 <> '' THEN $5 ELSE smtp_settings.password END,
        from_address=$6, from_name=$7, updated_at=NOW()
  `, [host, port, encryption, username, password || '', fromAddress, fromName]);
}

module.exports = {
  getSmtpSettings,
  saveSmtpSettings,
};
