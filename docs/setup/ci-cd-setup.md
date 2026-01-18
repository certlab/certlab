# CI/CD Setup Guide

This guide explains how to configure the CI/CD pipeline and branch protection rules for CertLab.

## Overview

CertLab uses GitHub Actions for continuous integration and deployment with the following workflows:

- **test.yml**: Runs tests and generates coverage reports on all PRs to main
- **type-check.yml**: Validates TypeScript types on all PRs and pushes to main
- **lint.yml**: Checks code style and formatting on all PRs and pushes to main
- **firebase-deploy.yml**: Runs tests and deploys to Firebase Hosting when code is pushed to main

**Note**: On main branch pushes, firebase-deploy.yml runs tests before deployment. The separate test.yml workflow only runs on PRs to avoid duplicate test execution.

## Branch Protection Rules

To enforce quality gates and prevent broken code from reaching production, branch protection rules must be configured for the `main` branch.

### Setting Up Branch Protection

1. **Navigate to Branch Protection Settings**
   - Go to your repository on GitHub
   - Click **Settings** → **Branches**
   - Click **Add branch protection rule** (or edit existing rule for `main`)

2. **Configure Branch Name Pattern**
   - Branch name pattern: `main`

3. **Enable Required Status Checks**
   - ✅ Check **Require status checks to pass before merging**
   - ✅ Check **Require branches to be up to date before merging**
   - Select the following status checks as required:
     - `test` (from test.yml workflow)
     - `type-check` (from type-check.yml workflow)
     - `lint` (from lint.yml workflow)

4. **Enable Pull Request Reviews**
   - ✅ Check **Require a pull request before merging**
   - ✅ Check **Require approvals**: Set to **1**
   - ✅ Check **Dismiss stale pull request approvals when new commits are pushed**

5. **Additional Recommended Settings**
   - ✅ Check **Require conversation resolution before merging**
   - ✅ Check **Do not allow bypassing the above settings**
   - ⚠️ Leave **Allow force pushes** unchecked
   - ⚠️ Leave **Allow deletions** unchecked

6. **Save Changes**
   - Click **Create** or **Save changes** at the bottom

## Workflow Status Checks

### Test Workflow (test.yml)

**Status Check Name**: `test`

**Runs on**: Pull requests to main

This workflow:
- Runs all unit, integration, and component tests
- Generates code coverage reports
- Uploads coverage and test results as artifacts
- Fails if any tests fail or coverage drops below thresholds

**Coverage Thresholds**:
- Lines: 60%
- Functions: 60%
- Branches: 60%
- Statements: 60%

**Note**: On main branch pushes, tests are run by the firebase-deploy.yml workflow instead to avoid duplication.

### Type Check Workflow (type-check.yml)

**Status Check Name**: `type-check`

This workflow:
- Runs TypeScript compiler in check mode
- Validates all type annotations
- Fails if there are type errors

### Lint Workflow (lint.yml)

**Status Check Name**: `lint`

This workflow:
- Runs ESLint on all TypeScript/JavaScript files
- Checks code style and formatting
- Fails if there are linting errors

### Firebase Deploy Workflow (firebase-deploy.yml)

**Runs on**: Push to main branch only

This workflow:
1. **Runs all tests first** (blocks deployment if tests fail)
2. Validates TypeScript types
3. Validates Firebase configuration
4. Builds the application
5. Deploys to Firebase Hosting
6. Uploads test results and coverage as artifacts

**Important**: This workflow includes test execution to ensure deployments are blocked by test failures. The separate test.yml workflow only runs on PRs to avoid duplicate test runs.

## Testing Branch Protection

After setting up branch protection rules, test them by:

1. **Create a test branch**:
   ```bash
   git checkout -b test/branch-protection
   ```

2. **Make a change and push**:
   ```bash
   echo "# Test" >> test.md
   git add test.md
   git commit -m "test: verify branch protection"
   git push origin test/branch-protection
   ```

3. **Create a PR**:
   - Go to GitHub and create a pull request
   - Verify that status checks appear and must pass
   - Verify that you cannot merge until:
     - All status checks pass
     - At least one approval is received

4. **Clean up**:
   ```bash
   git checkout main
   git branch -D test/branch-protection
   git push origin --delete test/branch-protection
   ```

## Troubleshooting

### Status Checks Not Appearing

If status checks don't appear on your PR:

1. **Check workflow files exist**:
   - Verify `.github/workflows/test.yml` exists
   - Verify `.github/workflows/type-check.yml` exists
   - Verify `.github/workflows/lint.yml` exists

2. **Check workflow syntax**:
   ```bash
   # Validate workflow syntax locally
   npm install -g @action-validator/cli
   action-validator .github/workflows/*.yml
   ```

3. **Check branch names**:
   - Workflows must target your branch (usually `main` and all PRs)
   - Check the `on:` section in each workflow file

4. **Check GitHub Actions permissions**:
   - Go to **Settings** → **Actions** → **General**
   - Ensure **Actions permissions** is set to "Allow all actions and reusable workflows"

### Tests Failing in CI but Pass Locally

1. **Ensure dependencies are up to date**:
   ```bash
   npm ci  # Clean install matches package-lock.json exactly
   ```

2. **Check for environment differences**:
   - CI uses Node.js 20 (verify locally with `node --version`)
   - CI uses npm 10 (verify locally with `npm --version`)

3. **Review CI logs**:
   - Go to the **Actions** tab on GitHub
   - Click on the failing workflow run
   - Review logs for specific error messages

### Deployment Failing

1. **Check Firebase configuration**:
   - Verify Firebase service account secret is set
   - Verify Firebase project ID is correct
   - Verify all required secrets are configured

2. **Check test results**:
   - Deployment only runs if tests pass
   - Check test workflow logs for failures

3. **Review build logs**:
   - Check the **Build** step in firebase-deploy.yml logs
   - Verify build completes successfully

## Artifacts

After each CI run, the following artifacts are available for download:

### Test Workflow Artifacts

- **coverage-reports**: HTML, JSON, and text coverage reports
- **test-results**: JSON file with detailed test execution results

### Firebase Deploy Workflow Artifacts

- **coverage-reports-deploy**: Coverage reports from deployment test run
- **test-results-deploy**: Test results from deployment test run

**To download artifacts**:
1. Go to the **Actions** tab on GitHub
2. Click on a completed workflow run
3. Scroll down to the **Artifacts** section
4. Click on an artifact name to download

Artifacts are retained for 30 days.

## Updating Status Checks

If you add new workflows or change workflow names:

1. **Update the workflows** in `.github/workflows/`
2. **Update branch protection rules**:
   - Go to **Settings** → **Branches**
   - Edit the rule for `main`
   - Update required status checks to include new workflow names
3. **Update CONTRIBUTING.md** to document new checks

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Firebase GitHub Actions](https://github.com/FirebaseExtended/action-hosting-deploy)
- [Vitest Documentation](https://vitest.dev/)
