# Investigation Summary: CI/CD Deploy Test Failures

**Date**: 2026-02-09  
**Issue**: Why checks pass when merging changes, but test step in Firebase deploy action fails

---

## What Was Done

This investigation analyzed the CertLab CI/CD pipeline to identify discrepancies between pull request checks and the Firebase deployment workflow that cause successful PR merges followed by deployment failures.

### Files Created

1. **ISSUE_DEPLOY_TEST_FAILURE.md** - Comprehensive GitHub issue document
   - Complete problem analysis
   - Root cause identification
   - Four solution options
   - Acceptance criteria
   - Ready to be used as a GitHub issue template or converted to an actual issue

---

## Key Findings

### The Core Problem

**PR Checks (pull_request events):**
- ✅ Lint (ESLint)
- ✅ Type Check (TypeScript)
- ✅ E2E Tests (Playwright) - optional

**Deploy Workflow (push to main):**
- ✅ **Unit Tests** (`npm run test:run`) ← **NOT IN PR CHECKS**
- ✅ E2E Tests (Playwright)
- ✅ Type Check (duplicate)
- ✅ Firebase Config Validation
- ✅ Dynatrace Config Validation
- ✅ Build & Deploy

### Why Deploy Fails When PRs Pass

1. **Unit tests only run during deployment** - The most critical gap
   - 67 tests across 6 files run only after merge
   - Test failures discovered too late

2. **Custom timeout handling in deploy** - Deploy uses a hardened bash script
   - 5-minute timeout with forced termination
   - Complex exit code handling
   - Not present in PR checks

3. **Configuration validation** - Deploy validates Firebase and Dynatrace configs
   - `npm run check:firebase`
   - `npm run check:dynatrace`
   - Not run during PR checks

4. **Environment secrets** - Deploy has production credentials
   - Firebase configuration
   - Dynatrace monitoring
   - PRs have limited access

---

## Recommended Solution

### Primary Recommendation: Add Unit Tests to PR Checks

Create a new workflow file: `.github/workflows/unit-tests.yml`

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
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:run
        timeout-minutes: 10
```

**Then**: Update branch protection rules to require the `unit-tests` check before merging.

### Benefits
- ✅ Catches test failures before merge
- ✅ Prevents broken code from reaching main
- ✅ Uses standard GitHub Actions timeout
- ✅ Minimal complexity
- ✅ Consistent with existing workflow patterns

---

## Alternative Solutions

The issue document provides three additional options:

1. **Shared reusable workflow** - Extract test job into reusable workflow
2. **Branch protection rules** - Enforce checks (requires unit tests workflow first)
3. **Simplify deploy timeout** - Remove custom script, use standard timeout

---

## Investigation Questions

The issue document identifies several questions that need answers:

1. Why does the custom timeout script exist? (Historical context needed)
2. What specific tests fail in deploy but pass in PR? (Review recent runs)
3. Are Firebase/Dynatrace config checks causing failures? (Log analysis)
4. Is E2E test duplication necessary? (Could depend on e2e-tests.yml)

---

## Next Steps

### Immediate Actions

1. **Review the issue document** - Read ISSUE_DEPLOY_TEST_FAILURE.md
2. **Create GitHub issue** - Use the document content to create an actual issue
3. **Implement unit tests workflow** - Add `.github/workflows/unit-tests.yml`
4. **Update branch protection** - Require unit-tests check before merge
5. **Test the fix** - Verify a full PR → merge → deploy cycle

### Long-term Improvements

1. **Document CI/CD pipeline** - Add docs/ci-cd-pipeline.md
2. **Standardize timeout handling** - Decide on custom vs standard timeouts
3. **Consolidate duplicate checks** - Type check runs in both PR and deploy
4. **Review test execution time** - Understand why custom timeout was needed

---

## Impact

### Current State
- ❌ False confidence in PR checks
- ❌ Deployments blocked by post-merge failures
- ❌ Developer time wasted on hotfixes/reverts
- ❌ Slower iteration cycles

### After Fix
- ✅ All tests run before merge
- ✅ Deployment failures prevented
- ✅ Faster, more confident development
- ✅ Reduced emergency fixes

---

## Files Reference

- **Issue Document**: `ISSUE_DEPLOY_TEST_FAILURE.md`
- **Workflows**: `.github/workflows/`
  - `firebase-deploy.yml` - Deploy workflow with test job
  - `lint.yml` - PR lint checks
  - `type-check.yml` - PR type checks
  - `e2e-tests.yml` - E2E test workflow
- **Package Scripts**: `package.json`
  - `test:run` - Unit tests (Vitest)
  - `test:e2e` - E2E tests (Playwright)

---

## Conclusion

The root cause is clear: **unit tests are not part of PR checks**. The solution is straightforward: add a unit-tests workflow that runs on pull requests.

The detailed issue document (ISSUE_DEPLOY_TEST_FAILURE.md) provides everything needed to:
- Understand the problem completely
- Choose the best solution approach
- Implement the fix
- Verify the results

**Priority**: High - This directly impacts production deployments and developer productivity.
