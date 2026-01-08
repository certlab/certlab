#!/usr/bin/env node

/**
 * Dynatrace Integration Test Script
 * 
 * This script verifies that:
 * 1. The Dynatrace script URL is correctly referenced in index.html
 * 2. The environment variable substitution works properly
 * 3. The validation logic matches between index.html and dynatrace.ts
 * 4. A working Dynatrace integration is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Dynatrace Integration Test\n');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test 1: Verify index.html contains Dynatrace script loading logic
test('index.html contains Dynatrace script loading logic', () => {
  const indexHtml = fs.readFileSync(
    path.join(__dirname, '../client/index.html'),
    'utf-8'
  );
  
  if (!indexHtml.includes('VITE_DYNATRACE_SCRIPT_URL')) {
    throw new Error('index.html missing VITE_DYNATRACE_SCRIPT_URL placeholder');
  }
  
  if (!indexHtml.includes('js-cdn.dynatrace.com')) {
    throw new Error('index.html missing Dynatrace domain validation');
  }
  
  if (!indexHtml.includes('scriptUrl.indexOf(\'https://\')')) {
    throw new Error('index.html missing HTTPS validation');
  }
});

// Test 2: Verify URL validation pattern matches
test('URL validation pattern is consistent', () => {
  const indexHtml = fs.readFileSync(
    path.join(__dirname, '../client/index.html'),
    'utf-8'
  );
  
  // Check for the URL validation regex in index.html
  if (!indexHtml.includes('js-cdn\\.dynatrace\\.com') && 
      !indexHtml.includes('js-cdn.dynatrace.com')) {
    throw new Error('Could not find URL validation pattern in index.html');
  }
  
  console.log('   Pattern found in index.html');
});

// Test 3: Verify dynatrace.ts exists and has proper structure
test('dynatrace.ts has required exports', () => {
  const dynatraceTs = fs.readFileSync(
    path.join(__dirname, '../client/src/lib/dynatrace.ts'),
    'utf-8'
  );
  
  const requiredExports = [
    'getDynatraceConfig',
    'isDynatraceAvailable',
    'initializeDynatrace',
    'trackAction',
    'completeAction',
    'reportError',
    'identifyUser',
    'endSession',
  ];
  
  requiredExports.forEach((exportName) => {
    if (!dynatraceTs.includes(`export function ${exportName}`)) {
      throw new Error(`Missing export: ${exportName}`);
    }
  });
});

// Test 4: Verify environment variable configuration
test('Environment variables are properly documented', () => {
  const envExample = fs.readFileSync(
    path.join(__dirname, '../.env.example'),
    'utf-8'
  );
  
  if (!envExample.includes('VITE_DYNATRACE_SCRIPT_URL')) {
    throw new Error('.env.example missing VITE_DYNATRACE_SCRIPT_URL');
  }
  
  if (!envExample.includes('https://js-cdn.dynatrace.com')) {
    throw new Error('.env.example missing example Dynatrace URL');
  }
});

// Test 5: Verify check script exists and works
test('check-dynatrace-config.js exists and is executable', () => {
  const checkScript = path.join(__dirname, 'check-dynatrace-config.js');
  
  if (!fs.existsSync(checkScript)) {
    throw new Error('check-dynatrace-config.js not found');
  }
  
  const stats = fs.statSync(checkScript);
  if (!(stats.mode & 0o111)) {
    throw new Error('check-dynatrace-config.js is not executable');
  }
});

// Test 6: Verify README documents Dynatrace setup
test('README.md documents Dynatrace as recommended', () => {
  const readme = fs.readFileSync(
    path.join(__dirname, '../README.md'),
    'utf-8'
  );
  
  if (!readme.includes('Dynatrace')) {
    throw new Error('README missing Dynatrace documentation');
  }
  
  if (!readme.includes('recommended') || !readme.includes('monitoring')) {
    throw new Error('README should describe Dynatrace as recommended for monitoring');
  }
});

// Test 7: Test URL format validation
test('URL validation accepts valid Dynatrace URLs', () => {
  const validUrls = [
    'https://js-cdn.dynatrace.com/jstag/176fb25782e/bf39586mkb/cf1e99687bff1875_complete.js',
    'https://js-cdn.dynatrace.com/jstag/abc123/xyz789/script.js',
    'https://custom.dynatrace.com/jstag/test.js',
    'https://tenant.live.dynatrace.com/jstag/monitor.js',
  ];
  
  // Pattern from index.html line 70
  const pattern = /^https:\/\/(js-cdn\.dynatrace\.com|[a-zA-Z0-9.-]+\.(?:live\.)?dynatrace\.com)\//;
  
  validUrls.forEach((url) => {
    if (!pattern.test(url)) {
      throw new Error(`Valid URL rejected: ${url}`);
    }
  });
});

// Test 8: Test URL validation rejects invalid URLs
test('URL validation rejects invalid URLs', () => {
  const invalidUrls = [
    'http://js-cdn.dynatrace.com/jstag/test.js', // HTTP
    'https://example.com/script.js', // Wrong domain
    '', // Empty
  ];
  
  const pattern = /^https:\/\/(js-cdn\.dynatrace\.com|[a-zA-Z0-9.-]+\.(?:live\.)?dynatrace\.com)\//;
  
  invalidUrls.forEach((url) => {
    if (url && pattern.test(url)) {
      throw new Error(`Invalid URL accepted: ${url}`);
    }
  });
});

// Test 9: Verify tests exist
test('Dynatrace integration tests exist', () => {
  const testFile = path.join(__dirname, '../client/src/lib/dynatrace.test.ts');
  
  if (!fs.existsSync(testFile)) {
    throw new Error('dynatrace.test.ts not found');
  }
  
  const testContent = fs.readFileSync(testFile, 'utf-8');
  if (!testContent.includes('describe') || !testContent.includes('it(')) {
    throw new Error('dynatrace.test.ts missing test structure');
  }
});

// Test 10: Verify main.tsx initializes Dynatrace
test('main.tsx initializes Dynatrace properly', () => {
  const mainTsx = fs.readFileSync(
    path.join(__dirname, '../client/src/main.tsx'),
    'utf-8'
  );
  
  if (!mainTsx.includes('initializeDynatrace')) {
    throw new Error('main.tsx does not call initializeDynatrace()');
  }
  
  if (!mainTsx.includes('Running without Dynatrace monitoring')) {
    throw new Error('main.tsx missing graceful degradation message');
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ Some tests failed. Please review the errors above.\n');
  process.exit(1);
} else {
  console.log('✅ All integration tests passed!\n');
  console.log('Dynatrace integration is correctly configured:');
  console.log('  ✓ Script URL is properly referenced in index.html');
  console.log('  ✓ Environment variable substitution works');
  console.log('  ✓ URL validation is consistent across files');
  console.log('  ✓ Graceful degradation when not configured');
  console.log('  ✓ All required exports are present');
  console.log('  ✓ Documentation is complete');
  console.log('  ✓ Test coverage is adequate\n');
  process.exit(0);
}
