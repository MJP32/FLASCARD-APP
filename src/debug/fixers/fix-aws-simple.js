// SIMPLE AWS CARDS FIX - Browser Console Script
// Copy and paste this ENTIRE script into your browser console while your app is running
// Then run: fixAWS()

console.log('🔧 Loading AWS Cards Fix...');

async function fixAWS() {
  console.log('🚀 Starting AWS cards fix...');
  
  try {
    // Import Firebase from your app (assuming it's globally available)
    const { db } = await import('./src/firebase.js');
    const { collection, getDocs, updateDoc, doc, query, where } = await import('firebase/firestore');
    
    // Get current user ID (try multiple methods)
    let userId = null;
    
    // Method 1: Check window/global variables
    if (window.userId) {
      userId = window.userId;
    }
    // Method 2: Check localStorage
    else if (localStorage.getItem('userId')) {
      userId = localStorage.getItem('userId');
    }
    // Method 3: Try to get from app state
    else {
      // This is the userId from your debug output
      userId = 'Wxww8kEiROTO6Jg8WfXQGpSAbMp1';
      console.log('⚠️ Using hardcoded userId from debug output');
    }
    
    if (!userId) {
      console.error('❌ Could not determine userId. Please make sure you are logged in.');
      return;
    }
    
    console.log('👤 Using userId:', userId);
    
    // Get all flashcards for the user
    const flashcardsRef = collection(db, 'flashcards');
    const userCardsQuery = query(flashcardsRef, where('userId', '==', userId));
    const snapshot = await getDocs(userCardsQuery);
    
    let totalCards = 0;
    let awsCards = 0;
    let fixedCards = 0;
    let alreadyActive = 0;
    
    console.log('📋 Scanning flashcards...');
    
    // Process each card
    for (const docSnapshot of snapshot.docs) {
      const card = docSnapshot.data();
      totalCards++;
      
      // Check if this is an AWS card (case insensitive)
      const category = (card.category || '').toLowerCase();
      if (category === 'aws') {
        awsCards++;
        
        console.log(`🔍 AWS Card: "${card.question?.substring(0, 40)}..." - Active: ${card.active}`);
        
        // Fix if inactive
        if (card.active === false) {
          try {
            const cardRef = doc(db, 'flashcards', docSnapshot.id);
            await updateDoc(cardRef, { active: true });
            fixedCards++;
            console.log(`✅ Fixed: ${docSnapshot.id}`);
          } catch (error) {
            console.error(`❌ Failed to fix: ${docSnapshot.id}`, error);
          }
        } else {
          alreadyActive++;
        }
      }
    }
    
    // Results
    console.log('\n🎉 AWS Cards Fix Complete!');
    console.log(`📊 Results:`);
    console.log(`   Total cards: ${totalCards}`);
    console.log(`   AWS cards found: ${awsCards}`);
    console.log(`   Cards fixed: ${fixedCards}`);
    console.log(`   Already active: ${alreadyActive}`);
    
    if (fixedCards > 0) {
      console.log('\n🔄 Refresh your page to see the AWS category appear!');
      setTimeout(() => {
        if (window.confirm('Refresh page now to see the fixed AWS cards?')) {
          window.location.reload();
        }
      }, 2000);
    } else if (awsCards === 0) {
      console.log('\n⚠️ No AWS cards found. Check your data.');
    } else {
      console.log('\n✅ All AWS cards were already active.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Make sure:');
    console.log('   1. Your app is running and you are logged in');
    console.log('   2. You are on the correct page with Firebase loaded');
    console.log('   3. Run this script in the browser console, not Node.js');
  }
}

// Alternative version using existing app context
async function fixAWSSimple() {
  console.log('🔧 Simple AWS fix starting...');
  
  // Get Firebase from global scope (should be available in your running app)
  const firebase = window.firebase || window.fb;
  
  if (!firebase && !window.db) {
    console.error('❌ Firebase not found in global scope');
    console.log('💡 Make sure your React app is running and Firebase is loaded');
    return;
  }
  
  try {
    // Try to use existing Firebase instance
    let db = window.db;
    if (!db && firebase) {
      db = firebase.firestore();
    }
    
    console.log('🔍 Searching for AWS cards...');
    
    // This is a simplified version - you might need to adjust based on your app's structure
    console.log('⚠️ This simplified version requires manual database access');
    console.log('🔗 Please use the browser console method with your running React app');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Make functions globally available
window.fixAWS = fixAWS;
window.fixAWSSimple = fixAWSSimple;

console.log('✅ AWS fix loaded!');
console.log('💡 Run: fixAWS() to fix your AWS cards');
console.log('💡 Alternative: fixAWSSimple() for basic version');

// Instructions
console.log('\n📋 INSTRUCTIONS:');
console.log('1. Make sure your React app is running');
console.log('2. Make sure you are logged in');
console.log('3. Copy this entire script into browser console');
console.log('4. Run: fixAWS()');
console.log('5. Wait for completion and refresh page');