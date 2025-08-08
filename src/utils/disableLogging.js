// Utility to disable all console logging from the application
// Add this import to any file where you want to disable logging

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
  trace: console.trace
};

// Disable all console methods
export const disableAllLogging = () => {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.trace = () => {};
};

// Restore console methods
export const enableLogging = () => {
  Object.assign(console, originalConsole);
};

// Auto-disable logging in production
if (process.env.NODE_ENV === 'production' || process.env.DISABLE_LOGS === 'true') {
  disableAllLogging();
}

// Add debug mode toggle
window.enableDebugMode = () => {
  enableLogging();
  console.log('🔍 Debug mode enabled - console logging restored');
};