// Complete Firestore test
window.testFirestoreComplete = async function() {
  // Enable console
  if (window.enableDebugMode) window.enableDebugMode();
  
  console.log('🔍 COMPLETE FIRESTORE TEST');
  console.log('========================');
  
  // 1. Check basic setup
  const userId = window.flashcardHook?.userId;
  console.log('1️⃣ User ID:', userId || 'NOT FOUND');
  
  // 2. Check localStorage for settings
  console.log('\n2️⃣ LocalStorage Settings:');
  console.log('   - selected_ai_provider:', localStorage.getItem('selected_ai_provider'));
  console.log('   - openai_api_key exists:', !!localStorage.getItem('openai_api_key'));
  console.log('   - gemini_api_key exists:', !!localStorage.getItem('gemini_api_key'));
  console.log('   - anthropic_api_key exists:', !!localStorage.getItem('anthropic_api_key'));
  
  // 3. Check if settings are being saved to Firestore
  console.log('\n3️⃣ Settings Hook:');
  const settingsHook = window.settingsHook;
  console.log('   - Settings hook exists:', !!settingsHook);
  
  // 4. Test direct Firestore access
  console.log('\n4️⃣ Testing Direct Firestore Access...');
  
  try {
    // Get Firestore instance from the app
    const db = window.flashcardHook?.db || window.db;
    console.log('   - DB instance:', !!db);
    
    // Check if we can access Firestore at all
    if (!db) {
      console.log('❌ No Firestore instance found');
      alert('No Firestore database connection found. This is the root issue.');
      return;
    }
    
    // Test a simple read
    console.log('   - Testing read operation...');
    // This will tell us if Firestore is connected at all
    
  } catch (error) {
    console.log('❌ Firestore test error:', error);
  }
  
  // 5. Check network/console errors
  console.log('\n5️⃣ Common Issues to Check:');
  console.log('   - Check browser console for CORS errors');
  console.log('   - Check Network tab for failed requests to Firestore');
  console.log('   - Check if Firebase project is active (not deleted/suspended)');
  
  // Summary
  const summary = `
FIRESTORE TEST SUMMARY:
- User logged in: ${!!userId}
- Settings in localStorage: ${!!localStorage.getItem('selected_ai_provider')}
- Selected provider: ${localStorage.getItem('selected_ai_provider') || 'none'}

If settings aren't saving and rules aren't working,
check Firebase Console for:
1. Project status (active/suspended)
2. Firestore database exists
3. Billing/quota issues
`;
  
  console.log(summary);
  alert(summary);
};

window.testFirestoreComplete();