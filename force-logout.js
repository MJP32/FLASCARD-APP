// Force logout to show login screen
window.forceLogout = async function() {
  try {
    // Clear all auth-related localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('firebase') || key.includes('auth') || key.includes('user'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Try to sign out if Firebase auth is available
    if (window.firebase?.auth) {
      await window.firebase.auth.signOut();
    }
    
    alert('Logged out! Refresh the page to see login screen.');
    
  } catch (error) {
    alert('Logout attempt complete. Refresh the page.');
  }
};

window.forceLogout();