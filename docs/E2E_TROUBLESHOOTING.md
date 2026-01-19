# E2E Test Troubleshooting Guide

This guide provides step-by-step troubleshooting for common E2E test issues encountered in CertLab's Playwright test suite.

## Quick Reference

### Common Commands
```bash
# Run tests
npm run test:e2e                 # Headless mode
npm run test:e2e:headed          # Watch tests run
npm run test:e2e:ui              # Interactive UI mode
npm run test:e2e:debug           # Step-by-step debugging

# View reports
npm run test:e2e:report          # Open HTML report

# Generate tests
npm run test:e2e:codegen         # Record new tests
```

### Test Locations
- **Tests**: `e2e/tests/*.spec.ts`
- **Helpers**: `e2e/utils/test-helpers.ts`
- **Fixtures**: `e2e/fixtures/base.ts`
- **Config**: `playwright.config.ts`
- **Reports**: `playwright-report/`
- **Results**: `test-results/`

---

## Issue Categories

### 1. Server Not Running

**Symptom**: Tests fail with connection refused or timeout errors

**Error Examples**:
```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Timed out waiting for http://localhost:5173
```

**Solutions**:

#### Option A: Start Dev Server Manually
```bash
# Terminal 1
npm run dev

# Terminal 2 (wait for server to start)
npm run test:e2e
```

#### Option B: Use Production Build
```bash
# Build application
npm run build

# Start preview server
npm run preview

# Run tests (in another terminal)
npm run test:e2e
```

#### Option C: Enable Auto-Start (Local Only)
Uncomment `webServer` in `playwright.config.ts`:
```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:5173',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,
},
```

---

### 2. Browser Not Installed

**Symptom**: Tests fail with "Executable doesn't exist" error

**Error Example**:
```
browserType.launch: Executable doesn't exist at /home/user/.cache/ms-playwright/chromium-1200/chrome-linux/chrome
```

**Solution**:
```bash
# Install browsers
npx playwright install chromium

# Or install with all dependencies
npx playwright install --with-deps chromium

# Verify installation
npx playwright --version
```

---

### 3. Authentication Tests Skipped

**Symptom**: Most tests show as "skipped" in results

**Reason**: Tests require Firebase Authentication with real credentials

**Solutions**:

#### Option A: Firebase Auth Emulator (Recommended)
```bash
# Install Firebase tools if not already installed
npm install -g firebase-tools

# Start emulator
firebase emulators:start --only auth

# Update tests to use emulator endpoints
# See docs/E2E_TESTING.md for details
```

#### Option B: Test Firebase Project
1. Create a test Firebase project
2. Create test user accounts
3. Set environment variables:
   ```bash
   export TEST_USER_EMAIL="test@example.com"
   export TEST_USER_PASSWORD="test-password"
   ```
4. Remove `.skip()` from auth tests
5. Add login logic using test credentials

#### Option C: Storage State (Session Replay)
```bash
# Login manually once
npx playwright codegen http://localhost:5173 --save-storage=auth.json

# Use in tests
test.use({ storageState: 'auth.json' });
```

---

### 4. Element Not Found

**Symptom**: Tests fail with timeout waiting for element

**Error Example**:
```
Error: locator.click: Timeout 30000ms exceeded.
waiting for locator('button[name="Submit"]')
```

**Debugging Steps**:

1. **Verify element exists**:
   ```bash
   npm run test:e2e:debug
   # Or use headed mode
   npm run test:e2e:headed
   ```

2. **Check selector**:
   ```typescript
   // Try different selectors
   page.getByRole('button', { name: /submit/i })  // Role + text
   page.getByTestId('submit-button')              // Test ID
   page.locator('button:has-text("Submit")')      // CSS + text
   ```

3. **Increase timeout**:
   ```typescript
   await button.click({ timeout: 10000 });
   ```

4. **Wait for page load**:
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForLoadState('domcontentloaded');
   ```

5. **Check if feature exists**:
   ```typescript
   const visible = await button.isVisible({ timeout: 5000 }).catch(() => false);
   if (!visible) {
     test.skip(true, 'Feature not available');
   }
   ```

---

### 5. Flaky Tests

**Symptom**: Tests pass sometimes but fail intermittently

**Common Causes & Solutions**:

#### Race Conditions
```typescript
// ❌ Bad: No wait
await button.click();
expect(result).toBeVisible();

// ✅ Good: Wait for condition
await button.click();
await expect(result).toBeVisible({ timeout: 10000 });
```

#### Network Timing
```typescript
// ✅ Wait for network to settle
await page.waitForLoadState('networkidle');

// ✅ Wait for specific request
await page.waitForResponse(resp => resp.url().includes('/api/'));
```

#### Animation/Transitions
```typescript
// ✅ Wait after animations
await button.click();
await page.waitForTimeout(500);  // Last resort only
```

---

### 6. Tests Pass Locally But Fail in CI

**Common Causes**:

#### Different Screen Size
```typescript
// Set consistent viewport in test
test.use({ viewport: { width: 1280, height: 720 } });
```

#### Missing Environment Variables
Check GitHub Actions secrets are configured:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- etc.

#### Timing Differences
```typescript
// Increase timeouts for CI
const timeout = process.env.CI ? 10000 : 5000;
await element.waitFor({ timeout });
```

#### Missing Dependencies
```bash
# Use --with-deps in CI
npx playwright install --with-deps chromium
```

---

### 7. Screenshot/Video Not Captured

**Check Configuration**:
```typescript
// In playwright.config.ts
use: {
  screenshot: 'only-on-failure',  // or 'on'
  video: 'retain-on-failure',     // or 'on'
  trace: 'on-first-retry',        // or 'on'
}
```

**Manual Screenshot**:
```typescript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

**View Artifacts**:
- Local: `playwright-report/`, `test-results/`
- CI: Check GitHub Actions artifacts tab

---

### 8. TypeScript Errors

**Error**: Property does not exist on type

**Solutions**:

1. **Install types**:
   ```bash
   npm install -D @types/node
   ```

2. **Update tsconfig**:
   ```json
   {
     "include": ["e2e/**/*"]
   }
   ```

3. **Explicit typing**:
   ```typescript
   import type { Page, Locator } from '@playwright/test';
   ```

---

### 9. Test Runs Forever

**Causes**:
- Infinite wait
- Modal not closed
- Navigation blocked

**Solutions**:

1. **Add global timeout**:
   ```typescript
   test.setTimeout(60000);  // 1 minute
   ```

2. **Check for modals**:
   ```typescript
   // Press Escape to close any modal
   await page.keyboard.press('Escape');
   ```

3. **Force navigation**:
   ```typescript
   await page.goto('/path', { waitUntil: 'domcontentloaded' });
   ```

---

### 10. Memory Issues

**Symptom**: Tests crash with out-of-memory errors

**Solutions**:

1. **Run fewer workers**:
   ```bash
   npx playwright test --workers=1
   ```

2. **Close browser contexts**:
   ```typescript
   test.afterEach(async ({ page }) => {
     await page.close();
   });
   ```

3. **Limit retries**:
   ```typescript
   // In playwright.config.ts
   retries: process.env.CI ? 2 : 0,
   ```

---

## Debugging Workflow

### Step-by-Step Debugging Process

1. **Reproduce Locally**:
   ```bash
   npm run test:e2e:headed
   ```

2. **Enable Debug Mode**:
   ```bash
   npm run test:e2e:debug
   ```

3. **Check Page State**:
   ```bash
   npm run test:e2e:ui
   ```

4. **Add Console Logs**:
   ```typescript
   console.log('Current URL:', page.url());
   console.log('Page title:', await page.title());
   ```

5. **Inspect Element**:
   ```typescript
   const element = page.locator('button');
   console.log('Visible:', await element.isVisible());
   console.log('Count:', await element.count());
   ```

6. **Take Screenshot**:
   ```typescript
   await page.screenshot({ path: 'debug.png', fullPage: true });
   ```

7. **View Trace**:
   ```bash
   npx playwright show-trace test-results/trace.zip
   ```

---

## Environment-Specific Issues

### CI/CD (GitHub Actions)

**Issue**: Tests work locally but fail in GitHub Actions

**Checklist**:
- [ ] All secrets configured in GitHub repository settings
- [ ] Browser installed with `--with-deps`
- [ ] Server started before tests
- [ ] Correct base URL set (`PLAYWRIGHT_BASE_URL`)
- [ ] Sufficient timeout values
- [ ] Artifacts uploaded on failure

### Docker

**Issue**: Tests fail in Docker container

**Solutions**:
1. **Install dependencies**:
   ```dockerfile
   RUN npx playwright install-deps
   RUN npx playwright install chromium
   ```

2. **Use headless mode** (default in config)

3. **Set display** if needed:
   ```dockerfile
   ENV DISPLAY=:99
   ```

### WSL/Linux

**Issue**: Browser won't start

**Solution**:
```bash
# Install system dependencies
npx playwright install-deps

# Or manually
sudo apt-get update
sudo apt-get install -y \
  libnss3 libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0
```

---

## Getting Help

### Before Asking

1. ✅ Check this troubleshooting guide
2. ✅ Review [docs/E2E_TESTING.md](E2E_TESTING.md)
3. ✅ Check [Playwright documentation](https://playwright.dev/)
4. ✅ Search existing GitHub issues

### When Reporting Issues

Include:
- Test file and line number
- Full error message
- Playwright version (`npx playwright --version`)
- Node version (`node --version`)
- Operating system
- Steps to reproduce
- Screenshots/videos if available

### Useful Links

- [Playwright Docs](https://playwright.dev/)
- [Playwright Discord](https://discord.com/invite/playwright-807756831384403968)
- [CertLab Issues](https://github.com/archubbuck/certlab/issues)

---

## Quick Fixes Reference

| Issue | Quick Fix |
|-------|-----------|
| Server not running | `npm run dev` in separate terminal |
| Browser not installed | `npx playwright install chromium` |
| Element not found | Increase timeout or use different selector |
| Flaky test | Add explicit waits, remove timeouts |
| Auth tests skipped | See "Authentication Tests Skipped" section |
| Test hangs | Add `test.setTimeout(60000)` |
| Memory error | Run with `--workers=1` |
| Type error | Add `@types/node`, check tsconfig |
| Screenshot missing | Check `playwright.config.ts` settings |
| CI failure | Check secrets, browser deps, timeouts |

---

**Last Updated**: January 2026  
**Version**: 2.0.0
