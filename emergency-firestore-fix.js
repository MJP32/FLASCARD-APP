// Emergency Firestore Fix Script
// Copy and paste this entire script into your browser console

window.emergencyFirestoreFix = async function() {
  console.clear();
  console.log('🚨 EMERGENCY FIRESTORE FIX');
  console.log('==========================');
  
  try {
    // Check if Firebase is available
    if (!window.firebaseApp) {
      console.log('❌ Firebase app not available');
      return;
    }

    // Import Firebase functions
    const { getAuth } = await import('firebase/auth');
    const { getFirestore, doc, setDoc, updateDoc, getDoc, collection, getDocs, Timestamp } = await import('firebase/firestore');
    
    const auth = getAuth(window.firebaseApp);
    const db = getFirestore(window.firebaseApp);
    const user = auth.currentUser;
    
    if (!user) {
      console.log('❌ No authenticated user');
      return;
    }
    
    console.log('✅ User authenticated:', user.uid);
    console.log('✅ Firestore connected');
    
    // Get flashcards from localStorage
    const flashcardsData = localStorage.getItem('flashcards');
    if (!flashcardsData) {
      console.log('❌ No flashcards in localStorage');
      return;
    }
    
    const flashcards = JSON.parse(flashcardsData);
    console.log(`📋 Found ${flashcards.length} flashcards in localStorage`);
    
    // Method 1: Try to read existing cards first
    console.log('\n🔍 METHOD 1: Checking existing cards in Firestore...');
    let existingCards = 0;
    let missingCards = 0;
    
    for (let i = 0; i < Math.min(flashcards.length, 5); i++) { // Check first 5 cards
      const card = flashcards[i];
      try {
        const cardRef = doc(db, 'flashcards', card.id);
        const cardDoc = await getDoc(cardRef);
        
        if (cardDoc.exists()) {
          existingCards++;
          const data = cardDoc.data();
          console.log(`✅ Card ${card.id} exists, userId: ${data.userId}`);
        } else {
          missingCards++;
          console.log(`❌ Card ${card.id} does not exist in Firestore`);
        }
      } catch (error) {
        console.log(`❌ Error reading card ${card.id}:`, error.code, error.message);
      }
    }
    
    console.log(`📊 Sample results: ${existingCards} exist, ${missingCards} missing`);
    
    // Method 2: Try to create/update cards with proper structure
    console.log('\n🔧 METHOD 2: Creating/updating cards with correct userId...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const card of flashcards) {
      try {
        const cardRef = doc(db, 'flashcards', String(card.id));
        
        // Create a clean card object with proper types
        const cleanCard = {
          id: String(card.id),
          userId: user.uid, // Set to current user
          question: String(card.question || ''),
          answer: String(card.answer || ''),
          category: String(card.category || 'Uncategorized'),
          subCategory: String(card.subCategory || 'Uncategorized'),
          difficulty: Number(card.difficulty || 5),
          stability: Number(card.stability || 2.5),
          state: String(card.state || 'new'),
          reviewCount: Number(card.reviewCount || 0),
          interval: Number(card.interval || 1),
          repetitions: Number(card.repetitions || 0),
          easeFactor: Number(card.easeFactor || 2.5),
          level: String(card.level || 'new'),
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        };
        
        // Add optional timestamp fields if they exist
        if (card.lastReview) {
          try {
            cleanCard.lastReview = card.lastReview;
          } catch (e) {
            // Skip invalid dates
          }
        }
        
        if (card.dueDate) {
          try {
            cleanCard.dueDate = card.dueDate;
          } catch (e) {
            // Skip invalid dates
          }
        }
        
        // Use setDoc to create or completely replace the document
        await setDoc(cardRef, cleanCard);
        successCount++;
        
        if (successCount <= 5) { // Log first 5 successes
          console.log(`✅ Fixed card ${card.id}`);
        }
        
      } catch (error) {
        errorCount++;
        console.log(`❌ Failed to fix card ${card.id}:`, error.code, error.message);
        
        if (errorCount <= 3) { // Log first 3 errors in detail
          console.log('   Full error:', error);
        }
      }
    }
    
    console.log(`\n🎉 RESULTS: ${successCount} cards fixed, ${errorCount} errors`);
    
    if (successCount > 0) {
      console.log('✅ Cards have been updated with your userId!');
      console.log('✅ Try reviewing a flashcard now - the permission error should be gone!');
    } else {
      console.log('❌ No cards were successfully updated');
      console.log('💡 This might indicate a deeper Firebase configuration issue');
    }
    
    // Method 3: Test a simple write operation
    console.log('\n🧪 METHOD 3: Testing simple write operation...');
    try {
      const testRef = doc(db, 'test', 'permission-test');
      await setDoc(testRef, {
        userId: user.uid,
        timestamp: Timestamp.fromDate(new Date()),
        test: 'permission-test'
      });
      console.log('✅ Simple write test successful - Firestore permissions are working');
    } catch (testError) {
      console.log('❌ Simple write test failed:', testError.code, testError.message);
      console.log('💡 This indicates a fundamental Firestore permission or configuration issue');
    }
    
  } catch (error) {
    console.log('❌ Script error:', error);
  }
};

// Auto-run the fix
console.log('🚨 Emergency Firestore Fix Script Loaded');
console.log('📋 Run: emergencyFirestoreFix()');
window.emergencyFirestoreFix();
