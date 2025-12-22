# Roadmap Tracker Script

This script automates the process of tracking roadmap features and creating GitHub issues for unimplemented or unvalidated features.

## Overview

The `roadmap-tracker.ts` script:

1. **Parses** `ROADMAP.md` to extract all features, improvements, and checklist items
2. **Validates** implementation status by searching the codebase for evidence
3. **Generates** GitHub issues for features that need implementation or validation
4. **Creates** a comprehensive tracking checklist (`ROADMAP_TRACKING.md`)

## Features

- **Smart Parsing**: Extracts features from heading blocks and checklist items
- **Code Validation**: Searches codebase for evidence of implementation
- **Issue Templates**: Creates well-formatted GitHub issues with proper labels
- **Automatic Label Creation**: Creates missing GitHub labels with semantic colors before creating issues
- **Dry Run Mode**: Preview issues before creating them
- **Tracking Checklist**: Generates a master checklist for progress tracking
- **Intelligent Filtering**: 
  - Skips completed features
  - Avoids duplicate issues
  - Focuses on major feature blocks (not individual checklist items)
  - Excludes "under consideration" and "exploratory" features

## Usage

### Method 1: GitHub Actions (Recommended)

The easiest way to run the roadmap tracker is via GitHub Actions:

1. Go to the **Actions** tab in GitHub
2. Select **Roadmap Tracker** workflow
3. Click **Run workflow**
4. Choose your options:
   - **Run mode**: `dry-run` (preview) or `live` (create issues)
   - **Update tracking**: `true` to commit updated tracking file

The workflow:
- ✅ Runs automatically on a schedule (weekly Monday 9 AM UTC)
- ✅ Uploads tracking files as artifacts
- ✅ Optionally commits tracking file updates
- ✅ Creates a job summary with statistics

### Method 2: Local Dry Run (Preview Mode)

To preview what issues would be created without actually creating them:

```bash
npx tsx scripts/roadmap-tracker.ts
```

This will:
- Parse ROADMAP.md
- Validate features
- Generate issue previews
- Create `ROADMAP_ISSUES_PREVIEW.md` with all issue details
- Create `ROADMAP_TRACKING.md` with tracking checklist

### Method 3: Local Live Mode (Create Issues)

⚠️ **Warning**: This will create real GitHub issues. Use with caution!

```bash
npx tsx scripts/roadmap-tracker.ts --live
```

This will:
- Do everything in dry run mode
- Actually create GitHub issues using `gh` CLI
- Requires GitHub CLI authentication

## Output Files

### ROADMAP_ISSUES_PREVIEW.md

A detailed preview of all issues that would be created, including:
- Issue titles
- Issue bodies
- Labels
- Validation status

### ROADMAP_TRACKING.md

A comprehensive tracking checklist organized by roadmap section, showing:
- All features from the roadmap
- Implementation status (✅ implemented, ❌ pending)
- Validation confidence level
- Evidence found in codebase
- Direct links to ROADMAP.md

## Issue Format

Each generated issue includes:

- **Feature Description**: From roadmap
- **Section & Timeline**: Where in roadmap and when planned
- **Priority**: If specified in roadmap
- **Success Criteria**: If defined in roadmap
- **Benefits**: If listed in roadmap
- **Technical Details**: If provided in roadmap
- **Implementation Status**: Validation results
- **Evidence**: Files found containing related code
- **Reference**: Direct link to ROADMAP.md line
- **Feature ID**: Unique identifier for tracking

## Labels

Issues are automatically labeled with:

- `roadmap` - All issues
- `enhancement` - All feature requests
- Priority labels: `priority: high`, `priority: medium`, `priority: low`
- Category labels: `infrastructure`, `mobile`, `pwa`, `ai`, `gamification`, `analytics`, `accessibility`, `security`
- Timeline labels: `timeline: Q1 2025`, etc.

**Automatic Label Creation**: The script automatically creates any missing labels in the repository before creating issues. Each label is assigned a semantic color and description:
- Priority labels use red (high), yellow (medium), and light blue (low)
- Category labels use distinct colors for easy identification
- Timeline labels are dynamically created based on roadmap quarters

## Validation Logic

The script validates implementation by:

1. Extracting key terms from feature titles
2. Searching codebase with `git grep`
3. Counting matching files
4. Calculating confidence score (0-100%)
5. Marking as implemented if confidence > 40%

Features marked as "Completed" in roadmap are automatically considered implemented.

## Customization

### Adjusting Filtering

Edit the `generateIssues()` method to change filtering logic:

```typescript
// Skip individual checklist items
if (result.feature.checklistItem) {
  continue;
}
```

### Adjusting Validation

Edit the `validateFeature()` method to change confidence thresholds:

```typescript
// Mark as implemented if confidence > 40%
implemented = confidence > 40 || evidence.length > 2;
```

### Adding More Labels

Edit the `determineLabels()` method to add more label categories:

```typescript
if (section.includes('your-category')) {
  labels.push('your-label');
}
```

## Statistics

Based on current ROADMAP.md:

- **Total Features**: 405+ identified
- **Major Feature Blocks**: ~50-70 (depends on filtering)
- **Checklist Items**: ~350+
- **Typical Issues Created**: 50-100 (with smart filtering)

## Requirements

- Node.js 20+
- TypeScript/tsx
- Git repository
- GitHub CLI (`gh`) for live mode
- Authenticated GitHub session

## Troubleshooting

### "gh: command not found"

Install GitHub CLI:
```bash
# macOS
brew install gh

# Linux
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### "gh: authentication required"

Authenticate with GitHub:
```bash
gh auth login
```

### Too many issues being created

Adjust the filtering in `generateIssues()` method to be more restrictive.

### Issues not being created

Check that:
1. You're using `--live` flag
2. GitHub CLI is authenticated
3. You have write access to the repository
4. Issue creation isn't rate-limited

## Best Practices

1. **Always run in dry run mode first** to review what will be created
2. **Review ROADMAP_ISSUES_PREVIEW.md** before running live
3. **Check ROADMAP_TRACKING.md** for accuracy
4. **Use GitHub labels** to organize created issues
5. **Create issues in batches** if you have many (break script into sections)
6. **Coordinate with team** before creating many issues

## Future Enhancements

Potential improvements:

- [ ] Interactive mode to select which issues to create
- [ ] Batch creation with rate limiting
- [ ] Better duplicate detection
- [ ] Integration with GitHub Projects
- [ ] Automatic issue assignment based on section
- [ ] Support for issue templates
- [ ] Update existing issues instead of creating duplicates
- [ ] Link related issues automatically
- [ ] Generate roadmap progress reports
- [ ] Slack/Discord notifications when issues are created

## Contributing

If you improve this script, please:

1. Test thoroughly in dry run mode
2. Document changes in this README
3. Add comments to complex logic
4. Update examples if behavior changes

## Support

For questions or issues with this script:

- Open a GitHub issue
- Tag with `tooling` or `automation` label
- Provide dry run output if relevant
