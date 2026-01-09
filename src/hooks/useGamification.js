import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { GAMIFICATION_CONFIG, ACHIEVEMENTS } from '../utils/constants';

/**
 * Get today's date as YYYY-MM-DD string
 */
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Check if a date string is today
 */
const isToday = (dateString) => {
  return dateString === getTodayString();
};

/**
 * Check if a date string is yesterday
 */
const isYesterday = (dateString) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateString === yesterday.toISOString().split('T')[0];
};

/**
 * Calculate user level from total XP
 */
const calculateLevel = (totalXP) => {
  const levels = GAMIFICATION_CONFIG.LEVELS;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXP >= levels[i].xpRequired) {
      const currentLevel = levels[i];
      const nextLevel = levels[i + 1];
      const xpForNext = nextLevel ? nextLevel.xpRequired - currentLevel.xpRequired : 0;
      const xpProgress = totalXP - currentLevel.xpRequired;
      return {
        ...currentLevel,
        xpForNextLevel: xpForNext,
        xpProgress: xpProgress,
        progressPercent: xpForNext > 0 ? Math.min(100, (xpProgress / xpForNext) * 100) : 100
      };
    }
  }
  return { ...levels[0], xpForNextLevel: levels[1].xpRequired, xpProgress: totalXP, progressPercent: 0 };
};

/**
 * Default gamification state
 */
const DEFAULT_GAMIFICATION_STATE = {
  dailyGoal: GAMIFICATION_CONFIG.DAILY_GOALS.DEFAULT,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  totalXP: 0,
  todayXP: 0,
  todayCards: 0,
  totalReviews: 0,
  achievements: [],
  easyStreak: 0,
  dailyGoalStreak: 0,
  cardsCreated: 0,
  // Session tracking
  sessionStart: null,
  sessionCards: 0,
  sessionXP: 0,
  sessionCorrect: 0,
  sessionIncorrect: 0,
  // Activity history (last 365 days)
  activityHistory: {}
};

/**
 * Custom hook for managing gamification state
 * @param {Object} firebaseApp - Initialized Firebase app instance
 * @param {string} userId - Current user ID
 * @returns {Object} Gamification state and methods
 */
export const useGamification = (firebaseApp, userId) => {
  const [db, setDb] = useState(null);
  const [gamificationState, setGamificationState] = useState(DEFAULT_GAMIFICATION_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newAchievements, setNewAchievements] = useState([]);

  // Initialize Firestore when Firebase app is ready
  useEffect(() => {
    if (!firebaseApp) return;
    const dbInstance = getFirestore(firebaseApp);
    setDb(dbInstance);
  }, [firebaseApp]);

  // Load gamification data when user and db are ready
  useEffect(() => {
    if (!db || !userId) {
      setIsLoading(false);
      return;
    }

    const loadGamificationData = async () => {
      setIsLoading(true);
      try {
        // Try localStorage first for immediate display
        const localData = localStorage.getItem(`gamification_${userId}`);
        if (localData) {
          const parsed = JSON.parse(localData);
          // Check if we need to reset daily stats
          if (parsed.lastActiveDate && !isToday(parsed.lastActiveDate)) {
            parsed.todayXP = 0;
            parsed.todayCards = 0;
            // Check streak
            if (!isYesterday(parsed.lastActiveDate)) {
              parsed.currentStreak = 0;
            }
          }
          setGamificationState(prev => ({ ...prev, ...parsed }));
        }

        // Then load from Firestore
        const gamificationRef = doc(db, 'userGamification', userId);
        const gamificationDoc = await getDoc(gamificationRef);

        if (gamificationDoc.exists()) {
          const data = gamificationDoc.data();
          const lastActiveDate = data.lastActiveDate?.toDate?.()?.toISOString().split('T')[0] || data.lastActiveDate;

          let updatedData = {
            ...DEFAULT_GAMIFICATION_STATE,
            ...data,
            lastActiveDate,
            activityHistory: data.activityHistory || {}
          };

          // Reset daily stats if not today
          if (lastActiveDate && !isToday(lastActiveDate)) {
            updatedData.todayXP = 0;
            updatedData.todayCards = 0;
            // Reset streak if not yesterday
            if (!isYesterday(lastActiveDate)) {
              updatedData.currentStreak = 0;
            }
          }

          setGamificationState(updatedData);
          localStorage.setItem(`gamification_${userId}`, JSON.stringify(updatedData));
        } else {
          // Create default document for new user
          await saveGamificationData(DEFAULT_GAMIFICATION_STATE);
        }
      } catch (error) {
        console.error('Error loading gamification data:', error);
        setError('Failed to load gamification data');
      } finally {
        setIsLoading(false);
      }
    };

    loadGamificationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, userId]);

  // Start session on mount
  useEffect(() => {
    if (!gamificationState.sessionStart) {
      setGamificationState(prev => ({
        ...prev,
        sessionStart: new Date().toISOString(),
        sessionCards: 0,
        sessionXP: 0,
        sessionCorrect: 0,
        sessionIncorrect: 0
      }));
    }
  }, [gamificationState.sessionStart]);

  /**
   * Save gamification data to Firestore and localStorage
   */
  const saveGamificationData = useCallback(async (data) => {
    if (!db || !userId) return;

    const dataToSave = {
      ...data,
      lastUpdated: serverTimestamp()
    };

    try {
      const gamificationRef = doc(db, 'userGamification', userId);
      await setDoc(gamificationRef, dataToSave, { merge: true });
      localStorage.setItem(`gamification_${userId}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving gamification data:', error);
      // Still save to localStorage as backup
      localStorage.setItem(`gamification_${userId}`, JSON.stringify(data));
    }
  }, [db, userId]);

  /**
   * Check and unlock achievements
   */
  const checkAchievements = useCallback((state) => {
    const unlockedIds = state.achievements || [];
    const newlyUnlocked = [];

    Object.values(ACHIEVEMENTS).forEach(achievement => {
      if (unlockedIds.includes(achievement.id)) return;

      let unlocked = false;
      const { type, value } = achievement.condition;

      switch (type) {
        case 'totalReviews':
          unlocked = state.totalReviews >= value;
          break;
        case 'streak':
          unlocked = state.currentStreak >= value;
          break;
        case 'dailyGoalComplete':
          unlocked = state.todayCards >= state.dailyGoal;
          break;
        case 'dailyGoalStreak':
          unlocked = state.dailyGoalStreak >= value;
          break;
        case 'dailyGoalMultiplier':
          unlocked = state.todayCards >= state.dailyGoal * value;
          break;
        case 'easyStreak':
          unlocked = state.easyStreak >= value;
          break;
        case 'totalXP':
          unlocked = state.totalXP >= value;
          break;
        case 'cardsCreated':
          unlocked = state.cardsCreated >= value;
          break;
        case 'studyTime':
          const hour = new Date().getHours();
          if (value === 'early') unlocked = hour < 7;
          if (value === 'night') unlocked = hour >= 22;
          break;
        default:
          break;
      }

      if (unlocked) {
        newlyUnlocked.push(achievement);
      }
    });

    return newlyUnlocked;
  }, []);

  /**
   * Record a card review and update stats
   * @param {string} rating - 'again', 'hard', 'good', or 'easy'
   * @returns {Object} { xpEarned, newAchievements, streakBonus }
   */
  const recordReview = useCallback(async (rating) => {
    const xpAmounts = GAMIFICATION_CONFIG.XP_AMOUNTS;
    const xpEarned = xpAmounts[rating.toUpperCase()] || 0;
    const today = getTodayString();
    const isCorrect = rating === 'good' || rating === 'easy';

    setGamificationState(prev => {
      const wasNewDay = prev.lastActiveDate !== today;
      let newStreak = prev.currentStreak;
      let streakBonus = 0;
      let newDailyGoalStreak = prev.dailyGoalStreak;

      // Handle streak logic
      if (wasNewDay) {
        if (isYesterday(prev.lastActiveDate) || !prev.lastActiveDate) {
          newStreak = prev.currentStreak + 1;
          // Check for streak bonuses
          Object.values(GAMIFICATION_CONFIG.STREAK_BONUSES).forEach(bonus => {
            if (newStreak === bonus.days) {
              streakBonus = bonus.xpBonus;
            }
          });
        } else {
          newStreak = 1;
          newDailyGoalStreak = 0;
        }
      }

      // Handle easy streak
      let newEasyStreak = prev.easyStreak;
      if (rating === 'easy') {
        newEasyStreak = prev.easyStreak + 1;
      } else {
        newEasyStreak = 0;
      }

      const newTodayCards = wasNewDay ? 1 : prev.todayCards + 1;
      const newTodayXP = wasNewDay ? xpEarned + streakBonus : prev.todayXP + xpEarned + streakBonus;

      // Check if daily goal was just completed
      const dailyGoalJustCompleted = newTodayCards === prev.dailyGoal && prev.todayCards < prev.dailyGoal;
      if (dailyGoalJustCompleted) {
        newDailyGoalStreak = prev.dailyGoalStreak + 1;
      }

      // Update activity history
      const newActivityHistory = { ...prev.activityHistory };
      newActivityHistory[today] = (newActivityHistory[today] || 0) + 1;

      const newState = {
        ...prev,
        totalXP: prev.totalXP + xpEarned + streakBonus,
        todayXP: newTodayXP,
        todayCards: newTodayCards,
        totalReviews: prev.totalReviews + 1,
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        lastActiveDate: today,
        easyStreak: newEasyStreak,
        dailyGoalStreak: newDailyGoalStreak,
        sessionCards: prev.sessionCards + 1,
        sessionXP: prev.sessionXP + xpEarned + streakBonus,
        sessionCorrect: prev.sessionCorrect + (isCorrect ? 1 : 0),
        sessionIncorrect: prev.sessionIncorrect + (isCorrect ? 0 : 1),
        activityHistory: newActivityHistory
      };

      // Check for new achievements
      const unlocked = checkAchievements(newState);
      if (unlocked.length > 0) {
        newState.achievements = [...(newState.achievements || []), ...unlocked.map(a => a.id)];
        setNewAchievements(unlocked);
      }

      // Save to Firestore (async, don't await)
      saveGamificationData(newState);

      return newState;
    });

    return { xpEarned };
  }, [checkAchievements, saveGamificationData]);

  /**
   * Record a card creation
   */
  const recordCardCreated = useCallback(async () => {
    setGamificationState(prev => {
      const newState = {
        ...prev,
        cardsCreated: prev.cardsCreated + 1
      };

      // Check for new achievements
      const unlocked = checkAchievements(newState);
      if (unlocked.length > 0) {
        newState.achievements = [...(newState.achievements || []), ...unlocked.map(a => a.id)];
        setNewAchievements(unlocked);
      }

      saveGamificationData(newState);
      return newState;
    });
  }, [checkAchievements, saveGamificationData]);

  /**
   * Update daily goal
   */
  const updateDailyGoal = useCallback(async (newGoal) => {
    const clampedGoal = Math.max(
      GAMIFICATION_CONFIG.DAILY_GOALS.MIN,
      Math.min(GAMIFICATION_CONFIG.DAILY_GOALS.MAX, newGoal)
    );

    setGamificationState(prev => {
      const newState = { ...prev, dailyGoal: clampedGoal };
      saveGamificationData(newState);
      return newState;
    });
  }, [saveGamificationData]);

  /**
   * Get session summary data
   */
  const getSessionSummary = useCallback(() => {
    const { sessionStart, sessionCards, sessionXP, sessionCorrect, sessionIncorrect } = gamificationState;
    const totalAnswers = sessionCorrect + sessionIncorrect;
    const accuracy = totalAnswers > 0 ? Math.round((sessionCorrect / totalAnswers) * 100) : 0;

    let duration = 0;
    if (sessionStart) {
      duration = Math.round((Date.now() - new Date(sessionStart).getTime()) / 60000); // minutes
    }

    return {
      cardsReviewed: sessionCards,
      xpEarned: sessionXP,
      accuracy,
      duration,
      correct: sessionCorrect,
      incorrect: sessionIncorrect
    };
  }, [gamificationState]);

  /**
   * Reset session stats (call when user explicitly ends session)
   */
  const resetSession = useCallback(() => {
    setGamificationState(prev => ({
      ...prev,
      sessionStart: new Date().toISOString(),
      sessionCards: 0,
      sessionXP: 0,
      sessionCorrect: 0,
      sessionIncorrect: 0
    }));
  }, []);

  /**
   * Clear new achievements after displaying
   */
  const clearNewAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  /**
   * Get current level info
   */
  const levelInfo = calculateLevel(gamificationState.totalXP);

  /**
   * Calculate daily goal progress
   */
  const dailyProgress = {
    current: gamificationState.todayCards,
    goal: gamificationState.dailyGoal,
    percent: Math.min(100, (gamificationState.todayCards / gamificationState.dailyGoal) * 100),
    isComplete: gamificationState.todayCards >= gamificationState.dailyGoal
  };

  return {
    // State
    ...gamificationState,
    levelInfo,
    dailyProgress,
    isLoading,
    error,
    newAchievements,

    // Actions
    recordReview,
    recordCardCreated,
    updateDailyGoal,
    getSessionSummary,
    resetSession,
    clearNewAchievements,

    // Computed
    allAchievements: ACHIEVEMENTS
  };
};
