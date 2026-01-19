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
    ├── 03-quiz-flow.spec.ts       # Quiz tests
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

## Documentation

See [docs/E2E_TESTING.md](../docs/E2E_TESTING.md) for comprehensive documentation including:
- Test writing guide
- Troubleshooting
- CI/CD integration
- Best practices
- Enabling authentication tests

## Test Coverage

Current test coverage includes:
- ✅ Landing page and navigation
- ✅ Theme switching
- ✅ Accessibility and keyboard navigation
- ⏸️ Authentication (requires Firebase setup)
- ⏸️ Quiz flows (requires authentication)
- ⏸️ Achievements (requires authentication)

Many tests are skipped by default because they require Firebase authentication. See the documentation for details on enabling these tests.

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
Ensure the dev server is running:
```bash
npm run dev
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

For more help, see [docs/E2E_TESTING.md](../docs/E2E_TESTING.md)
