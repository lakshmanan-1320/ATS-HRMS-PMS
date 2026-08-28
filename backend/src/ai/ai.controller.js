/**
 * ai.controller.js
 * Express controller for AI Chat & AI Infrastructure Health Check.
 */

'use strict';

const aiService = require('./ai.service');
const ollamaService = require('./llm/ollama.service');
const { query } = require('../config/db');
const logger = require('../config/logger');

/**
 * POST /api/ai/chat
 */
async function chat(req, res) {
  try {
    const result = await aiService.chat(req.body, req.user);
    return res.json(result);
  } catch (error) {
    logger.error('[AIController] Chat error:', error.message);
    return res.status(500).json({
      success: false,
      code: 'AI_CHAT_ERROR',
      message: error.message || 'The HR assistant is temporarily unavailable. Please try again shortly.',
    });
  }
}

/**
 * GET /api/ai/health
 * Reports statuses of Ollama, Models, PostgreSQL, and pgvector extension.
 */
async function health(req, res) {
  try {
    // 1. Check Database & pgvector extension
    let dbOk = false;
    let pgvectorOk = false;
    let pgvectorVersion = null;

    try {
      const dbRes = await query('SELECT 1 as alive');
      dbOk = dbRes.rows[0]?.alive === 1;

      const vecRes = await query(
        `SELECT installed_version FROM pg_available_extensions WHERE name = 'vector' AND installed_version IS NOT NULL`
      );
      if (vecRes.rows.length > 0) {
        pgvectorOk = true;
        pgvectorVersion = vecRes.rows[0].installed_version;
      }
    } catch (dbErr) {
      logger.error('[AIController:Health] DB health check error:', dbErr.message);
    }

    // 2. Check Ollama & Models
    const ollamaHealth = await ollamaService.checkHealth();

    const isHealthy = dbOk && pgvectorOk && ollamaHealth.ollama;

    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      database: dbOk,
      pgvector: pgvectorOk,
      pgvectorVersion,
      ollama: ollamaHealth.ollama,
      chatModel: ollamaHealth.chatModel || 'gemma3:4b',
      chatModelAvailable: ollamaHealth.chatModelAvailable || false,
      embeddingModel: ollamaHealth.embeddingModel || 'nomic-embed-text',
      embeddingModelAvailable: ollamaHealth.embeddingModelAvailable || false,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('[AIController:Health] Health check error:', err.message);
    return res.status(500).json({
      status: 'error',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = {
  chat,
  health,
};
