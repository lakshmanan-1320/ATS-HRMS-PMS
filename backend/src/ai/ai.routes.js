const express = require('express');

const router = express.Router();

const {
  chat
} = require('./ai.controller');

// Authentication middleware should be added here
router.post('/chat', chat);

module.exports = router;