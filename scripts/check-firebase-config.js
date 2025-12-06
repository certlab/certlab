#!/usr/bin/env node

/**
 * Firebase Configuration Checker
 * 
 * This script helps verify that Firebase environment variables are properly configured.
 * Run this script to check if Google Sign-In will work in your deployment.
 * 
 * Usage:
 *   node scripts/check-firebase-config.js
 * 
 * Or to check specific environment variables:
 *   VITE_FIREBASE_API_KEY=xxx VITE_FIREBASE_AUTH_DOMAIN=xxx ... node scripts/check-firebase-config.js
 */

const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID'
];

const optionalVars = [
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

console.log('\n🔍 Checking Firebase Configuration...\n');
console.log('━'.repeat(60));

let hasErrors = false;
let hasWarnings = false;

/**
 * Mask a sensitive value for display
 * Shows first 8 and last 4 characters, masks the middle
 */
function maskValue(value) {
  if (value.length <= 12) {
    // For short values, just show first 8 chars
    return value.substring(0, 8) + '...';
  }
  // For longer values, show first 8 and last 4
  return value.substring(0, 8) + '...' + value.substring(value.length - 4);
}

// Check required variables
console.log('\n📋 Required Variables:\n');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`❌ ${varName}: NOT SET`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: ${maskValue(value)}`);
    
    // Basic validation
    if (varName === 'VITE_FIREBASE_API_KEY') {
      if (!value.startsWith('AIza')) {
        console.log(`   ⚠️  Warning: Firebase API keys usually start with "AIza"`);
        hasWarnings = true;
      }
    }
    
    if (varName === 'VITE_FIREBASE_AUTH_DOMAIN') {
      if (!value.endsWith('.firebaseapp.com')) {
        console.log(`   ⚠️  Warning: Firebase auth domains usually end with ".firebaseapp.com"`);
        hasWarnings = true;
      }
    }
  }
});

// Check optional variables
console.log('\n📋 Optional Variables (recommended):\n');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`⚪ ${varName}: NOT SET (optional)`);
  } else {
    console.log(`✅ ${varName}: ${maskValue(value)}`);
  }
});

// Summary
console.log('\n' + '━'.repeat(60));
console.log('\n📊 Summary:\n');

if (hasErrors) {
  console.log('❌ Configuration is INCOMPLETE');
  console.log('   Google Sign-In will NOT work.');
  console.log('\n💡 Next steps:');
  console.log('   1. Set the missing required environment variables');
  console.log('   2. See GOOGLE_AUTH_SETUP.md for detailed instructions');
  console.log('   3. For GitHub Actions, add these as repository secrets');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Configuration is COMPLETE but has warnings');
  console.log('   Google Sign-In might work, but check the warnings above.');
  console.log('\n💡 Recommended:');
  console.log('   - Review the warnings above');
  console.log('   - Verify values in Firebase Console');
  console.log('   - See GOOGLE_AUTH_SETUP.md for guidance');
  process.exit(0);
} else {
  console.log('✅ Configuration is COMPLETE');
  console.log('   Google Sign-In should work!');
  console.log('\n💡 Additional checks:');
  console.log('   1. Verify Google Sign-In is enabled in Firebase Console');
  console.log('   2. Verify your domain is in authorized domains');
  console.log('   3. See GOOGLE_AUTH_SETUP.md for more details');
  process.exit(0);
}
