// Complete authentication state reset
window.fixAuthState = async function() {
  console.log('🔧 FIXING CORRUPTED AUTHENTICATION STATE');
  console.log('=====================================');
  
  // Step 1: Clear ALL localStorage items related to Firebase/Auth
  console.log('1️⃣ Clearing localStorage...');
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('firebase') || 
      key.includes('auth') || 
      key.includes('user') ||
      key.includes('firebaseui') ||
      key.startsWith('1:') // Firebase auth tokens often start with project number
    )) {
      keysToRemove.push(key);
    }
  }
  
  console.log(`   Found ${keysToRemove.length} auth-related items to clear`);
  keysToRemove.forEach(key => {
    console.log(`   Removing: ${key}`);
    localStorage.removeItem(key);
  });
  
  // Step 2: Clear sessionStorage
  console.log('\n2️⃣ Clearing sessionStorage...');
  const sessionKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('firebase') || key.includes('auth'))) {
      sessionKeysToRemove.push(key);
    }
  }
  sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
  
  // Step 3: Clear IndexedDB (Firebase uses this)
  console.log('\n3️⃣ Clearing IndexedDB...');
  if ('indexedDB' in window) {
    try {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name && db.name.includes('firebase')) {
          console.log(`   Deleting database: ${db.name}`);
          indexedDB.deleteDatabase(db.name);
        }
      }
    } catch (e) {
      console.log('   Could not enumerate databases, trying known Firebase DB names...');
      // Try common Firebase IndexedDB names
      const firebaseDBNames = [
        'firebaseLocalStorageDb',
        'firebase-heartbeat-database',
        'firebase-installations-database',
        'firebase-messaging-database'
      ];
      
      firebaseDBNames.forEach(dbName => {
        try {
          indexedDB.deleteDatabase(dbName);
          console.log(`   Deleted: ${dbName}`);
        } catch (e) {
          // Ignore errors
        }
      });
    }
  }
  
  // Step 4: Clear cookies
  console.log('\n4️⃣ Clearing Firebase cookies...');
  document.cookie.split(";").forEach(function(c) { 
    if (c.includes('firebase') || c.includes('auth')) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    }
  });
  
  // Step 5: Sign out if possible
  console.log('\n5️⃣ Attempting to sign out...');
  try {
    if (window.firebase?.auth) {
      await window.firebase.auth.signOut();
      console.log('   Signed out successfully');
    }
  } catch (e) {
    console.log('   Could not sign out (may already be signed out)');
  }
  
  console.log('\n✅ AUTHENTICATION STATE CLEARED!');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Refresh the page (Ctrl+F5 or Cmd+Shift+R)');
  console.log('2. You should see the login screen');
  console.log('3. Log in again (as guest or with credentials)');
  console.log('4. Your cards should now be updatable');
  
  alert('Authentication state cleared!\n\nPlease refresh the page now (Ctrl+F5) and log in again.');
};

// Run it
window.fixAuthState();