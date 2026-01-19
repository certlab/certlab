# E2E Test Documentation

## Overview

This document provides comprehensive documentation for CertLab's End-to-End (E2E) test suite, built with [Playwright](https://playwright.dev/).

## Table of Contents

1. [Getting Started](#getting-started)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Writing Tests](#writing-tests)
5. [CI/CD Integration](#cicd-integration)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- All project dependencies installed (`npm install`)

### Installation

E2E test dependencies are installed automatically when you run `npm install`. The Playwright browsers are installed via:

```bash
npx playwright install chromium
```

For CI environments with full browser dependencies:

```bash
npx playwright install --with-deps chromium
```

---

## Running Tests

### Local Development

#### Run all E2E tests (headless)
```bash
npm run test:e2e
```

#### Run tests with visible browser (headed mode)
```bash
npm run test:e2e:headed
```

#### Run tests in interactive UI mode
```bash
npm run test:e2e:ui
```

#### Debug tests step-by-step
```bash
npm run test:e2e:debug
```

#### View test report after run
```bash
npm run test:e2e:report
```

#### Generate tests using Playwright Codegen
```bash
npm run test:e2e:codegen
```

### Running Specific Tests

```bash
# Run specific test file
npx playwright test e2e/tests/01-landing.spec.ts

# Run tests matching a pattern
npx playwright test --grep "authentication"

# Run tests in a specific project (browser)
npx playwright test --project=chromium
```

### Prerequisites for Running Tests

E2E tests require the application to be running. You have two options:

#### Option 1: Development Server (Recommended for local development)
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npm run test:e2e
```

#### Option 2: Production Build
```bash
# Build the application
npm run build

# Start preview server
npm run preview

# In another terminal, run tests
npm run test:e2e
```

---

## Test Structure

### Directory Layout

```
e2e/
├── fixtures/
│   └── base.ts              # Custom test fixtures and data factories
├── utils/
│   └── test-helpers.ts      # Reusable helper functions
└── tests/
    ├── 01-landing.spec.ts       # Landing page and navigation tests
    ├── 02-authentication.spec.ts # Auth flows (login, logout, session)
    ├── 03-quiz-flow.spec.ts      # Quiz creation and taking tests
    ├── 04-achievements.spec.ts   # Achievements and gamification tests
    └── 05-accessibility.spec.ts  # Accessibility and keyboard navigation tests
```

### Test Coverage

#### Phase 1: Basic Navigation ✅
- ✅ Landing page loads successfully
- ✅ Theme switching
- ✅ Mobile responsive design
- ✅ Page load performance

#### Phase 2: Authentication (Requires Firebase Setup)
- ⏸️ Google OAuth login flow (skipped - requires credentials)
- ⏸️ Logout flow (skipped - requires auth)
- ⏸️ Session persistence (skipped - requires auth)
- ✅ Protected route access control

#### Phase 3: Quiz Flows (Requires Authentication)
- ⏸️ Quiz creation with category selection (skipped)
- ⏸️ Quiz taking and answering questions (skipped)
- ⏸️ Quiz results display (skipped)
- ⏸️ Answer review and explanations (skipped)
- ⏸️ Study mode with immediate feedback (skipped)

#### Phase 4: Achievements (Requires Authentication)
- ⏸️ Achievement page navigation (skipped)
- ⏸️ Badge display and interaction (skipped)
- ⏸️ Dashboard statistics (skipped)
- ⏸️ Progress tracking (skipped)

#### Phase 5: Accessibility ✅
- ✅ Keyboard navigation (Tab, Enter, Space, Escape)
- ✅ ARIA attributes and semantic HTML
- ✅ Focus indicators and management
- ✅ Screen reader support basics
- ✅ Color contrast and visual accessibility

**Note**: Many tests are marked as `.skip()` because they require:
1. Firebase Authentication with real credentials
2. Test user accounts in Firebase
3. Seeded test data (questions, categories, etc.)

To enable these tests, see [Enabling Authentication Tests](#enabling-authentication-tests) below.

---

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/base';
import { goToLandingPage, verifyHeading } from '../utils/test-helpers';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Navigate to page
    await goToLandingPage(page);
    
    // Perform actions
    const button = page.getByRole('button', { name: /click me/i });
    await button.click();
    
    // Assert results
    await verifyHeading(page, 'Success');
  });
});
```

### Using Helper Functions

The `test-helpers.ts` file provides many reusable utilities:

```typescript
// Navigation
await goToLandingPage(page);
await goToDashboard(page);

// Assertions
await verifyHeading(page, 'Dashboard');
await verifyPageTitle(page, 'CertLab');

// Interactions
await clickButton(page, 'Submit');
await fillFormField(page, 'Email', 'test@example.com');

// Waits
await waitForNavigation(page, '/dashboard');
await waitForToast(page, 'Success');

// Accessibility
await checkBasicAccessibility(page);
await testKeyboardNavigation(page, 5);
```

### Test Data Fixtures

Use the `testData` object from fixtures for consistent test data:

```typescript
import { test, testData } from '../fixtures/base';

test('should create quiz with test data', async ({ page }) => {
  const quizConfig = testData.quizConfig.basic;
  // Use quizConfig.categories, quizConfig.questionCount, etc.
});
```

### Best Practices

1. **Use `test.skip()` for tests requiring special setup**
   ```typescript
   test.skip('should login with OAuth', async ({ page }) => {
     // This test requires Firebase credentials
   });
   ```

2. **Use page object locators**
   ```typescript
   // Good: Use role-based selectors
   const button = page.getByRole('button', { name: /submit/i });
   
   // Good: Use test IDs for dynamic content
   const card = page.locator('[data-testid="quiz-card"]');
   
   // Avoid: Brittle CSS selectors
   // const button = page.locator('.btn.btn-primary');
   ```

3. **Handle timeouts gracefully**
   ```typescript
   const visible = await element.isVisible({ timeout: 3000 }).catch(() => false);
   if (!visible) {
     test.skip(true, 'Element not found - feature may not be available');
   }
   ```

4. **Write defensive tests**
   ```typescript
   // Check if element exists before interacting
   const buttonExists = await button.isVisible({ timeout: 3000 }).catch(() => false);
   if (buttonExists) {
     await button.click();
   } else {
     test.skip(true, 'Button not found');
   }
   ```

---

## CI/CD Integration

### GitHub Actions Workflows

#### E2E Tests Workflow
- **File**: `.github/workflows/e2e-tests.yml`
- **Triggers**: Push to main, pull requests, manual dispatch
- **Steps**:
  1. Install dependencies
  2. Install Playwright browsers
  3. Build application
  4. Start preview server
  5. Run E2E tests
  6. Upload test artifacts

#### Firebase Deploy Workflow
- **File**: `.github/workflows/firebase-deploy.yml`
- **E2E Integration**: E2E tests now block deployment
- **Steps**:
  1. Run unit tests
  2. **Run E2E tests** ⬅️ New requirement
  3. Build and deploy (only if tests pass)

### Test Artifacts

On test failure, the following artifacts are uploaded:
- **playwright-report/**: HTML test report
- **test-results/**: Screenshots, videos, traces

View artifacts in the GitHub Actions run page.

### Environment Variables

E2E tests in CI use the same Firebase configuration as the build:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

---

## Troubleshooting

### Common Issues

#### 1. Tests timeout waiting for server

**Error**: `Timed out waiting 120000ms from config.webServer`

**Solution**: 
- Ensure dev server is running before tests
- Increase timeout in `playwright.config.ts`
- Check server is accessible at configured URL

#### 2. Browser download fails

**Error**: `Download failed: server returned code 403`

**Solution**:
```bash
# Retry browser installation
npx playwright install chromium

# Or install with dependencies
npx playwright install --with-deps chromium
```

#### 3. Tests fail with "Element not found"

**Possible Causes**:
- Page not fully loaded
- Element selector changed
- Feature not available in test environment

**Solution**:
```typescript
// Increase timeout
await element.waitFor({ timeout: 10000 });

// Or check existence before interacting
const exists = await element.isVisible({ timeout: 5000 }).catch(() => false);
if (!exists) {
  test.skip(true, 'Feature not available');
}
```

#### 4. Authentication tests are skipped

**Cause**: Authentication tests require Firebase credentials and test users.

**Solution**: See [Enabling Authentication Tests](#enabling-authentication-tests)

### Debugging Tests

#### Option 1: Headed Mode
```bash
npm run test:e2e:headed
```
Watches tests run in a real browser.

#### Option 2: Debug Mode
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector for step-by-step debugging.

#### Option 3: UI Mode
```bash
npm run test:e2e:ui
```
Interactive UI for exploring tests, time-travel debugging.

#### Option 4: Screenshots and Videos
Tests automatically capture screenshots on failure and videos when retrying. Find them in:
- `test-results/` directory

#### Option 5: Traces
Traces are captured on first retry. View with:
```bash
npx playwright show-trace test-results/path-to-trace.zip
```

### Logs

Enable verbose logging:
```bash
DEBUG=pw:api npx playwright test
```

---

## Enabling Authentication Tests

Many E2E tests are currently skipped because they require Firebase authentication. To enable them:

### Option 1: Firebase Auth Emulator (Recommended for CI)

1. **Start emulator**:
   ```bash
   firebase emulators:start --only auth
   ```

2. **Update tests** to use emulator:
   ```typescript
   // In test setup
   await page.goto('http://localhost:9099'); // Auth emulator UI
   ```

3. **Create test users** programmatically via emulator API

### Option 2: Test Firebase Project

1. **Create test Firebase project**
2. **Create test user accounts**
3. **Set credentials in environment**:
   ```bash
   export TEST_USER_EMAIL="test@example.com"
   export TEST_USER_PASSWORD="test-password"
   ```

4. **Update tests** to use credentials:
   ```typescript
   test('should login', async ({ page }) => {
     await page.goto('/login');
     await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!);
     await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!);
     await page.click('button[type="submit"]');
   });
   ```

### Option 3: Storage State (Session Replay)

1. **Login once manually**
2. **Save auth state**:
   ```bash
   npx playwright codegen --save-storage=auth.json
   ```

3. **Reuse in tests**:
   ```typescript
   test.use({ storageState: 'auth.json' });
   ```

---

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Don't rely on test execution order
- Clean up test data after each test

### 2. Stable Selectors
- Prefer `getByRole()` for accessibility and stability
- Use `data-testid` for complex components
- Avoid CSS class selectors (they change frequently)

### 3. Wait Strategies
```typescript
// ❌ Bad: Arbitrary waits
await page.waitForTimeout(5000);

// ✅ Good: Wait for specific conditions
await page.waitForLoadState('networkidle');
await element.waitFor({ state: 'visible' });
```

### 4. Error Handling
```typescript
// ✅ Good: Handle missing features gracefully
const featureExists = await element.isVisible({ timeout: 3000 }).catch(() => false);
if (!featureExists) {
  test.skip(true, 'Feature not available in this environment');
}
```

### 5. Test Organization
- Group related tests with `test.describe()`
- Use descriptive test names
- Number test files for execution order clarity

### 6. Performance
- Run tests in parallel when possible
- Use `.serial()` for tests that must run sequentially
- Limit retries in CI to avoid long build times

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [CertLab QA Checklist](../QA_CHECKLIST.md)
- [Project Structure](../PROJECT_STRUCTURE.md)

---

## Support

For questions or issues:
1. Check this documentation
2. Review existing test examples
3. Consult [Playwright docs](https://playwright.dev/)
4. Open an issue on GitHub

---

**Last Updated**: January 2026  
**Version**: 2.0.0
