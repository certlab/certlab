#!/usr/bin/env node

/**
 * Firebase Configuration Checker
 * 
 * This script verifies that Firebase environment variables are properly configured.
 * Firebase is OPTIONAL - the app works fully offline with IndexedDB when not configured.
 * 
 * This check always succeeds (exit code 0) to allow CI/CD to pass without Firebase.
 * When Firebase is not configured, it provides helpful information about enabling cloud sync.
 * When Firebase IS configured, it validates the configuration is correct.
 * 
 * Usage:
 *   node scripts/check-firebase-config.js
 *   npm run check:firebase
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

const featureFlags = [
  'VITE_ENABLE_CLOUD_SYNC',
  'VITE_USE_FIREBASE_EMULATOR'
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
console.log('\n📋 Optional Variables (recommended for Firestore):\n');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`⚪ ${varName}: NOT SET (optional)`);
  } else {
    console.log(`✅ ${varName}: ${maskValue(value)}`);
  }
});

// Check feature flags
console.log('\n🚩 Feature Flags:\n');
featureFlags.forEach(varName => {
  const value = process.env[varName];
  const displayValue = value || 'not set (uses default)';
  console.log(`ℹ️  ${varName}: ${displayValue}`);
});

// Summary
console.log('\n' + '━'.repeat(60));
console.log('\n📊 Summary:\n');

if (hasErrors) {
  console.log('ℹ️  Firebase is NOT CONFIGURED (optional)');
  console.log('   The app will use local-only mode with IndexedDB storage.');
  console.log('   Firebase Authentication and Firestore features will be unavailable.');
  console.log('\n💡 To enable Firebase cloud sync (optional):');
  console.log('   1. Set the missing required environment variables');
  console.log('   2. See FIREBASE_SETUP.md for detailed instructions');
  console.log('   3. For GitHub Actions, add these as repository secrets');
  console.log('   4. Deploy Firestore rules: npm run deploy:firestore:rules');
  console.log('\n✅ Local-only mode works perfectly without Firebase!');
  process.exit(0);
} else if (hasWarnings) {
  console.log('⚠️  Configuration is COMPLETE but has warnings');
  console.log('   Firebase might work, but check the warnings above.');
  console.log('\n💡 Recommended:');
  console.log('   - Review the warnings above');
  console.log('   - Verify values in Firebase Console');
  console.log('   - See FIREBASE_SETUP.md for complete setup');
  console.log('   - Deploy Firestore rules: npm run deploy:firestore:rules');
  process.exit(0);
} else {
  console.log('✅ Configuration is COMPLETE');
  console.log('   Firebase Authentication and Firestore should work!');
  console.log('\n💡 Additional checks:');
  console.log('   1. Create Firestore database in Firebase Console');
  console.log('   2. Deploy Firestore rules: npm run deploy:firestore:rules');
  console.log('   3. Enable Email/Password and Google sign-in methods');
  console.log('   4. Add your domain to authorized domains');
  console.log('   5. See FIREBASE_SETUP.md for complete instructions');
  process.exit(0);
}
