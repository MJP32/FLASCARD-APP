import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { STORAGE_KEYS, THEMES } from '../utils/constants';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock classList methods using spyOn
let addSpy, removeSpy;

describe('useSettings', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();

    // Reset store and mock
    localStorageMock.getItem.mockImplementation((key) => null);

    // Spy on classList methods
    addSpy = jest.spyOn(document.documentElement.classList, 'add');
    removeSpy = jest.spyOn(document.documentElement.classList, 'remove');
    jest.spyOn(document.body.classList, 'add');
    jest.spyOn(document.body.classList, 'remove');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up any classes that may have been added
    document.documentElement.classList.remove('dark', 'high-contrast');
    document.body.classList.remove('dark', 'high-contrast');
  });

  describe('dark mode', () => {
    it('should initialize with dark mode from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.THEME) return THEMES.DARK;
        return null;
      });

      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.isDarkMode).toBe(true);
    });

    it('should initialize with light mode when localStorage is empty', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.isDarkMode).toBe(false);
    });

    it('should toggle dark mode and update localStorage', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.isDarkMode).toBe(false);

      act(() => {
        result.current.toggleDarkMode();
      });

      expect(result.current.isDarkMode).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEYS.THEME, THEMES.DARK);
    });

    it('should toggle dark mode back to light', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.THEME) return THEMES.DARK;
        return null;
      });

      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.isDarkMode).toBe(true);

      act(() => {
        result.current.toggleDarkMode();
      });

      expect(result.current.isDarkMode).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEYS.THEME, THEMES.LIGHT);
    });
  });

  describe('high contrast mode', () => {
    it('should initialize high contrast from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'highContrastMode') return 'true';
        return null;
      });

      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.isHighContrast).toBe(true);
    });

    it('should initialize with high contrast off when localStorage is empty', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.isHighContrast).toBe(false);
    });

    it('should toggle high contrast mode', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.isHighContrast).toBe(false);

      act(() => {
        result.current.toggleHighContrast();
      });

      expect(result.current.isHighContrast).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('highContrastMode', 'true');
    });

    it('should toggle high contrast mode off', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'highContrastMode') return 'true';
        return null;
      });

      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.isHighContrast).toBe(true);

      act(() => {
        result.current.toggleHighContrast();
      });

      expect(result.current.isHighContrast).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('highContrastMode', 'false');
    });
  });

  describe('FSRS parameters', () => {
    it('should initialize with default FSRS parameters', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.fsrsParams).toBeDefined();
      expect(result.current.fsrsParams.requestRetention).toBe(0.9);
    });

    it('should update FSRS parameters', async () => {
      const { result } = renderHook(() => useSettings(null, null));

      const newParams = { ...result.current.fsrsParams, requestRetention: 0.85 };

      await act(async () => {
        await result.current.updateFsrsParams(newParams);
      });

      expect(result.current.fsrsParams.requestRetention).toBe(0.85);
    });

    it('should save FSRS parameters to localStorage', async () => {
      const { result } = renderHook(() => useSettings(null, null));

      const newParams = { ...result.current.fsrsParams, requestRetention: 0.85 };

      await act(async () => {
        await result.current.updateFsrsParams(newParams);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.FSRS_PARAMS,
        expect.stringContaining('0.85')
      );
    });

    it('should reset FSRS parameters to default', async () => {
      const { result } = renderHook(() => useSettings(null, null));

      // First change params
      await act(async () => {
        await result.current.updateFsrsParams({ ...result.current.fsrsParams, requestRetention: 0.85 });
      });

      expect(result.current.fsrsParams.requestRetention).toBe(0.85);

      // Then reset
      await act(async () => {
        await result.current.resetFsrsParams();
      });

      expect(result.current.fsrsParams.requestRetention).toBe(0.9);
    });
  });

  describe('interval settings visibility', () => {
    it('should initialize with interval settings hidden', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.showIntervalSettings).toBe(false);
    });

    it('should toggle interval settings visibility', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.showIntervalSettings).toBe(false);

      act(() => {
        result.current.toggleIntervalSettings();
      });

      expect(result.current.showIntervalSettings).toBe(true);
    });

    it('should toggle interval settings back off', () => {
      const { result } = renderHook(() => useSettings(null, null));

      act(() => {
        result.current.toggleIntervalSettings();
      });

      expect(result.current.showIntervalSettings).toBe(true);

      act(() => {
        result.current.toggleIntervalSettings();
      });

      expect(result.current.showIntervalSettings).toBe(false);
    });
  });

  describe('settings loaded state', () => {
    it('should set settingsLoaded to true when loadFromLocalStorage is called', () => {
      const { result } = renderHook(() => useSettings(null, null));

      // Without Firebase, settingsLoaded starts false
      expect(result.current.settingsLoaded).toBe(false);

      act(() => {
        result.current.loadFromLocalStorage();
      });

      expect(result.current.settingsLoaded).toBe(true);
    });

    it('should not be loading when no firebase app', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should initialize with no error', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current.error).toBe('');
    });

    it('should clear error when clearError is called', () => {
      const { result } = renderHook(() => useSettings(null, null));

      // The hook should have a clearError function
      expect(result.current.clearError).toBeDefined();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe('');
    });
  });

  describe('applyTheme function', () => {
    it('should add dark class when isDark is true', () => {
      const { result } = renderHook(() => useSettings(null, null));

      // Clear previous calls from initialization
      addSpy.mockClear();

      act(() => {
        result.current.applyTheme(true);
      });

      expect(addSpy).toHaveBeenCalledWith('dark');
    });

    it('should remove dark class when isDark is false', () => {
      const { result } = renderHook(() => useSettings(null, null));

      // Clear previous calls from initialization
      removeSpy.mockClear();

      act(() => {
        result.current.applyTheme(false);
      });

      expect(removeSpy).toHaveBeenCalledWith('dark');
    });
  });

  describe('applyHighContrast function', () => {
    it('should add high-contrast class when enabled', () => {
      const { result } = renderHook(() => useSettings(null, null));

      // Clear previous calls from initialization
      addSpy.mockClear();

      act(() => {
        result.current.applyHighContrast(true);
      });

      expect(addSpy).toHaveBeenCalledWith('high-contrast');
    });

    it('should remove high-contrast class when disabled', () => {
      const { result } = renderHook(() => useSettings(null, null));

      // Clear previous calls from initialization
      removeSpy.mockClear();

      act(() => {
        result.current.applyHighContrast(false);
      });

      expect(removeSpy).toHaveBeenCalledWith('high-contrast');
    });
  });

  describe('loadFromLocalStorage function', () => {
    it('should load theme from localStorage', () => {
      // Set up mock before hook initializes
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.THEME) return THEMES.DARK;
        return null;
      });

      const { result } = renderHook(() => useSettings(null, null));

      // Theme is already loaded during initialization
      expect(result.current.isDarkMode).toBe(true);
    });

    it('should load FSRS params from localStorage when loadFromLocalStorage is called', () => {
      const customParams = { requestRetention: 0.85, maximumInterval: 180 };

      // The params are only loaded from localStorage when loadFromLocalStorage is called
      const { result } = renderHook(() => useSettings(null, null));

      // Update mock to return custom params
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.FSRS_PARAMS) return JSON.stringify(customParams);
        return null;
      });

      act(() => {
        result.current.loadFromLocalStorage();
      });

      expect(result.current.fsrsParams.requestRetention).toBe(0.85);
    });

    it('should set settingsLoaded to true', () => {
      const { result } = renderHook(() => useSettings(null, null));

      act(() => {
        result.current.loadFromLocalStorage();
      });

      expect(result.current.settingsLoaded).toBe(true);
    });
  });

  describe('return value structure', () => {
    it('should return all expected state properties', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(result.current).toHaveProperty('isDarkMode');
      expect(result.current).toHaveProperty('isHighContrast');
      expect(result.current).toHaveProperty('fsrsParams');
      expect(result.current).toHaveProperty('showIntervalSettings');
      expect(result.current).toHaveProperty('settingsLoaded');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
    });

    it('should return all expected action functions', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(typeof result.current.toggleDarkMode).toBe('function');
      expect(typeof result.current.toggleHighContrast).toBe('function');
      expect(typeof result.current.updateFsrsParams).toBe('function');
      expect(typeof result.current.toggleIntervalSettings).toBe('function');
      expect(typeof result.current.resetFsrsParams).toBe('function');
      expect(typeof result.current.loadFromLocalStorage).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });

    it('should return all expected utility functions', () => {
      const { result } = renderHook(() => useSettings(null, null));

      expect(typeof result.current.applyTheme).toBe('function');
      expect(typeof result.current.applyHighContrast).toBe('function');
    });
  });
});
