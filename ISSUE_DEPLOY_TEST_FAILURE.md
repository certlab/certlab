# GitHub Issue: Deploy to Firebase Action Fails While PR Checks Pass

## Issue Summary

**Title**: Investigate CI/CD Gap: PR Checks Pass but Firebase Deploy Test Step Fails

**Labels**: `bug`, `ci/cd`, `testing`, `priority: high`

**Description**: 
The repository has a significant gap between what is validated during pull request checks versus what runs during deployment to Firebase. This causes situations where PRs are merged successfully (all checks passing), but the deployment workflow fails at the test step, blocking production deployments.

---

## Problem Statement

### What Happens
1. ✅ Developer creates PR with code changes
2. ✅ All PR checks pass (lint, type-check, e2e-tests)
3. ✅ PR is merged to `main` branch
4. ❌ Firebase deploy workflow fails at the `test` job
5. 🚫 Production deployment is blocked

### Impact
- **Production Deployments Blocked**: When the deploy workflow fails, new features/fixes don't reach users
- **False Confidence**: Passing PR checks give false confidence that code is deployment-ready
- **Developer Frustration**: Issues discovered only after merge require hotfixes or reverts
- **Slower Iteration**: Deploy failures require additional commits to fix, slowing down delivery

---

## Root Cause Analysis

### Current PR Checks (Triggered on `pull_request`)

The following workflows run on PRs:

1. **Lint** (`.github/workflows/lint.yml`)
   - Runs: `npm run lint` (ESLint)
   - Trigger: `push` and `pull_request` to `main`

2. **Type Check** (`.github/workflows/type-check.yml`)
   - Runs: `npm run check` (TypeScript)
   - Trigger: `push` and `pull_request` to `main`

3. **E2E Tests** (`.github/workflows/e2e-tests.yml`)
   - Runs: `npm run test:e2e` (Playwright)
   - Trigger: `push`, `pull_request` to `main`, and `workflow_dispatch`
   - Timeout: 30 minutes
   - Uses standard GitHub Actions timeout mechanism

### Firebase Deploy Workflow (Triggered on `push` to `main`)

The deployment workflow (`.github/workflows/firebase-deploy.yml`) has **three jobs**:

#### Job 1: `test` (Lines 13-74)
- **Runs: `npm run test:run` (Vitest unit tests)**
- ⚠️ **NOT run during PR checks**
- Uses custom timeout handling script:
  - Runs tests as background process
  - Implements 5-minute custom timeout loop
  - Forcibly kills hanging tests with `kill -9`
  - Complex exit code preservation logic
  - Handles race conditions between timeout and process death

#### Job 2: `e2e-tests` (Lines 76-133)
- Runs: `npm run test:e2e` (Playwright)
- Depends on: `test` job passing
- Identical to standalone e2e-tests.yml workflow

#### Job 3: `build-and-deploy` (Lines 135-234)
- Depends on: Both `test` and `e2e-tests` jobs passing
- Additional validations **not in PR checks**:
  - `npm run check` (duplicate type check)
  - `npm run check:firebase` (Firebase config validation)
  - `npm run check:dynatrace` (Dynatrace config validation)
- Build with production environment variables
- Deploy Firestore rules and indexes
- Deploy to Firebase Hosting

---

## Key Discrepancies

### 1. **Unit Tests Only Run During Deployment**

| Test Type | PR Checks | Deploy Workflow |
|-----------|-----------|-----------------|
| Lint | ✅ Yes | ❌ No |
| Type Check | ✅ Yes | ✅ Yes (duplicate) |
| Unit Tests (`npm run test:run`) | ❌ **NO** | ✅ **YES** |
| E2E Tests | ✅ Yes (optional) | ✅ Yes (required) |

**Impact**: Unit test failures are only discovered after merge, when it's too late.

### 2. **Custom Test Timeout Handling**

The deploy workflow uses a **custom bash script** (lines 29-73) to manage test execution:

```bash
npm run test:run &
TEST_PID=$!
# Wait for up to 5 minutes
for i in {1..300}; do
  if ! kill -0 $TEST_PID 2>/dev/null; then
    # Capture exit code
    wait $TEST_PID
    EXIT_CODE=$?
    break
  fi
  sleep 1
done
# Force kill if timed out
if kill -0 $TEST_PID 2>/dev/null; then
  kill -9 $TEST_PID
  exit 1
fi
```

**Why this exists**: Likely implemented to handle hanging tests or race conditions that caused deployment failures.

**Problem**: This hardened timeout mechanism isn't used during PR checks, meaning PR tests could pass while deploy tests time out.

### 3. **Configuration Validation Only in Deploy**

The following validation scripts only run during deployment:
- `npm run check:firebase` - Validates Firebase configuration
- `npm run check:dynatrace` - Validates Dynatrace configuration

**Impact**: Invalid configuration can be merged without detection.

### 4. **Production Environment Variables**

The deploy workflow has access to:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_DYNATRACE_SCRIPT_URL`
- `VITE_ENABLE_DYNATRACE`
- `FIREBASE_SERVICE_ACCOUNT`
- `FIREBASE_PROJECT_ID`

PR checks have limited or no access to these secrets, potentially masking environment-specific failures.

---

## Recommended Solutions

### Option 1: Add Unit Tests to PR Checks (Recommended)

**Create**: `.github/workflows/unit-tests.yml`

```yaml
name: Unit Tests

on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:run
        timeout-minutes: 10
```

**Benefits**:
- Catches test failures before merge
- Uses GitHub Actions timeout (simpler than custom script)
- Runs on every PR
- Minimal complexity

### Option 2: Use Shared Test Job

**Modify**: Extract test job into reusable workflow (`.github/workflows/reusable-test.yml`)

```yaml
name: Reusable Test Job

on:
  workflow_call:
    inputs:
      use-custom-timeout:
        description: 'Use custom timeout script'
        type: boolean
        default: false
```

Then call from both PR checks and deploy workflow.

**Benefits**:
- Single source of truth for test execution
- Can toggle custom timeout behavior
- Easier to maintain

**Drawbacks**:
- More complex workflow structure
- Requires refactoring existing workflows

### Option 3: Add Branch Protection Rule

**Settings** → **Branches** → **Branch protection rules** for `main`:

1. ✅ Require status checks to pass before merging
2. Add required checks:
   - `lint`
   - `type-check`
   - `unit-tests` (new)
   - `e2e-tests`

**Benefits**:
- Enforces all checks must pass
- Prevents merging failing code

**Drawbacks**:
- Requires Option 1 or 2 to be implemented first

### Option 4: Simplify Deploy Test Job

**Replace custom timeout script** with standard GitHub Actions timeout:

```yaml
- name: Run tests
  run: npm run test:run
  timeout-minutes: 10
```

**Benefits**:
- Simpler, more maintainable
- Consistent with other workflows
- Uses platform features

**Drawbacks**:
- Loses custom timeout handling (if needed)
- May not address hanging test scenarios

---

## Investigation Questions

To fully resolve this issue, we need to answer:

1. **Why does the custom timeout script exist?**
   - Was it added to fix a specific hanging test issue?
   - Are there tests that legitimately take >5 minutes?
   - Is the `timeout-minutes: 10` at the step level sufficient?

2. **What specific tests fail in deploy but pass in PR?**
   - Review recent failed deploy runs
   - Identify which tests fail
   - Determine if they're environment-dependent

3. **Are Firebase/Dynatrace configs causing failures?**
   - Do the `check:firebase` and `check:dynatrace` scripts ever fail?
   - Should these run on PRs with dummy/placeholder values?

4. **Is the E2E test duplication necessary?**
   - Deploy workflow runs e2e-tests as a separate job
   - Already runs in e2e-tests.yml workflow
   - Could deploy workflow just depend on e2e-tests.yml completion?

---

## Acceptance Criteria

This issue is resolved when:

- [ ] Unit tests (`npm run test:run`) run on every PR
- [ ] All tests that run during deployment also run during PR checks
- [ ] Deploy workflow `test` job and PR unit test workflow use consistent timeout handling
- [ ] Branch protection rules enforce all checks before merge
- [ ] Documentation updated to explain CI/CD pipeline
- [ ] At least 2 successful PR → merge → deploy cycles with identical check results

---

## Additional Context

### Package.json Test Scripts

```json
"test": "vitest",                                    // Watch mode
"test:run": "vitest run",                           // Run once
"test:integration": "vitest run client/src/test/integration",
"test:unit": "vitest run --exclude 'client/src/test/integration/**'",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test"
```

### Current Test Coverage

- **Unit/Integration Tests**: Vitest (67 tests across 6 files)
- **E2E Tests**: Playwright
- **Test Files**: Located in `client/src/` and `shared/` directories

### Firebase Deploy Workflow Context

- Custom instructions indicate **19 pre-existing TypeScript errors** that don't prevent builds
- Vite uses esbuild which is more lenient than `tsc`
- Deploy workflow runs `npm run check` (type check) but it's not a blocker
- Firebase config validation is critical for production

---

## References

- [Firebase Deploy Workflow](.github/workflows/firebase-deploy.yml)
- [Lint Workflow](.github/workflows/lint.yml)
- [Type Check Workflow](.github/workflows/type-check.yml)
- [E2E Tests Workflow](.github/workflows/e2e-tests.yml)
- [Package.json Test Scripts](package.json)

---

## Priority Justification

**Priority: High**

This issue directly impacts production deployments. Every failed deploy:
1. Blocks new features and bug fixes from reaching users
2. Requires emergency fixes or reverts
3. Erodes confidence in the CI/CD pipeline
4. Wastes developer time investigating deploy-only failures

The fix is straightforward (add unit tests to PR checks) and will prevent future deployment failures.
