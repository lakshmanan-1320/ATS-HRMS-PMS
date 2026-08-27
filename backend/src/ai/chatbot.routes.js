const express = require('express');
const router = express.Router();
const chatbotController = require('./chatbot.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Chat endpoint protected by tenant session authentication
router.post('/ai-chat', requireAuth, chatbotController.handleChatQuery);

module.exports = {
  routes: router
};
