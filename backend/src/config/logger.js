const env = require('./env');

const logger = {
  info: (msg, ...meta) => {
    if (process.env.NODE_ENV !== 'production' || meta.length > 0) {
      console.log(`[INFO] ${msg}`, ...meta);
    } else {
      console.log(`[INFO] ${msg}`);
    }
  },
  error: (msg, ...meta) => {
    console.error(`[ERROR] ${msg}`, ...meta);
  },
  warn: (msg, ...meta) => {
    console.warn(`[WARN] ${msg}`, ...meta);
  },
};

module.exports = logger;
