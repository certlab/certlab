#!/usr/bin/env node

/**
 * Dynatrace Configuration Checker
 * 
 * This script verifies that Dynatrace environment variables are properly configured.
 * Dynatrace is REQUIRED for deployment to ensure proper monitoring and error detection.
 * 
 * This check will FAIL (exit code 1) if Dynatrace is not properly configured.
 * 
 * Usage:
 *   node scripts/check-dynatrace-config.js
 *   npm run check:dynatrace
 * 
 * Or to check specific environment variables:
 *   VITE_DYNATRACE_SCRIPT_URL=xxx VITE_ENABLE_DYNATRACE=true node scripts/check-dynatrace-config.js
 */

const requiredVars = [
  'VITE_DYNATRACE_SCRIPT_URL'
];

console.log('\n🔍 Checking Dynatrace Configuration...\n');
console.log('━'.repeat(60));

let hasErrors = false;

/**
 * Mask a sensitive value for display
 * Shows first 20 characters and indicates total length
 */
function maskValue(value) {
  if (value.length <= 20) {
    return value;
  }
  return value.substring(0, 20) + '...' + ` (${value.length} chars total)`;
}

/**
 * Validate Dynatrace script URL format
 */
function validateScriptUrl(url) {
  // Must be HTTPS
  if (!url.startsWith('https://')) {
    return 'Must start with https://';
  }
  
  // Must be from Dynatrace domain
  const dynatracePattern = /^https:\/\/(js-cdn\.dynatrace\.com|[a-zA-Z0-9.-]+\.(?:live\.)?dynatrace\.com)\//;
  if (!dynatracePattern.test(url)) {
    return 'Must be from Dynatrace domain (js-cdn.dynatrace.com or *.dynatrace.com)';
  }
  
  // Should look like a script path
  if (!url.includes('/jstag/')) {
    return 'URL should contain /jstag/ path (verify this is the correct Dynatrace RUM script URL)';
  }
  
  return null; // Valid
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
    
    // Validate script URL format
    if (varName === 'VITE_DYNATRACE_SCRIPT_URL') {
      const validationError = validateScriptUrl(value);
      if (validationError) {
        console.log(`   ❌ ERROR: ${validationError}`);
        hasErrors = true;
      }
    }
  }
});

// Check optional enable flag
console.log('\n🚩 Feature Flags:\n');
const enableFlag = process.env.VITE_ENABLE_DYNATRACE;
if (enableFlag === 'false') {
  console.log(`❌ VITE_ENABLE_DYNATRACE: ${enableFlag} (explicitly disabled)`);
  console.log('   ERROR: Dynatrace cannot be disabled - it is required for deployment');
  hasErrors = true;
} else if (enableFlag === 'true') {
  console.log(`✅ VITE_ENABLE_DYNATRACE: ${enableFlag} (explicitly enabled)`);
} else {
  console.log(`ℹ️  VITE_ENABLE_DYNATRACE: not set (defaults to enabled)`);
}

// Summary
console.log('\n' + '━'.repeat(60));
console.log('\n📊 Summary:\n');

if (hasErrors) {
  console.log('❌ DYNATRACE CONFIGURATION FAILED');
  console.log('\nDynatrace observability is REQUIRED for deployment.');
  console.log('The application cannot be deployed without proper monitoring.');
  console.log('\n💡 To fix this issue:\n');
  console.log('1. Obtain Dynatrace RUM script URL:');
  console.log('   a. Sign up at https://www.dynatrace.com/trial (free trial available)');
  console.log('   b. Create a web application in your Dynatrace environment');
  console.log('   c. Go to: Applications & Microservices > Web applications > Your app');
  console.log('   d. Click "..." > Edit > Setup > Instrumentation code');
  console.log('   e. Copy the complete src URL from the <script> tag');
  console.log('      Example: https://js-cdn.dynatrace.com/jstag/abc123/xyz789/script.js\n');
  console.log('2. Set the environment variable:');
  console.log('   - For local development: Add to .env file');
  console.log('   - For GitHub Actions: Add as repository secret');
  console.log('   - Variable name: VITE_DYNATRACE_SCRIPT_URL\n');
  console.log('3. Ensure VITE_ENABLE_DYNATRACE is not set to "false"\n');
  console.log('📚 For detailed setup instructions, see docs/setup/dynatrace.md\n');
  process.exit(1);
} else {
  console.log('✅ DYNATRACE CONFIGURATION VALID');
  console.log('\nDynatrace observability is properly configured.');
  console.log('Monitoring will be active after deployment.\n');
  console.log('📊 Expected capabilities:');
  console.log('   - Real User Monitoring (RUM)');
  console.log('   - JavaScript error tracking');
  console.log('   - Performance metrics');
  console.log('   - User session tracking');
  console.log('   - Custom action tracking\n');
  process.exit(0);
}
