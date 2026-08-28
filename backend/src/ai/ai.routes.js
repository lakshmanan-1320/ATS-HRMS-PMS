/**
 * ai.routes.js
 * AI Chat & Infrastructure Health endpoints.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const { chat, health } = require('./ai.controller');

// Chat endpoint (auth-protected)
router.post('/chat', requireAuth, chat);

// AI Health Check endpoint
router.get('/health', health);

module.exports = router;