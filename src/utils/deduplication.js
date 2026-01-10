/**
 * Utility functions for finding and removing duplicate flashcards
 */

/**
 * Strip HTML tags and normalize text for comparison
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
    .replace(/&nbsp;/g, ' ')    // Replace &nbsp;
    .replace(/&amp;/g, '&')     // Replace &amp;
    .replace(/&lt;/g, '<')      // Replace &lt;
    .replace(/&gt;/g, '>')      // Replace &gt;
    .replace(/\s+/g, ' ')       // Normalize whitespace
    .toLowerCase()
    .trim();
};

/**
 * Calculate Jaccard similarity between two strings (word-based)
 * Returns a value between 0 and 1
 */
export const calculateJaccardSimilarity = (str1, str2) => {
  const words1 = new Set(normalizeText(str1).split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(normalizeText(str2).split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
};

/**
 * Calculate Levenshtein distance-based similarity
 * Returns a value between 0 and 1
 */
export const calculateLevenshteinSimilarity = (str1, str2) => {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // For very long strings, use sampling to avoid performance issues
  const maxLen = 500;
  const a = s1.length > maxLen ? s1.substring(0, maxLen) : s1;
  const b = s2.length > maxLen ? s2.substring(0, maxLen) : s2;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLength = Math.max(a.length, b.length);
  return 1 - (matrix[b.length][a.length] / maxLength);
};

/**
 * Calculate combined similarity score between two cards
 * Uses both question and answer similarity
 */
export const calculateCardSimilarity = (card1, card2) => {
  const questionJaccard = calculateJaccardSimilarity(card1.question, card2.question);
  const answerJaccard = calculateJaccardSimilarity(card1.answer, card2.answer);

  // Weight question similarity higher (70%) than answer (30%)
  const jaccardScore = (questionJaccard * 0.7) + (answerJaccard * 0.3);

  // Also check for very similar questions using Levenshtein
  const questionLevenshtein = calculateLevenshteinSimilarity(card1.question, card2.question);

  // Return the higher of the two methods
  return Math.max(jaccardScore, questionLevenshtein);
};

/**
 * Yield control to the browser to prevent UI freezing
 */
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Find all duplicate groups in a set of flashcards (async with chunked processing)
 * @param {Array} flashcards - Array of flashcard objects
 * @param {number} threshold - Similarity threshold (0-1), default 0.7
 * @param {Function} onProgress - Optional callback for progress updates (0-1)
 * @returns {Promise<Array>} Array of duplicate groups, each group is an array of card IDs
 */
export const findDuplicateGroups = async (flashcards, threshold = 0.7, onProgress = null) => {
  const duplicateGroups = [];
  const processed = new Set();
  const totalCards = flashcards.length;
  const CHUNK_SIZE = 50; // Process 50 comparisons before yielding
  let comparisonCount = 0;

  for (let i = 0; i < flashcards.length; i++) {
    if (processed.has(flashcards[i].id)) continue;

    const group = [flashcards[i]];
    processed.add(flashcards[i].id);

    for (let j = i + 1; j < flashcards.length; j++) {
      if (processed.has(flashcards[j].id)) continue;

      const similarity = calculateCardSimilarity(flashcards[i], flashcards[j]);

      if (similarity >= threshold) {
        group.push(flashcards[j]);
        processed.add(flashcards[j].id);
      }

      comparisonCount++;

      // Yield to main thread periodically to prevent UI freezing
      if (comparisonCount % CHUNK_SIZE === 0) {
        await yieldToMain();
        if (onProgress) {
          onProgress(i / totalCards);
        }
      }
    }

    if (group.length > 1) {
      duplicateGroups.push(group);
    }
  }

  if (onProgress) {
    onProgress(1);
  }

  return duplicateGroups;
};

/**
 * Select the best card from a group of duplicates
 * Prefers cards with: more content, better formatting, more recent updates
 */
export const selectBestCard = (cards) => {
  return cards.reduce((best, current) => {
    const bestScore = scoreCard(best);
    const currentScore = scoreCard(current);
    return currentScore > bestScore ? current : best;
  });
};

/**
 * Score a card based on quality metrics
 */
const scoreCard = (card) => {
  let score = 0;

  // More content is better
  const questionLength = normalizeText(card.question).length;
  const answerLength = normalizeText(card.answer).length;
  score += Math.min(questionLength / 100, 3); // Cap at 3 points
  score += Math.min(answerLength / 200, 3);   // Cap at 3 points

  // Has category
  if (card.category && card.category !== 'Uncategorized') score += 1;

  // Has sub-category
  if (card.sub_category) score += 0.5;

  // Has been reviewed (has FSRS data)
  if (card.stability) score += 1;
  if (card.difficulty) score += 0.5;

  // More recent is slightly better
  if (card.updatedAt) {
    const age = Date.now() - (card.updatedAt.toDate ? card.updatedAt.toDate() : new Date(card.updatedAt));
    const daysOld = age / (1000 * 60 * 60 * 24);
    score += Math.max(0, 1 - (daysOld / 365)); // Up to 1 point for recent cards
  }

  return score;
};

/**
 * Process duplicates and return cards to keep and cards to delete (async)
 * @param {Array} flashcards - All flashcards
 * @param {number} threshold - Similarity threshold
 * @param {Function} onProgress - Optional callback for progress updates (0-1)
 * @returns {Promise<Object>} { toKeep: [], toDelete: [], groups: [] }
 */
export const processDuplicates = async (flashcards, threshold = 0.7, onProgress = null) => {
  const duplicateGroups = await findDuplicateGroups(flashcards, threshold, onProgress);

  const toDelete = [];
  const toKeep = [];

  duplicateGroups.forEach(group => {
    const best = selectBestCard(group);
    toKeep.push(best);

    group.forEach(card => {
      if (card.id !== best.id) {
        toDelete.push(card);
      }
    });
  });

  return {
    toKeep,
    toDelete,
    groups: duplicateGroups
  };
};

/**
 * Group cards by similarity into suggested categories
 * @param {Array} flashcards - All flashcards
 * @returns {Object} Map of suggested category -> cards
 */
export const suggestCategoryGroupings = (flashcards) => {
  // Group by existing categories first
  const existingGroups = {};

  flashcards.forEach(card => {
    const category = card.category || 'Uncategorized';
    if (!existingGroups[category]) {
      existingGroups[category] = [];
    }
    existingGroups[category].push(card);
  });

  return existingGroups;
};

/**
 * Extract key subject terms from text
 * Focuses on nouns and technical terms that identify the concept
 */
const extractSubjectTerms = (text) => {
  const normalized = normalizeText(text);

  // Very broad stop words - common verbs, prepositions, articles, pronouns
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on',
    'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
    'after', 'between', 'under', 'again', 'then', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'more', 'most', 'other', 'some',
    'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
    'but', 'if', 'or', 'because', 'what', 'which', 'who', 'this', 'that',
    'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us',
    'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'me', 'my',
    'about', 'also', 'any', 'both', 'get', 'got', 'like', 'make', 'made',
    'use', 'using', 'used', 'one', 'two', 'first', 'second', 'example',
    'define', 'explain', 'describe', 'list', 'name', 'identify', 'compare',
    'difference', 'mean', 'means', 'called', 'known', 'refers', 'refer'
  ]);

  const words = normalized.split(/\s+/);
  const terms = new Set();

  words.forEach(word => {
    const clean = word.replace(/[^a-z0-9]/g, '');
    if (clean.length >= 3 && !stopWords.has(clean)) {
      terms.add(clean);
    }
  });

  return terms;
};

/**
 * Calculate concept-based similarity between two cards
 * Cards test the same concept if they share the main subject term
 */
export const calculateConceptSimilarity = (card1, card2) => {
  // Get subject terms from questions
  const qTerms1 = extractSubjectTerms(card1.question);
  const qTerms2 = extractSubjectTerms(card2.question);

  // Get subject terms from answers
  const aTerms1 = extractSubjectTerms(card1.answer);
  const aTerms2 = extractSubjectTerms(card2.answer);

  // Combine question and answer terms for full concept representation
  const allTerms1 = new Set([...qTerms1, ...aTerms1]);
  const allTerms2 = new Set([...qTerms2, ...aTerms2]);

  if (allTerms1.size === 0 || allTerms2.size === 0) return 0;

  // Calculate overlap
  const intersection = [...allTerms1].filter(x => allTerms2.has(x));
  const intersectionCount = intersection.length;

  if (intersectionCount === 0) return 0;

  // Use Jaccard similarity
  const union = new Set([...allTerms1, ...allTerms2]);
  const jaccardScore = intersectionCount / union.size;

  // Bonus: if question terms specifically overlap, it's more likely same concept
  const qIntersection = [...qTerms1].filter(x => qTerms2.has(x)).length;
  const questionBonus = qTerms1.size > 0 && qTerms2.size > 0
    ? (qIntersection / Math.min(qTerms1.size, qTerms2.size)) * 0.3
    : 0;

  return Math.min(1, jaccardScore + questionBonus);
};

/**
 * Find cards testing similar concepts (async with progress)
 * Uses concept extraction for semantic matching
 * @param {Array} flashcards - Array of flashcard objects
 * @param {number} threshold - Similarity threshold (0-1), default 0.25
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<Object>} { toKeep: [], toDelete: [], groups: [] }
 */
export const findSimilarConcepts = async (flashcards, threshold = 0.25, onProgress = null) => {
  const duplicateGroups = [];
  const processed = new Set();
  const totalCards = flashcards.length;

  // Update progress immediately
  if (onProgress) onProgress(0.01);
  await yieldToMain();

  for (let i = 0; i < flashcards.length; i++) {
    const card1 = flashcards[i];
    if (!card1 || !card1.id || processed.has(card1.id)) continue;

    const group = [{ card: card1, similarity: 1 }];
    processed.add(card1.id);

    for (let j = i + 1; j < flashcards.length; j++) {
      const card2 = flashcards[j];
      if (!card2 || !card2.id || processed.has(card2.id)) continue;

      try {
        // Use concept similarity only
        const similarity = calculateConceptSimilarity(card1, card2);

        if (similarity >= threshold) {
          group.push({ card: card2, similarity });
          processed.add(card2.id);
        }
      } catch (e) {
        // Skip cards that cause errors
        continue;
      }
    }

    if (group.length > 1) {
      group.sort((a, b) => b.similarity - a.similarity);
      duplicateGroups.push(group.map(g => ({ ...g.card, _similarity: g.similarity })));
    }

    // Update progress after each outer loop iteration
    if (onProgress) {
      onProgress((i + 1) / totalCards);
    }
    await yieldToMain();
  }

  if (onProgress) onProgress(1);

  // Process groups to determine which to keep/delete
  const toDelete = [];
  const toKeep = [];

  duplicateGroups.forEach(group => {
    const best = selectBestCard(group);
    toKeep.push(best);

    group.forEach(card => {
      if (card.id !== best.id) {
        toDelete.push(card);
      }
    });
  });

  return {
    toKeep,
    toDelete,
    groups: duplicateGroups
  };
};
