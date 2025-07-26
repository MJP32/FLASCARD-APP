#!/usr/bin/env node

// Firebase Admin SDK Script to Fix AWS Cards
// This script uses Firebase Admin SDK with service account for authentication

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
let app;

async function initializeFirebase() {
  console.log('🔥 Initializing Firebase Admin SDK...');
  
  try {
    // Check if service account key exists
    const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Service account key not found!');
      console.log('💡 Please follow SERVICE_ACCOUNT_SETUP.md to set up the service account key');
      console.log('💡 Expected file: service-account-key.json');
      return false;
    }
    
    // Read service account key
    const serviceAccount = require(serviceAccountPath);
    
    // Initialize Firebase Admin
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    
    console.log('✅ Firebase Admin initialized successfully');
    console.log(`📋 Project ID: ${serviceAccount.project_id}`);
    return true;
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    return false;
  }
}

async function fixAWSCards(userId) {
  if (!userId) {
    console.error('❌ User ID is required');
    console.log('💡 Usage: node fix-aws-admin.js <userId>');
    process.exit(1);
  }

  console.log('🔧 Starting AWS cards fix for user:', userId);
  
  try {
    const db = admin.firestore();
    
    // Get all flashcards for the user
    console.log('📋 Querying flashcards collection...');
    const snapshot = await db.collection('flashcards')
      .where('userId', '==', userId)
      .get();
    
    if (snapshot.empty) {
      console.log('⚠️ No flashcards found for this user');
      console.log('💡 Check if the userId is correct:', userId);
      return;
    }
    
    let totalCards = 0;
    let awsCards = 0;
    let fixedCards = 0;
    let alreadyActiveCards = 0;
    let errorCards = 0;
    
    console.log(`📊 Found ${snapshot.size} total cards`);
    console.log('🔍 Scanning for AWS cards...');
    
    // Process each document
    for (const doc of snapshot.docs) {
      const card = doc.data();
      totalCards++;
      
      // Check if this is an AWS card (case insensitive)
      const category = (card.category || '').toLowerCase();
      if (category === 'aws') {
        awsCards++;
        
        const question = card.question?.substring(0, 50) || 'No question';
        console.log(`🎯 AWS Card: "${question}..." - Active: ${card.active}, ID: ${doc.id}`);
        
        // Check if the card needs fixing
        if (card.active === false) {
          console.log(`📝 Fixing inactive AWS card...`);
          
          try {
            // Update the card to set active: true
            await doc.ref.update({ active: true });
            
            fixedCards++;
            console.log(`✅ Fixed card: ${doc.id}`);
          } catch (error) {
            errorCards++;
            console.error(`❌ Failed to fix card ${doc.id}:`, error.message);
          }
        } else {
          alreadyActiveCards++;
          console.log(`✅ Card already active`);
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
      console.log('\n🔄 AWS cards have been updated!');
      console.log('🌐 Refresh your web app to see the AWS category appear.');
    } else if (awsCards === 0) {
      console.log('\n⚠️ No AWS cards found. This could mean:');
      console.log('   - No cards exist with category "AWS"');
      console.log('   - Cards have a different category name (check spelling/case)');
      console.log('   - The userId is incorrect');
    } else {
      console.log('\n✅ All AWS cards were already active - no changes needed.');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error fixing AWS cards:', error.message);
    
    // Provide helpful debugging info
    console.log('\n🔍 Debug Information:');
    console.log('   - Make sure the service account has Firestore permissions');
    console.log('   - Make sure the userId is correct');
    console.log('   - Check your internet connection');
    
    throw error;
  }
}

async function main() {
  console.log('🚀 AWS Cards Fix Script (Admin SDK) Starting...\n');
  
  // Get userId from command line arguments
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ User ID is required');
    console.log('💡 Usage: node fix-aws-admin.js <userId>');
    console.log('💡 Example: node fix-aws-admin.js Wxww8kEiROTO6Jg8WfXQGpSAbMp1');
    console.log('\n📋 Steps to run:');
    console.log('1. Follow SERVICE_ACCOUNT_SETUP.md to get service account key');
    console.log('2. Place service-account-key.json in this directory');
    console.log('3. Run: node fix-aws-admin.js <your-user-id>');
    process.exit(1);
  }
  
  try {
    // Initialize Firebase Admin
    const initialized = await initializeFirebase();
    if (!initialized) {
      process.exit(1);
    }
    
    // Fix AWS cards
    await fixAWSCards(userId);
    
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up Firebase app
    if (app) {
      try {
        await app.delete();
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}

module.exports = { fixAWSCards };