const aiService = require('./ai.service');

/**
 * Main entrypoint for policy questions
 * 
 * @param {string} organizationId - Tenant organization ID
 * @param {string} question - Employee question
 * @returns {Promise<object>} - AI Answer and source metadata
 */
async function getChatbotResponse(organizationId, question, category = ['IT & Data Security', 'Leave & Employee Conduct', 'Attendance & Working Hours', 'Benefits & Compensation', 'General']) {
  if (aiService && typeof aiService.chat === 'function') {
    try {
      const aiRes = await aiService.chat({ message: question, category }, { organizationId });
      if (aiRes && aiRes.answer) {
        return aiRes;
      }
    } catch (err) {
      console.warn('[ChatbotService] aiService.chat error, falling back to direct RAG engine:', err.message);
    }
  }

  const tTotalStart = performance.now();

  if (!organizationId) {
    throw new Error('Organization ID is required.');
  }
  if (!question || !question.trim()) {
    throw new Error('Question is required.');
  }

  // 1. Check if the query is a general conversational chat/greeting
  if (isGeneralChatQuery(question)) {
    const prompt = contextService.buildGeneralChatPrompt(question);
    const tGenerationStart = performance.now();
    const completionResult = await ollamaService.generateCompletion(prompt);
    const generationTimeMs = performance.now() - tGenerationStart;

    return {
      success: true,
      answer: (completionResult.response || '').trim(),
      sources: [],
      model: 'gemma3:4b',
      metrics: {
        totalTimeMs: Math.round(performance.now() - tTotalStart),
        generationTimeMs: Math.round(generationTimeMs),
        ollamaMeta: completionResult.metadata
      }
    };
  }

  // Normalize target categories array
  const targetCategories = Array.isArray(category) ? category : [category];

  let matchedChunks = [];
  const contextNotices = [];
  const perf = { embeddingTimeMs: 0, retrievalTimeMs: 0 };

  // Detect if the query is asking about multiple policy topics
  const topicQueries = getSubQueriesForTopics(question);

  if (topicQueries.length > 1) {
    // Multi-topic query splitting and parallel retrieval
    const results = await Promise.all(
      topicQueries.map(async (t) => {
        const tPerf = {};
        const chunks = await policyRetriever.retrievePolicies(
          organizationId,
          t.query,
          [t.category],
          2,
          tPerf
        );
        perf.embeddingTimeMs += tPerf.embeddingTimeMs || 0;
        perf.retrievalTimeMs += tPerf.retrievalTimeMs || 0;
        return { name: t.name, chunks };
      })
    );

    const seenKeys = new Set();
    for (const r of results) {
      const hasRelevant = r.chunks.length > 0 && r.chunks[0].similarity >= RELEVANCE_THRESHOLD;
      if (hasRelevant) {
        for (const chunk of r.chunks) {
          if (chunk.similarity >= RELEVANCE_THRESHOLD) {
            const key = `${chunk.policyKey}_${chunk.sectionRef}_${chunk.chunkText.substring(0, 50)}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              matchedChunks.push(chunk);
            }
          }
        }
      } else {
        contextNotices.push(`[Notice: No policy context found in the database for ${r.name} Policy. Please explicitly state that you cannot find information on ${r.name} Policy.]`);
      }
    }
    // Sort matched chunks by similarity descending
    matchedChunks.sort((a, b) => b.similarity - a.similarity);
  } else {
    // Single topic or default query with query expansion applied for better overview context
    const expandedQuery = expandPolicyQuery(question);
    const tPerf = {};
    matchedChunks = await policyRetriever.retrievePolicies(
      organizationId,
      expandedQuery,
      targetCategories,
      8,
      tPerf
    );
    perf.embeddingTimeMs = tPerf.embeddingTimeMs || 0;
    perf.retrievalTimeMs = tPerf.retrievalTimeMs || 0;
  }

  // 2. Validate relevance by inspecting the best similarity score (if we have chunks, or if we have notices)
  const hasRelevantChunks = matchedChunks.length > 0;

  if (!hasRelevantChunks && contextNotices.length === 0) {
    const prompt = contextService.buildNoContextPrompt(question);
    const tGenerationStart = performance.now();
    const completionResult = await ollamaService.generateCompletion(prompt);
    const generationTimeMs = performance.now() - tGenerationStart;

    return {
      success: true,
      answer: (completionResult.response || '').trim(),
      sources: [],
      model: 'gemma3:4b',
      metrics: {
        embeddingTimeMs: Math.round(perf.embeddingTimeMs || 0),
        retrievalTimeMs: Math.round(perf.retrievalTimeMs || 0),
        contextTimeMs: 0,
        generationTimeMs: Math.round(generationTimeMs),
        totalTimeMs: Math.round(performance.now() - tTotalStart),
        ollamaMeta: completionResult.metadata
      }
    };
  }

  // 3. Build grounded prompt context using custom notices
  const tContextStart = performance.now();
  const prompt = contextService.buildGroundedPromptWithNotices(question, matchedChunks, contextNotices);
  const contextTimeMs = performance.now() - tContextStart;

  // 4. Query Gemma 3 4B via Ollama
  const tGenerationStart = performance.now();
  const completionResult = await ollamaService.generateCompletion(prompt);
  const generationTimeMs = performance.now() - tGenerationStart;

  // 5. Clean up any prompt leakage, raw brackets, or verbose references from Gemma's generated response
  const rawCompletion = completionResult.response;
  const ollamaMeta = completionResult.metadata;
  
  let cleanedAnswer = (rawCompletion || '').trim()
    .replace(/\[POL-[A-Z]+-\d+\s*(?:\|\s*[^\]]*)?\]/gi, '') // remove LLM raw brackets
    .replace(/Please refer to POL-[A-Z]+-\d+,\s*Section\s*[\d.]+/gi, '') // remove redundant references
    .trim();

  // Ensure there's a period at the end of the text if it's missing, before adding citations
  if (cleanedAnswer && !/[.!?]$/.test(cleanedAnswer)) {
    cleanedAnswer += '.';
  }

  const isNegativeResponse = cleanedAnswer.includes('I cannot find this information') || 
                             cleanedAnswer.includes('cannot find this information');

  // Construct clean human-readable citations from matched chunks with similarity >= RELEVANCE_THRESHOLD
  const citationList = [];
  const seenCitations = new Set();

  if (!isNegativeResponse) {
    const normalizeForMatch = (str) => {
      return (str || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    for (const chunk of matchedChunks) {
      if (chunk.similarity >= RELEVANCE_THRESHOLD) {
        // Calculate keyword overlap for both user query and generated answer
        const queryOverlap = calculateKeywordOverlap(question, chunk.chunkText);
        const answerOverlap = calculateKeywordOverlap(cleanedAnswer, chunk.chunkText);
        
        const normTitle = normalizeForMatch(chunk.policyTitle);
        const normCategory = normalizeForMatch(chunk.category);
        const normAnswer = normalizeForMatch(cleanedAnswer);
        const normQuestion = normalizeForMatch(question);
        
        const isMentionedInAnswer = normAnswer.includes(normTitle) || normAnswer.includes(normCategory);
        const isMentionedInQuestion = normQuestion.includes(normTitle) || normQuestion.includes(normCategory);
        
        // Citations must match either the user question focus (>= 20%), the response details (>= 20%), or be explicitly mentioned
        if (queryOverlap >= 0.20 || answerOverlap >= 0.20 || isMentionedInAnswer || isMentionedInQuestion) {
          const refined = refineSectionCitation(chunk, question, cleanedAnswer);
          chunk.refinedSectionRef = refined.sectionRef;
          chunk.refinedSectionTitle = refined.sectionTitle;

          const citationKey = `${chunk.policyTitle || chunk.category || 'Policy'} · ${chunk.refinedSectionRef} — ${chunk.refinedSectionTitle}`;
          
          if (!seenCitations.has(citationKey)) {
            seenCitations.add(citationKey);
            citationList.push(`[${citationKey}]`);
          }
        }
      }
    }
  }

  if (citationList.length > 0) {
    cleanedAnswer = `${cleanedAnswer}\n\nFor more details, please refer to the relevant sections of the policy:\n${citationList.join('\n')}`;
  }

  const answer = cleanedAnswer;
  const totalTimeMs = performance.now() - tTotalStart;

  const metrics = {
    embeddingTimeMs: Math.round(perf.embeddingTimeMs || 0),
    retrievalTimeMs: Math.round(perf.retrievalTimeMs || 0),
    contextTimeMs: Math.round(contextTimeMs),
    generationTimeMs: Math.round(generationTimeMs),
    totalTimeMs: Math.round(totalTimeMs),
    ollamaMeta
  };

  const embeddingSec = ((perf.embeddingTimeMs || 0) / 1000).toFixed(1);
  const retrievalSec = ((perf.retrievalTimeMs || 0) / 1000).toFixed(1);
  const contextSec = (contextTimeMs / 1000).toFixed(1);
  const ollamaSec = (generationTimeMs / 1000).toFixed(1);
  const totalSec = (totalTimeMs / 1000).toFixed(1);
  const otherSec = Math.max(0, (totalTimeMs - ((perf.embeddingTimeMs || 0) + (perf.retrievalTimeMs || 0) + contextTimeMs + generationTimeMs)) / 1000).toFixed(1);

  // Log RAG Timing metrics in console
  console.log('============================================');
  console.log('[PROFILING BREAKDOWN]');
  console.log(`Embedding:           ${embeddingSec}s`);
  console.log(`pgvector search:      ${retrievalSec}s`);
  console.log(`Prompt construction:  ${contextSec}s`);
  console.log(`Ollama API:          ${ollamaSec}s`);
  console.log(`Other/backend:       ${otherSec}s`);
  console.log(`Total:               ${totalSec}s`);
  console.log('============================================');

  console.log('============================================');
  console.log('[OLLAMA RAW METRICS]');
  console.log(`- total_duration:        ${(ollamaMeta.total_duration / 1e9).toFixed(2)}s`);
  console.log(`- prompt_eval_duration:  ${(ollamaMeta.prompt_eval_duration / 1e9).toFixed(2)}s`);
  console.log(`- eval_duration:         ${(ollamaMeta.eval_duration / 1e9).toFixed(2)}s`);
  console.log(`- prompt_eval_count:     ${ollamaMeta.prompt_eval_count} tokens`);
  console.log(`- eval_count:            ${ollamaMeta.eval_count} tokens`);
  console.log('============================================');

  return {
    success: true,
    answer,
    sources: matchedChunks.map(chunk => ({
      policyId: chunk.policyId,
      policyKey: chunk.policyKey,
      policyTitle: chunk.policyTitle,
      section: chunk.refinedSectionRef || chunk.sectionRef,
      similarity: chunk.similarity,
      text: chunk.chunkText
    })),
  };
}

const POLICY_STOP_WORDS = new Set([
  'company', 'corporate', 'employee', 'employees', 'policy', 'policies',
  'rules', 'must', 'shall', 'authorized', 'resources', 'details', 'sections',
  'reference', 'refer', 'please', 'outlined', 'failure', 'comply',
  'constitutes', 'violation', 'violations', 'compliance', 'official',
  'administrator', 'assistance', 'contact', 'information', 'provide',
  'guidelines', 'conduct', 'system', 'access', 'accessing', 'business',
  'personal', 'using', 'usage'
]);

/**
 * Calculate content word overlap ratio between input query/answer and chunk text, excluding policy stop words.
 * @param {string} input - Search phrase or answer response
 * @param {string} chunkText - Document chunk content
 * @returns {number} - Overlap ratio (0 to 1)
 */
function calculateKeywordOverlap(input, chunkText) {
  if (!input || !chunkText) return 0;
  
  const extractWords = (text) => {
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    return new Set(words.filter(w => !POLICY_STOP_WORDS.has(w)));
  };
  
  const inputWords = extractWords(input);
  const chunkWords = extractWords(chunkText);
  
  if (inputWords.size === 0) return 0;
  
  let matchCount = 0;
  for (const word of inputWords) {
    if (chunkWords.has(word)) {
      matchCount++;
    }
  }
  
  return matchCount / inputWords.size;
}

/**
 * Extract clean section title heading from the raw chunk text block.
 * @param {string} sectionRef - E.g. "Section 4.2"
 * @param {string} chunkText - Document chunk content
 * @returns {string} - Clean heading title
 */
function parseSectionTitle(sectionRef, chunkText) {
  if (!sectionRef || !chunkText) return sectionRef;
  
  const numMatch = sectionRef.match(/[\d.]+/);
  const sectionNum = numMatch ? numMatch[0] : '';
  
  if (!sectionNum) return sectionRef;
  
  const lines = chunkText.split('\n');
  let matchedLine = '';
  for (const line of lines) {
    if (line.includes(sectionNum)) {
      matchedLine = line.trim();
      break;
    }
  }
  
  if (!matchedLine) return sectionRef;
  
  let title = matchedLine
    .replace(/^section\s+\d+[:\-]?/i, '')
    .replace(/^[\d.]+\s*/, '')
    .replace(/^:\s*/, '')
    .replace(/:\s*$/, '')
    .replace(/^-\s*/, '')
    .trim();
    
  if (title && title === title.toUpperCase()) {
    title = title
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  
  return title || sectionRef;
}

/**
 * Refines general section references to specific sub-bullet numbers (e.g. Section 5.2)
 * based on keyword content overlap.
 * @param {object} chunk - Matched document chunk
 * @param {string} question - Raw user question
 * @param {string} cleanedAnswer - Cleaned LLM answer
 * @returns {object} - { sectionRef, sectionTitle }
 */
function refineSectionCitation(chunk, question, cleanedAnswer) {
  let sectionRef = chunk.sectionRef;
  let sectionTitle = parseSectionTitle(chunk.sectionRef, chunk.chunkText);

  if (sectionRef.toLowerCase() === 'general') {
    return { sectionRef, sectionTitle };
  }

  const lines = chunk.chunkText.split('\n');
  const subBulletRegex = /(?:•\s+)?(\d+\.\d+)\s+([^:\n]+)/i;
  
  let bestSubBullet = null;
  let highestOverlap = 0;

  for (const line of lines) {
    const match = line.match(subBulletRegex);
    if (match) {
      const num = match[1];
      const title = match[2].replace(/:$/, '').trim();
      
      const bulletContent = line;
      const overlapQ = calculateKeywordOverlap(question, bulletContent + ' ' + title);
      const overlapA = calculateKeywordOverlap(cleanedAnswer, bulletContent + ' ' + title);
      const maxOverlap = Math.max(overlapQ, overlapA);
      
      if (maxOverlap > highestOverlap && maxOverlap >= 0.15) {
        highestOverlap = maxOverlap;
        bestSubBullet = { num, title };
      }
    }
  }

  if (bestSubBullet) {
    sectionRef = `Section ${bestSubBullet.num}`;
    sectionTitle = bestSubBullet.title;
  }

  return { sectionRef, sectionTitle };
}

const GENERAL_CHAT_KEYWORDS = [
  'hi', 'hello', 'hey', 'gday', 'good morning', 'good afternoon', 'good evening',
  'howdy', 'hola', 'yo', 'thanks', 'thank you', 'thankyou', 'appreciate it',
  'who are you', 'what is your name', 'who is this', 'what are you', 'tell me about yourself',
  'help', 'what can you do', 'how can you help me', 'capabilities', 'who created you'
];

/**
 * Classifies if a question is casual greeting/chat rather than policy-grounded.
 * @param {string} question - Raw user question
 * @returns {boolean} - True if casual conversation
 */
function isGeneralChatQuery(question) {
  const cleaned = question.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  
  if (GENERAL_CHAT_KEYWORDS.includes(cleaned)) {
    return true;
  }
  
  // Match casual greetings with short word length
  if (/^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening)\b/i.test(cleaned)) {
    if (cleaned.split(/\s+/).length <= 3) {
      return true;
    }
  }
  
  // Match capability, scope, identity, and assistance queries
  if (/\b(can\s+i\s+ask|what\s+can\s+i|what\s+should\s+i|how\s+to\s+use|what\s+do\s+you\s+do|what\s+is\s+your\s+purpose|which\s+policies|what\s+policies|how\s+can\s+you\s+help|what\s+are\s+you|who\s+are\s+you|what\s+is\s+your\s+name|who\s+is\s+this|tell\s+me\s+about\s+yourself)\b/i.test(cleaned)) {
    return true;
  }
  
  return false;
}

/**
 * Expands generic policy overview questions with descriptive keywords to pull introductory/scope sections.
 * @param {string} question - Raw user question
 * @returns {string} - Expanded question string
 */
function expandPolicyQuery(question) {
  const cleaned = question.toLowerCase();
  
  // Match general explanation/overview requests
  const isOverviewRequest = /\b(what\s+is|explain|tell\s+me\s+about|overview|summary|introduce|about|purpose|what\s+does\s+.*cover)\b/i.test(cleaned);
  
  if (!isOverviewRequest) {
    return question;
  }
  
  let expanded = question;
  
  if (/\b(it|data|security|privacy|confidentiality|system|computer|laptop|network|vpn|wi-fi|wifi)\b/i.test(cleaned)) {
    expanded += " IT Data Security Policy purpose scope overview introduction what does data security policy cover";
  }
  if (/\b(code\s+of\s+conduct|ethics|harassment|posh|discrimination|conflict|moonlighting)\b/i.test(cleaned)) {
    expanded += " Code of Conduct Policy purpose scope ethics overview introduction guidelines expected behavior";
  }
  if (/\b(attendance|leave|sick|casual|earned|vacation|hours|shifts|punctuality)\b/i.test(cleaned)) {
    expanded += " Attendance and Leave Policy purpose scope working hours overview introduction guidelines leave categories";
  }
  if (/\b(bonus|incentive|discretionary|compensation)\b/i.test(cleaned)) {
    expanded += " Bonus and Incentive Policy purpose scope eligibility conditions overview introduction";
  }
  
  return expanded;
}

/**
 * Splits a multi-topic question into sub-queries targeted at specific policy categories.
 * @param {string} question - Raw user question
 * @returns {Array<object>} - Matched sub-query configurations
 */
function getSubQueriesForTopics(question) {
  const cleaned = question.toLowerCase();
  const topics = [];
  
  if (/\b(code\s+of\s+conduct|ethics|conduct)\b/i.test(cleaned)) {
    topics.push({
      name: 'Code of Conduct',
      category: 'Leave & Employee Conduct',
      query: 'What is Employee Code of Conduct & Workplace Ethics Policy purpose scope overview introduction expected behavior'
    });
  }
  if (/\b(data\s+security|it\s+policy|security\s+policy|acceptable\s+use)\b/i.test(cleaned)) {
    topics.push({
      name: 'Data Security',
      category: 'IT & Data Security',
      query: 'What is IT, Data Security & Acceptable Use Policy purpose scope overview introduction guidelines'
    });
  }
  if (/\b(attendance|leave|working\s+hours|shifts)\b/i.test(cleaned)) {
    topics.push({
      name: 'Attendance & Leave',
      category: 'Attendance & Working Hours',
      query: 'What is Employee Attendance, Working Hours & Leave Policy purpose scope overview introduction categories'
    });
  }
  if (/\b(bonus|incentive)\b/i.test(cleaned)) {
    topics.push({
      name: 'Bonus',
      category: 'Benefits & Compensation',
      query: 'What is Employee Bonus & Incentive Policy purpose scope eligibility conditions overview introduction'
    });
  }
  
  return topics;
}

module.exports = {
  getChatbotResponse,
  RELEVANCE_THRESHOLD,
  expandPolicyQuery,
  getSubQueriesForTopics
};
