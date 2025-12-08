# Dependabot Auto-Merge Setup

This document describes the Dependabot integration and automated merge configuration for CertLab.

## Overview

CertLab uses GitHub's Dependabot with automated PR merging to reduce manual dependency management overhead while maintaining security and stability.

## Features

### 1. Dependency Grouping

Dependencies are automatically grouped to reduce PR noise:

| Group | Description | Packages |
|-------|-------------|----------|
| **radix** | Radix UI components | `@radix-ui/*` |
| **testing** | Test frameworks and utilities | `@testing-library/*`, `vitest`, `@vitest/*`, `jsdom` |
| **typescript** | TypeScript and type definitions | `typescript`, `@types/*`, `@typescript-eslint/*` |
| **build-tools** | Build tooling | `vite`, `@vitejs/*`, `esbuild`, `tsx` |
| **react** | React ecosystem | `react`, `react-dom`, `react-*` |
| **linting** | Code quality tools | `eslint`, `eslint-*`, `@eslint/*`, `prettier`, `lint-staged` |
| **styling** | CSS and styling tools | `tailwindcss`, `@tailwindcss/*`, `tailwind-*`, `postcss`, `autoprefixer` |
| **firebase** | Firebase SDK | `firebase`, `firebase-*` |

**Benefits:**
- Reduces number of open PRs from ~20-30 to ~8-10 per week
- Easier to review related changes together
- Less notification noise

### 2. Automated Merge Policy

The auto-merge workflow (`dependabot-auto-merge.yml`) automatically merges safe updates:

#### ✅ Auto-Merged Updates

| Update Type | Scope | Example | Rationale |
|-------------|-------|---------|-----------|
| **Patch** | All dependencies | `1.0.0` → `1.0.1` | Bug fixes, security patches |
| **Minor** | devDependencies only | `1.0.0` → `1.1.0` | Non-breaking features in dev tools |

**Requirements:**
- All CI checks must pass:
  - ✓ Linting (`npm run lint`)
  - ✓ Type checking (`npm run check`)
  - ✓ Build (`npm run build:firebase`)

#### 🚨 Manual Review Required

| Update Type | Scope | Example | Reason |
|-------------|-------|---------|--------|
| **Major** | All dependencies | `1.0.0` → `2.0.0` | Breaking changes possible |
| **Minor** | Production dependencies | `1.0.0` → `1.1.0` | New features in runtime deps |

Major version PRs receive an automated comment:
> 🚨 **Major version update detected.** This PR requires manual review before merging to ensure compatibility.

### 3. Schedule

- **Frequency**: Weekly
- **Day**: Monday at 00:00 UTC
- **Max Open PRs**: 10 for npm, 5 for GitHub Actions

## How It Works

```mermaid
graph TD
    A[Dependabot opens PR] --> B{Check Actor}
    B -->|dependabot[bot]| C[Fetch Metadata]
    B -->|Other| Z[Skip]
    C --> D{Update Type?}
    D -->|Patch| E[Enable Auto-Merge]
    D -->|Minor + DevDep| E
    D -->|Minor + ProdDep| F[Comment: Manual Review]
    D -->|Major| G[Comment: Major Update]
    E --> H[Approve PR]
    H --> I{CI Checks Pass?}
    I -->|Yes| J[Auto-Merge]
    I -->|No| K[Wait/Block]
```

## Workflow Files

### `.github/dependabot.yml`
Configures Dependabot:
- Update schedule
- Dependency grouping rules
- PR limits and labels

### `.github/workflows/dependabot-auto-merge.yml`
Handles automated merging:
- Uses `dependabot/fetch-metadata@v2` to analyze updates
- Enables auto-merge for safe updates
- Auto-approves PRs to meet approval requirements
- Comments on PRs requiring manual review

## Safety Measures

1. **Conservative Policy**: Only patches and dev-only minors are auto-merged
2. **CI Gate**: All status checks must pass before merge
3. **Grouped Updates**: Related packages updated together for compatibility
4. **Manual Override**: Maintainers can always close or modify PRs
5. **Audit Trail**: All merges logged in PR history with approval
6. **Selective Auto-Approval**: Only safe updates (patches and dev-only minors) are auto-approved; production dependency minors and all major updates require manual review

## Branch Protection (Optional)

To enhance security, you can configure branch protection rules:

1. Go to: Settings → Branches → Add branch protection rule
2. Pattern: `main` (or your default branch)
3. Enable: **Require status checks to pass before merging**
4. Select required checks:
   - `lint` (from lint.yml workflow)
   - `build-and-deploy` (from firebase-deploy.yml workflow)
5. Enable: **Require branches to be up to date before merging**

**Note**: With branch protection, auto-merge will only proceed after all required checks pass. This is already the behavior with `gh pr merge --auto`, but branch protection provides an additional layer of enforcement.

## Monitoring

### Check Auto-Merge Status

```bash
# List open Dependabot PRs
gh pr list --author "dependabot[bot]"

# Check auto-merge status for a PR
gh pr view <PR_NUMBER> --json autoMergeRequest
```

### Process Existing Dependabot PRs

The auto-merge workflow automatically processes **new** Dependabot PRs and PRs that are updated. For PRs that were already open before this workflow was added, you have two options:

**Option 1: Trigger via workflow_dispatch (Recommended)**

1. Go to: Actions → Dependabot Auto-Merge → Run workflow
2. Enter the PR number in the `pr_number` input field
3. Click "Run workflow"

The workflow will evaluate the PR and enable auto-merge if it meets the criteria.

**Option 2: Close and reopen the PR**

Dependabot allows you to close and reopen PRs by commenting:
```bash
# On the PR, comment:
@dependabot reopen
```

This will trigger the `reopened` event and the workflow will process it automatically.

**Option 3: Wait for updates**

The workflow will automatically process existing PRs when:
- Dependabot updates them (e.g., due to new commits to the base branch)
- Dependabot rebases them (e.g., due to conflicts)
- The dependencies are updated by Dependabot's schedule

### Disable Auto-Merge

To disable auto-merge for a specific PR:

```bash
gh pr merge --disable-auto <PR_NUMBER>
```

### Disable Globally

To disable the auto-merge workflow:
1. Go to: Settings → Actions → Workflows
2. Disable: "Dependabot Auto-Merge"

Or rename/delete: `.github/workflows/dependabot-auto-merge.yml`

## Manual Dependency Updates

If you need to update dependencies outside the Dependabot schedule:

```bash
# Check for outdated packages
npm outdated

# Update a specific package
npm update <package-name>

# Update all packages (use with caution)
npm update

# Commit and push
git add package.json package-lock.json
git commit -m "chore: update dependencies"
git push
```

## Troubleshooting

### Auto-merge not triggering

1. **Check workflow runs**: Actions → Dependabot Auto-Merge
2. **Verify metadata**: PR should have Dependabot labels
3. **Check permissions**: Workflow needs `contents: write` and `pull-requests: write`
4. **CI status**: All checks must pass before merge (see [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging))

### PR stuck in "auto-merge enabled" state

- Check CI status: Some check may be failing
- Review required approvals: May need additional approvals
- Check branch protection: Rules may prevent merge

### Too many PRs

Adjust in `.github/dependabot.yml`:
```yaml
open-pull-requests-limit: 5  # Reduce from 10
```

### Wrong updates being auto-merged

Review the conditions in `.github/workflows/dependabot-auto-merge.yml`:
```yaml
if: |
  (steps.metadata.outputs.update-type == 'version-update:semver-patch') ||
  (steps.metadata.outputs.update-type == 'version-update:semver-minor' && steps.metadata.outputs.dependency-type == 'direct:development')
```

## References

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Dependabot Configuration Options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Auto-merge Pull Requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [Fetch Metadata Action](https://github.com/dependabot/fetch-metadata)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md#dependency-management) for the full dependency management guidelines.
