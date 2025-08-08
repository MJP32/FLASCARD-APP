// Firestore Permissions Debug Script
// Run this in browser console to diagnose the permission issue

window.debugFirestorePermissions = async function() {
  console.clear();
  console.log('🔍 FIRESTORE PERMISSIONS DEBUG');
  console.log('==============================');
  
  try {
    // Check authentication
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('❌ NO USER LOGGED IN');
      return;
    }
    
    console.log('✅ User authenticated:');
    console.log('   - UID:', user.uid);
    console.log('   - Email:', user.email || 'Anonymous');
    console.log('   - Anonymous:', user.isAnonymous);
    
    // Get current card
    const currentCard = window.flashcardHook?.getCurrentCard?.();
    if (!currentCard) {
      console.log('❌ No current card available');
      return;
    }
    
    console.log('\n📋 Current Card Info:');
    console.log('   - Card ID:', currentCard.id);
    console.log('   - Card userId:', currentCard.userId);
    console.log('   - User match:', currentCard.userId === user.uid);
    
    // Test Firestore operations
    const { getFirestore, doc, getDoc, updateDoc } = await import('firebase/firestore');
    const db = getFirestore();
    
    console.log('\n🔍 Testing Firestore Operations:');
    
    // 1. Test READ permission
    try {
      const cardRef = doc(db, 'flashcards', currentCard.id);
      const cardDoc = await getDoc(cardRef);
      
      if (cardDoc.exists()) {
        console.log('✅ READ permission: OK');
        const data = cardDoc.data();
        console.log('   - Firestore userId:', data.userId);
        console.log('   - Current userId:', user.uid);
        console.log('   - UserIds match:', data.userId === user.uid);
      } else {
        console.log('❌ Card does not exist in Firestore');
        return;
      }
    } catch (readErr) {
      console.log('❌ READ permission: FAILED');
      console.log('   Error:', readErr.code, readErr.message);
      return;
    }
    
    // 2. Test WRITE permission with minimal update
    console.log('\n🔍 Testing WRITE permission:');
    try {
      const cardRef = doc(db, 'flashcards', currentCard.id);
      await updateDoc(cardRef, {
        lastTestUpdate: new Date()
      });
      console.log('✅ WRITE permission: OK');
      console.log('🎉 Permissions are working correctly!');
      
    } catch (writeErr) {
      console.log('❌ WRITE permission: FAILED');
      console.log('   Error code:', writeErr.code);
      console.log('   Error message:', writeErr.message);
      
      // Provide specific solutions based on error
      if (writeErr.code === 'permission-denied') {
        console.log('\n💡 SOLUTION STEPS:');
        console.log('1. Check your Firestore Security Rules');
        console.log('2. Rules should allow authenticated users to update their own cards');
        console.log('3. Example rule:');
        console.log('   allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;');
        console.log('\n4. Or for testing, use permissive rules:');
        console.log('   allow read, write: if request.auth != null;');
      }
    }
    
    // 3. Test with exact review data structure
    console.log('\n🔍 Testing with review data structure:');
    try {
      const { Timestamp } = await import('firebase/firestore');
      const now = new Date();
      
      const reviewData = {
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        difficulty: 5,
        stability: 2,
        dueDate: Timestamp.fromDate(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
        lastReviewed: Timestamp.fromDate(now),
        reviewCount: (currentCard.reviewCount || 0) + 1,
        level: 'good'
      };
      
      const cardRef = doc(db, 'flashcards', currentCard.id);
      await updateDoc(cardRef, reviewData);
      console.log('✅ REVIEW UPDATE: OK');
      console.log('🎉 Card review updates are working!');
      
    } catch (reviewErr) {
      console.log('❌ REVIEW UPDATE: FAILED');
      console.log('   Error:', reviewErr.code, reviewErr.message);
    }
    
  } catch (error) {
    console.log('❌ Fatal error:', error);
  }
};

// Auto-run
window.debugFirestorePermissions();
