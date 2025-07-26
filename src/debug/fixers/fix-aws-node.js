#!/usr/bin/env node

// Node.js Script to Fix AWS Cards - Set active: true for all AWS category cards
// This script uses Firebase client SDK to fix the AWS cards issue

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3R7pV3mXqg2-kY9xvH126BoF5KQDQDls",
  authDomain: "flashcard-app-3f2a3.firebaseapp.com",
  projectId: "flashcard-app-3f2a3",
  storageBucket: "flashcard-app-3f2a3.firebasestorage.app",
  messagingSenderId: "399745541062",
  appId: "1:399745541062:web:958a2cfbd7c6c9c78988c7",
  measurementId: "G-6LJ19R2ZTZ"
};

let app, db;

async function initializeFirebase() {
  console.log('🔥 Initializing Firebase...');
  
  try {
    // Initialize Firebase client app
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    console.log('✅ Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    return false;
  }
}

async function fixAWSCards(userId) {
  if (!userId) {
    console.error('❌ User ID is required');
    console.log('💡 Usage: node fix-aws-node.js <userId>');
    process.exit(1);
  }

  console.log('🔧 Starting AWS cards fix for user:', userId);
  
  try {
    // Get all flashcards for the user
    const flashcardsRef = collection(db, 'flashcards');
    const userCardsQuery = query(flashcardsRef, where('userId', '==', userId));
    const snapshot = await getDocs(userCardsQuery);
    
    let totalCards = 0;
    let awsCards = 0;
    let fixedCards = 0;
    let alreadyActiveCards = 0;
    let errorCards = 0;
    
    console.log('📋 Scanning flashcards...');
    
    // Process each document
    for (const docSnapshot of snapshot.docs) {
      const card = docSnapshot.data();
      totalCards++;
      
      // Check if this is an AWS card (case insensitive)
      const category = (card.category || '').toLowerCase();
      if (category === 'aws') {
        awsCards++;
        
        console.log(`🔍 Found AWS card: "${card.question?.substring(0, 50)}..." - Active: ${card.active}`);
        
        // Check if the card needs fixing
        if (card.active === false) {
          console.log(`📝 Fixing AWS card: ${card.question?.substring(0, 50)}...`);
          
          try {
            // Update the card
            const cardRef = doc(db, 'flashcards', docSnapshot.id);
            await updateDoc(cardRef, { active: true });
            
            fixedCards++;
            console.log(`✅ Fixed card: ${docSnapshot.id}`);
          } catch (error) {
            errorCards++;
            console.error(`❌ Failed to fix card ${docSnapshot.id}:`, error);
          }
        } else {
          alreadyActiveCards++;
          console.log(`✅ AWS card already active: ${card.question?.substring(0, 50)}...`);
        }
      }
    }
    
    const result = {
      totalCards,
      awsCards,
      fixedCards,
      alreadyActiveCards,
      errorCards,
      success: errorCards === 0
    };
    
    console.log('\n🎉 AWS cards fix completed!');
    console.log('📊 Final Results:');
    console.log(`   📋 Total cards scanned: ${totalCards}`);
    console.log(`   🎯 AWS cards found: ${awsCards}`);
    console.log(`   🔧 Cards fixed: ${fixedCards}`);
    console.log(`   ✅ Already active: ${alreadyActiveCards}`);
    console.log(`   ❌ Errors: ${errorCards}`);
    
    if (fixedCards > 0) {
      console.log('\n🔄 AWS cards have been updated! Refresh your web app to see the changes.');
    } else if (awsCards === 0) {
      console.log('\n⚠️ No AWS cards found. Check if:');
      console.log('   - Cards exist with category "AWS" (case insensitive)');
      console.log('   - The correct userId is being used');
    } else {
      console.log('\nℹ️ All AWS cards were already active.');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error fixing AWS cards:', error);
    
    // Provide helpful debugging info
    console.log('\n🔍 Debug Information:');
    console.log('   - Make sure the userId is correct');
    console.log('   - Make sure Firebase project is accessible');
    console.log('   - Check your internet connection');
    
    throw error;
  }
}

async function main() {
  console.log('🚀 AWS Cards Fix Script Starting...\n');
  
  // Get userId from command line arguments
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ User ID is required');
    console.log('💡 Usage: node fix-aws-node.js <userId>');
    console.log('💡 Example: node fix-aws-node.js Wxww8kEiROTO6Jg8WfXQGpSAbMp1');
    process.exit(1);
  }
  
  try {
    // Initialize Firebase
    const initialized = await initializeFirebase();
    if (!initialized) {
      process.exit(1);
    }
    
    // Fix AWS cards
    await fixAWSCards(userId);
    
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { fixAWSCards };