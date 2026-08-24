const path = require('path');
const fs = require('fs');

// Check if we are running in the deployed production environment (Hostinger / Linux)
const isDeployed = process.platform !== 'win32';
const prodEnvPath = path.resolve(__dirname, '../../.env.production');

if (isDeployed && fs.existsSync(prodEnvPath)) {
  require('dotenv').config({ path: prodEnvPath, override: true });
} else {
  require('dotenv').config({ override: true });
}

const requiredEnv = [];
if (!process.env.DATABASE_URL && !process.env.DATABASE_URI) {
  requiredEnv.push('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD');
}
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`CRITICAL: Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.warn(`WARNING: JWT_SECRET environment variable is missing. Using development fallback.`);
}

const portVal = process.env.PORT || '5000';
const parsedPort = /^\d+$/.test(portVal) ? parseInt(portVal, 10) : portVal;

module.exports = {
  port: parsedPort,
  nodeEnv: process.env.NODE_ENV || 'development',
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  jwt: {
    secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production_minimum_32_chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '60m',
  },
  db: {
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_URI || null,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },
  mailFallback: {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    encryption: process.env.MAIL_ENCRYPTION,
    username: process.env.MAIL_USERNAME,
    password: process.env.MAIL_PASSWORD,
    fromAddress: process.env.MAIL_FROM_ADDRESS,
    fromName: process.env.MAIL_FROM_NAME,
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
    maxAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '3', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutMinutes: parseInt(process.env.LOCKOUT_MINUTES || '1', 15),
  },
  financialYearStartMonth: parseInt(process.env.FINANCIAL_YEAR_START_MONTH || '4', 10),
  companyRowId: parseInt(process.env.COMPANY_ROW_ID || '1', 10),
  emailEnabled: process.env.EMAIL_ENABLED !== 'false',
  portalUrl: process.env.PORTAL_URL || 'http://localhost:5173',
};
