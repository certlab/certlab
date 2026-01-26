# E2E Tests

End-to-end tests for CertLab using Playwright.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install chromium

# Run tests
npm run test:e2e
```

## Structure

```
e2e/
├── fixtures/          # Custom test fixtures and test data
├── utils/             # Helper functions and utilities
└── tests/             # Test files
    ├── 01-landing.spec.ts        # Landing page tests
    ├── 02-authentication.spec.ts  # Auth flow tests
    ├── 03-quiz-flow.spec.ts       # Quiz tests (partially enabled)
    ├── 04-achievements.spec.ts    # Gamification tests
    └── 05-accessibility.spec.ts   # Accessibility tests
```

## Available Commands

```bash
npm run test:e2e           # Run all tests (headless)
npm run test:e2e:headed    # Run with visible browser
npm run test:e2e:ui        # Interactive UI mode
npm run test:e2e:debug     # Debug mode with Playwright Inspector
npm run test:e2e:report    # View test report
npm run test:e2e:codegen   # Generate tests interactively
```

## Test Coverage

Current test coverage includes:
- ✅ Landing page and navigation
- ✅ Theme switching
- ✅ Accessibility and keyboard navigation
- ⏸️ Authentication (requires Firebase setup)
- ✅ Quiz creation flows (enabled, require Firebase auth + data)
- ⏸️ Quiz taking flows (TODO: require programmatic quiz creation)
- ⏸️ Quiz results/review flows (TODO: require programmatic quiz completion)
- ✅ Achievements and gamification (newly unskipped, most tests enabled)

### Achievements Tests Status (04-achievements.spec.ts)

The achievement and gamification tests have been **unskipped** with mock authentication support:

**✅ Enabled:**
- `should navigate to achievements page` - Tests navigation to achievements
- `should display earned badges` - Verifies badge display structure
- `should show badge details on hover or click` - Tests badge interactions
- `should display streak information` - Checks streak display on dashboard
- `should display total quizzes taken` - Verifies quiz statistics
- `should display average score` - Tests score display
- `should display level/XP progress` - Checks gamification progress
- `should display recent activity` - Verifies activity feed
- `should display category-specific progress` - Tests category progress
- `should show mastery scores` - Checks mastery indicators
- `should display challenges` - Verifies daily challenges page
- `should allow completing daily challenge` - Tests challenge interactions

**⏸️ Skipped:**
- `should show notification when earning first badge` - Requires complex quiz completion
- `should display leaderboard` - Feature may not be fully implemented

### Quiz Flow Tests Status

The quiz flow tests (03-quiz-flow.spec.ts) have been partially enabled:

**✅ Enabled (with graceful skipping):**
- `should create a basic quiz` - Tests quiz creation with single category
- `should create a multi-category quiz` - Tests quiz creation with multiple categories

**⏸️ Skipped (TODO - require implementation):**
- `should answer questions in a quiz` - Needs programmatic quiz creation
- `should display progress indicator` - Needs programmatic quiz creation  
- `should allow flagging questions for review` - Needs programmatic quiz creation
- `should navigate between questions` - Needs programmatic quiz creation
- `should display results after quiz completion` - Needs programmatic quiz completion
- `should allow reviewing answers` - Needs programmatic quiz completion
- `should show correct and incorrect answers in review` - Needs programmatic quiz completion
- `should display explanations in review` - Needs programmatic quiz completion
- `should show immediate feedback in study mode` - Needs programmatic quiz setup

## Running Quiz Tests

Quiz tests require Firebase authentication and seeded data.

## Mock Authentication for E2E Tests

Tests that require authentication use a mock authentication system that seeds sessionStorage:

```typescript
test('my protected route test', async ({ authenticatedPage: page }) => {
  // authenticatedPage automatically sets up mock auth in sessionStorage
  await page.goto('/app/dashboard');
  // User is authenticated as test@certlab.app with id 'test-user-123'
});
```

The `authenticatedPage` fixture:
- Sets up mock user data in sessionStorage using `addInitScript` (before page load)
- Seeds optimistic cache that mimics the app's auth-provider pattern
- **Requires Firebase/Firestore to be configured** - mock auth alone does NOT provide authenticated access
- App's AuthProvider treats firebaseUser as source of truth and will clear cache when Firebase reports null
- Tests should check for redirect and skip gracefully when Firebase is not available

**Important**: Firebase/Firestore configuration is still required. Mock auth only seeds sessionStorage cache on top of Firebase - it does not replace Firebase Auth or Firestore storage.

### In CI
Tests run automatically with Firebase credentials from GitHub secrets. CI environment should have test data seeded in Firestore.

### Locally

#### Option 1: Firebase Emulator (Recommended)
```bash
# Start Firebase emulators
npm run emulators:start

# In another terminal, build and preview
npm run build && npm run preview

# Run tests
npm run test:e2e
```

#### Option 2: Real Firebase Project
1. Configure Firebase credentials in `.env`
2. Ensure your Firebase project has test data:
   - Categories (CISSP, CISM, etc.)
   - Questions (at least 10 per category)
3. Build and test:
   ```bash
   npm run build && npm run preview
   npm run test:e2e
   ```

#### Graceful Skipping
Tests will skip gracefully when:
- User is not authenticated (redirected to landing page)
- Quiz creation buttons not found (missing UI or data)
- Categories not available (Firebase data not seeded)

Check console output for skip reasons.

## Writing Tests

```typescript
import { test, expect } from '../fixtures/base';
import { goToLandingPage } from '../utils/test-helpers';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await goToLandingPage(page);
    
    const button = page.getByRole('button', { name: /click me/i });
    await button.click();
    
    await expect(page).toHaveTitle(/success/i);
  });
});
```

## Troubleshooting

### Tests timeout
Ensure the preview server is running:
```bash
npm run build && npm run preview
```

### Browser download fails
Reinstall browsers:
```bash
npx playwright install chromium --force
```

### Element not found
Increase timeout or check if feature is available:
```typescript
const visible = await element.isVisible({ timeout: 5000 }).catch(() => false);
if (!visible) test.skip(true, 'Feature not available');
```

### Quiz tests skip
Quiz tests skip when:
1. Not authenticated - check Firebase auth configuration
2. No quiz data - ensure Firebase has seeded categories/questions
3. Missing UI elements - verify app built correctly

Refer to test console output for specific skip reasons and troubleshooting guidance.
