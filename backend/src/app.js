const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const errorMiddleware = require('./middlewares/error.middleware');
const apiRoutes = require('./routes/index');

const app = express();

// Trust proxy for parsing client's real public IP
app.set('trust proxy', true);

// Regex-free lightweight user-agent parser
function parseUA(uaString) {
  const ua = uaString || '';
  let browser_name = 'Unknown Browser';
  let operating_system = 'Unknown OS';
  let device_type = 'Desktop';

  if (ua.includes('Firefox')) browser_name = 'Firefox';
  else if (ua.includes('Chrome') && !ua.includes('Chromium')) browser_name = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser_name = 'Safari';
  else if (ua.includes('Edge') || ua.includes('Edg/')) browser_name = 'Edge';
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser_name = 'Internet Explorer';
  
  if (ua.includes('Windows')) operating_system = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) operating_system = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) operating_system = 'Linux';
  else if (ua.includes('Android')) {
    operating_system = 'Android';
    device_type = 'Mobile';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    operating_system = 'iOS';
    device_type = ua.includes('iPad') ? 'Tablet' : 'Mobile';
  }

  if (ua.includes('Mobile') || ua.includes('Mobi')) {
    if (device_type === 'Desktop') device_type = 'Mobile';
  }

  return { browser_name, operating_system, device_type };
}

// Global Audit Context Middleware
const crypto = require('crypto');
app.use((req, res, next) => {
  req.startTime = Date.now();
  req.requestId = crypto.randomUUID();

  const uaInfo = parseUA(req.headers['user-agent']);

  req.auditContext = {
    requestId: req.requestId,
    startTime: req.startTime,
    ipAddress: req.ip || req.connection.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
    browserName: uaInfo.browser_name,
    operatingSystem: uaInfo.operating_system,
    deviceType: uaInfo.device_type,
    requestUrl: req.originalUrl || req.url,
    httpMethod: req.method,
  };

  // Reusable request-level audit helper
  req.logActivity = async (payload = {}) => {
    const { logActivity } = require('./modules/auditLog/auditLog.service');
    return logActivity({
      organizationId: req.user?.organizationId || payload.organizationId || null,
      actorUserId: req.user?.userId || req.user?.id || payload.actorUserId || null,
      actorEmployeeId: req.user?.employeeId || payload.actorEmployeeId || null,
      actorRole: req.user?.role || payload.actorRole || null,
      actorEmail: req.user?.email || payload.actorEmail || null,
      ...payload,
      reqContext: {
        ...req.auditContext,
        responseStatusCode: payload.responseStatusCode || res.statusCode || 200,
      }
    });
  };

  next();
});

// ── CORS ────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.trim().toLowerCase();
    const isAllowed = allowedOrigins.some(o => o.toLowerCase() === cleanOrigin) ||
                      cleanOrigin.endsWith('.hostingersite.com') ||
                      cleanOrigin.endsWith('.sooriadentalclinic.com') ||
                      cleanOrigin.includes('localhost') ||
                      cleanOrigin.includes('127.0.0.1');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ── Body Parser ─────────────────────────────────────────────────
app.use(express.json());

// ── Rate Limiters (disabled as requested) ────────────────────────
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: env.nodeEnv === 'production' ? 50 : 10000,
//   message: { message: 'Too many requests. Please try again later.' },
// });
// app.use('/api/', limiter);
// 
// const authLimiter = rateLimit({
//   windowMs: 1 * 60 * 1000,
//   max: env.nodeEnv === 'production' ? 10 : 10000,
//   message: { message: 'Too many login attempts. Please wait 15 minutes.' },
// });
// app.use('/api/auth/', authLimiter);

// ── Health Check (always responds, even if DB is down) ──────────
app.get('/api/health', async (req, res) => {
  let dbInfo = 'unknown';
  try {
    const { query } = require('./config/db');
    const result = await query('SELECT current_database() AS db, inet_server_addr() AS host');
    dbInfo = result.rows[0];
  } catch (e) {
    dbInfo = 'DB query failed: ' + e.message;
  }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.nodeEnv,
    platform: process.platform,
    hasDbUrl: !!(process.env.DATABASE_URL || process.env.DATABASE_URI),
    dbHost: process.env.DB_HOST || '(not set)',
    dbName: process.env.DB_NAME || '(not set)',
    dbInfo,
  });
});

// ── API Routes ──────────────────────────────────────────────────
const path = require('path');
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api', apiRoutes);

// ── Background Jobs ─────────────────────────────────────────────
const { startPermissionCreditJob } = require('./jobs/permissionCredit.job');
const { startSalaryRevisionJob } = require('./jobs/salaryRevision.job');
const { startLeaveAccrualJob } = require('./jobs/leaveAccrual.job');
startPermissionCreditJob();
startSalaryRevisionJob();
startLeaveAccrualJob();

// ── Global Error Handler ────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
