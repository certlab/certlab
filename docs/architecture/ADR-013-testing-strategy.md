# ADR-013: Testing Strategy

**Status:** ✅ Accepted  
**Date:** 2024-12-22  
**Deciders:** CertLab Team  
**Context:** Define comprehensive testing strategy including unit, integration, E2E, and accessibility testing.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [Implementation Details](#implementation-details)
- [Consequences](#consequences)
- [Alternatives Considered](#alternatives-considered)
- [Related Documents](#related-documents)
- [Code References](#code-references)
- [Revision History](#revision-history)

---

## Executive Summary

CertLab implements **multi-layered testing** with **Vitest** for unit/integration tests (67 tests), **Playwright** for E2E tests, **Testing Library** for component tests, and **vitest-axe** for accessibility testing.

### Quick Reference

| Aspect | Technology | Purpose |
|--------|-----------|---------|
| **Unit Tests** | Vitest 4.0.14 | Test individual functions/components |
| **Integration Tests** | Vitest + jsdom | Test component integration |
| **E2E Tests** | Playwright 1.58.0 | Test complete user journeys |
| **Component Tests** | @testing-library/react 16.3.2 | Test React components |
| **Accessibility Tests** | vitest-axe 0.1.0 | WCAG compliance checks |
| **Test Environment** | jsdom 27.4.0 | Simulated browser environment |
| **Coverage** | @vitest/coverage-v8 4.0.18 | Code coverage reporting |
| **Mocking** | Vitest built-in | Firebase/Firestore mocks |

**Key Metrics:**
- Unit/Integration tests: 67
- E2E test coverage: 5 critical journeys
- Code coverage target: 60%
- Test execution time: <30s (unit), <2m (E2E)

---

## Context and Problem Statement

CertLab needed a testing strategy that would:

1. **Ensure code quality** with unit tests
2. **Validate integrations** between components
3. **Test user journeys** end-to-end
4. **Verify accessibility** WCAG compliance
5. **Prevent regressions** with automated CI
6. **Mock Firebase** for isolated testing
7. **Provide fast feedback** <30s test runs
8. **Maintain test reliability** minimize flakiness

### Requirements

**Functional Requirements:**
- ✅ Unit tests for utility functions
- ✅ Component tests with React Testing Library
- ✅ Integration tests for data flows
- ✅ E2E tests for critical paths
- ✅ Accessibility tests with axe
- ✅ Firebase mock for offline testing
- ✅ CI/CD integration
- ✅ Coverage reporting

**Non-Functional Requirements:**
- ✅ Unit test execution <30s
- ✅ E2E test execution <2m
- ✅ Code coverage ≥60%
- ✅ Test reliability >95%
- ✅ Parallel test execution

---

## Decision

We adopted a **layered testing pyramid** approach:

### Testing Pyramid

```
          ┌─────────────┐
          │     E2E     │  5 tests (Playwright)
          │  Critical   │  • Authentication
          │  Journeys   │  • Quiz flow
          └─────────────┘  • Achievements
               ▲
               │
          ┌───────────────┐
          │  Integration  │  20 tests (Vitest)
          │     Tests     │  • Component integration
          │               │  • Data flows
          └───────────────┘  • State management
               ▲
               │
          ┌──────────────────┐
          │   Unit Tests     │  47 tests (Vitest)
          │                  │  • Functions
          │                  │  • Utilities
          └──────────────────┘  • Components
```

**Test Distribution:**
- 70% Unit tests (fast, isolated)
- 20% Integration tests (component interaction)
- 10% E2E tests (critical user journeys)

---

## Implementation Details

### 1. Vitest Configuration

**File:** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./client/src/test/setup.ts'],
    include: [
      'client/src/**/*.{test,spec}.{ts,tsx}',
      'shared/**/*.{test,spec}.{ts,tsx}'
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false, // Prevent race conditions
    pool: 'threads',
    minWorkers: 1,
    maxWorkers: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'client/src/**/*.{ts,tsx}',
        'shared/**/*.{ts,tsx}'
      ],
      exclude: [
        'client/src/**/*.test.{ts,tsx}',
        'client/src/test/**',
        'client/src/main.tsx'
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'),
      '@shared': path.resolve(__dirname, 'shared')
    }
  }
});
```

### 2. Test Setup

**File:** `client/src/test/setup.ts`

```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import 'fake-indexeddb/auto';

// Extend Vitest expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### 3. Component Test Example

**File:** `client/src/components/Button.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './ui/button';

describe('Button', () => {
  it('renders button text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('has correct variant classes', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
    
    rerender(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });
});
```

### 4. Integration Test Example

**File:** `client/src/pages/dashboard.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './dashboard';

describe('Dashboard', () => {
  it('displays user stats after loading', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Verify stats are displayed
    expect(screen.getByText(/quizzes completed/i)).toBeInTheDocument();
    expect(screen.getByText(/current level/i)).toBeInTheDocument();
  });
});
```

### 5. Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
        ['junit', { outputFile: 'playwright-report/results.xml' }],
        ['list']
      ]
    : [['html'], ['list']],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  timeout: 60000,
  
  expect: {
    timeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
```

### 6. E2E Test Example

**File:** `e2e/tests/03-quiz-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Quiz Flow', () => {
  test('complete quiz end-to-end', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/app');

    // Start a quiz
    await page.click('text=Start CISSP Quiz');
    
    // Answer first question
    await page.click('input[type="radio"][value="0"]');
    await page.click('button:has-text("Next")');

    // Answer second question
    await page.click('input[type="radio"][value="1"]');
    await page.click('button:has-text("Next")');

    // Finish quiz
    await page.click('button:has-text("Finish Quiz")');

    // Verify results page
    await expect(page.locator('h1')).toContainText('Quiz Results');
    await expect(page.locator('text=/\\d+%/')).toBeVisible();
  });

  test('save quiz progress', async ({ page }) => {
    await page.goto('/app/quiz/1');

    // Answer one question
    await page.click('input[type="radio"][value="0"]');
    await page.click('button:has-text("Next")');

    // Refresh page
    await page.reload();

    // Verify progress saved
    await expect(page.locator('text=/Question 2/')).toBeVisible();
  });
});
```

### 7. Accessibility Test Example

**File:** `client/src/components/Button.test.tsx`

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
import { Button } from './ui/button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct ARIA label when icon-only', async () => {
    const { container } = render(
      <Button aria-label="Close">
        <XIcon />
      </Button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 8. CI/CD Test Integration

**File:** `.github/workflows/firebase-deploy.yml`

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:run
      
  e2e-tests:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run preview &
      - run: npx wait-on http://localhost:4173
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v6
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Consequences

### Positive

1. **High Confidence** - Multi-layer testing catches issues early
2. **Fast Feedback** - Unit tests run in <30s
3. **Regression Prevention** - Automated tests in CI
4. **Accessibility** - Built-in WCAG compliance checks
5. **Maintainability** - Tests document expected behavior
6. **Reliability** - Mock Firebase for consistent tests

### Negative

1. **Test Maintenance** - 67+ tests to maintain
2. **Slow E2E** - Playwright tests take 1-2 minutes
3. **Flakiness** - E2E tests can be flaky

### Mitigations

1. Delete obsolete tests regularly
2. Run E2E tests in parallel where possible
3. Add retry logic and explicit waits

---

## Alternatives Considered

### Alternative 1: Jest Instead of Vitest

Use Jest for unit testing.

**Pros:** Mature, widely used  
**Cons:** Slower, ESM issues, separate config

**Reason for Rejection:** Vitest is faster and better integrated with Vite.

### Alternative 2: Cypress Instead of Playwright

Use Cypress for E2E testing.

**Pros:** Better DX, time-travel debugging  
**Cons:** Slower, no multi-browser, no auto-waiting

**Reason for Rejection:** Playwright is faster and more reliable.

### Alternative 3: No E2E Tests

Skip E2E tests, use only unit/integration.

**Pros:** Faster CI, less maintenance  
**Cons:** Miss critical user journey bugs

**Reason for Rejection:** E2E tests catch integration issues unit tests miss.

---

## Related Documents

- [ADR-005: Frontend Technology Stack](ADR-005-frontend-technology-stack.md)
- [ADR-006: Component Architecture](ADR-006-component-architecture.md)

---

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `vitest.config.ts` | 1-59 | Vitest configuration |
| `playwright.config.ts` | 1-109 | Playwright configuration |
| `client/src/test/setup.ts` | 1-50 | Test setup and mocks |
| `e2e/tests/*.spec.ts` | - | E2E test suites |

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2024-12-22 | 1.0 | CertLab Team | Initial version - testing strategy |
