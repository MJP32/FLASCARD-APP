// Authentication State Debug Script
// Run this in browser console to diagnose authentication issues

window.debugAuthState = async function() {
  console.clear();
  console.log('🔍 AUTHENTICATION STATE DEBUG');
  console.log('===============================');
  
  try {
    // Check if Firebase is available
    if (!window.firebaseApp) {
      console.log('❌ Firebase app not available on window object');
      console.log('💡 Make sure Firebase is initialized first');
      return;
    }
    
    console.log('✅ Firebase app available:', window.firebaseApp);
    
    // Import Firebase Auth
    const { getAuth, onAuthStateChanged, signInAnonymously } = await import('firebase/auth');
    const auth = getAuth(window.firebaseApp);
    
    console.log('\n🔍 Current Auth State:');
    console.log('   - Auth object:', auth);
    console.log('   - Current user:', auth.currentUser);
    
    if (auth.currentUser) {
      const user = auth.currentUser;
      console.log('✅ User is authenticated:');
      console.log('   - UID:', user.uid);
      console.log('   - Email:', user.email || 'No email');
      console.log('   - Anonymous:', user.isAnonymous);
      console.log('   - Display name:', user.displayName || 'No display name');
      console.log('   - Email verified:', user.emailVerified);
      console.log('   - Provider data:', user.providerData);
      
      // Check localStorage for userId
      const storedUserId = localStorage.getItem('flashcard_userId');
      console.log('   - Stored userId in localStorage:', storedUserId);
      console.log('   - UIDs match:', user.uid === storedUserId);
      
      if (user.uid !== storedUserId) {
        console.log('⚠️  UID mismatch detected - fixing localStorage');
        localStorage.setItem('flashcard_userId', user.uid);
      }
      
    } else {
      console.log('❌ No user authenticated');
      
      // Check if there's a stored userId without auth
      const storedUserId = localStorage.getItem('flashcard_userId');
      if (storedUserId) {
        console.log('⚠️  Found stored userId but no auth:', storedUserId);
        console.log('💡 This indicates an auth state mismatch');
      }
      
      // Try to sign in anonymously
      console.log('\n🔄 Attempting anonymous sign-in...');
      try {
        const result = await signInAnonymously(auth);
        console.log('✅ Anonymous sign-in successful:');
        console.log('   - New UID:', result.user.uid);
        localStorage.setItem('flashcard_userId', result.user.uid);
      } catch (signInError) {
        console.log('❌ Anonymous sign-in failed:', signInError.message);
      }
    }
    
    // Set up auth state listener
    console.log('\n👂 Setting up auth state listener...');
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('🔄 Auth state changed - User signed in:', user.uid);
        localStorage.setItem('flashcard_userId', user.uid);
      } else {
        console.log('🔄 Auth state changed - User signed out');
        localStorage.removeItem('flashcard_userId');
      }
    });
    
    // Check all localStorage keys related to flashcards
    console.log('\n💾 LocalStorage Debug:');
    const allKeys = Object.keys(localStorage);
    const flashcardKeys = allKeys.filter(key => key.includes('flashcard'));
    
    if (flashcardKeys.length === 0) {
      console.log('   - No flashcard-related keys found');
    } else {
      flashcardKeys.forEach(key => {
        console.log(`   - ${key}:`, localStorage.getItem(key));
      });
    }
    
    // Check if the app's userId state is set
    console.log('\n🎯 App State Check:');
    if (window.flashcardHook) {
      console.log('   - Flashcard hook available');
      // Try to access any exposed state
      if (window.flashcardHook.userId) {
        console.log('   - Hook userId:', window.flashcardHook.userId);
      }
    } else {
      console.log('   - Flashcard hook not available');
    }
    
  } catch (error) {
    console.log('❌ Debug script error:', error);
  }
};

// Also create a simple fix function
window.fixAuthState = async function() {
  console.log('🔧 ATTEMPTING TO FIX AUTH STATE');
  console.log('================================');
  
  try {
    const { getAuth, signInAnonymously } = await import('firebase/auth');
    const auth = getAuth(window.firebaseApp);
    
    // Clear any stale localStorage
    const allKeys = Object.keys(localStorage);
    const flashcardKeys = allKeys.filter(key => key.includes('flashcard'));
    flashcardKeys.forEach(key => {
      if (key !== 'flashcard_settings') { // Keep settings
        localStorage.removeItem(key);
        console.log('🗑️  Cleared:', key);
      }
    });
    
    // Sign in anonymously
    console.log('🔄 Signing in anonymously...');
    const result = await signInAnonymously(auth);
    console.log('✅ Success! New user ID:', result.user.uid);
    
    // Set the userId in localStorage
    localStorage.setItem('flashcard_userId', result.user.uid);
    
    console.log('🎉 Auth state fixed! Please refresh the page.');
    
  } catch (error) {
    console.log('❌ Fix failed:', error.message);
  }
};

// Auto-run the debug
window.debugAuthState();
