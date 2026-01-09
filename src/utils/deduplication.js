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
