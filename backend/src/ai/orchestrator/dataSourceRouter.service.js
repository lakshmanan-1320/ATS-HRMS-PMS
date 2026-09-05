/**
 * dataSourceRouter.service.js
 *
 * Routes data requests to the data layer (live SQL via hrmsDataRetriever)
 * and/or the RAG layer (vector search via policyRetriever).
 * Runs parallel fetches for hybrid queries.
 */

'use strict';

const { fetchHrmsData } = require('../data/hrmsDataRetriever.service');
const { retrievePolicies } = require('../rag/policyRetriever.service');
const logger = require('../../config/logger');

/**
 * Executes the data retrieval stage according to the execution plan.
 *
 * @param {object} plan - Execution plan from queryPlanner
 * @param {object} params - Request parameters { context, intentResult, message, category, perf }
 * @returns {Promise<{ liveData: object|null, policyChunks: Array<object> }>}
 */
async function routeAndFetch(plan, params) {
  const { context, intentResult, message, category, perf = {} } = params;
  const { organizationId } = context;

  let liveData = null;
  let policyChunks = [];

  const dbTask = plan.useDb
    ? (async () => {
        const tDb = performance.now();
        try {
          liveData = await fetchHrmsData(intentResult, context);
        } catch (err) {
          logger.error('[DataSourceRouter] DB retrieval error:', err.message);
          liveData = { error: err.message };
        } finally {
          perf.dbMs = Math.round(performance.now() - tDb);
        }
      })()
    : null;

  const ragTask = plan.useRag
    ? (async () => {
        const tRag = performance.now();
        try {
          const cat = intentResult.policyCategory || category || null;
          policyChunks = await retrievePolicies(organizationId, message, 3, {
            category: cat,
            topic: intentResult.policyTopic || intentResult.domain || null,
            perf,
          });
        } catch (err) {
          logger.error('[DataSourceRouter] Policy RAG error:', err.message);
          policyChunks = [];
        } finally {
          perf.ragMs = Math.round(performance.now() - tRag);
        }
      })()
    : null;

  // Execute tasks in parallel where both DB and RAG are required (Hybrid mode)
  await Promise.all([dbTask, ragTask].filter(Boolean));

  return {
    liveData,
    policyChunks: policyChunks || [],
  };
}

module.exports = {
  routeAndFetch,
};
