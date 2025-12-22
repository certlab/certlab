# Roadmap Tracker GitHub Action

This GitHub Actions workflow automates the roadmap feature tracking and issue generation process.

## Features

- 🔄 **Automated Execution**: Run on-demand or on schedule
- 📅 **Weekly Monitoring**: Automatically runs every Monday at 9 AM UTC
- 🎯 **Two Modes**: Dry-run (preview) or live (create issues)
- 📦 **Artifact Upload**: All tracking files saved as artifacts
- 📊 **Job Summary**: Statistics and results displayed in workflow
- 🔧 **Optional Commit**: Can automatically update tracking file in repo

## How to Use

### Manual Execution

1. Navigate to the **Actions** tab in GitHub
2. Select **Roadmap Tracker** from the workflows list
3. Click **Run workflow** button
4. Configure the workflow:
   - **Run mode**: 
     - `dry-run` - Preview issues without creating them (default)
     - `live` - Create actual GitHub issues
   - **Update tracking**: 
     - `false` - Don't commit tracking file (default)
     - `true` - Commit updated `ROADMAP_TRACKING.md` to main branch
5. Click the green **Run workflow** button

### Automated Execution

The workflow runs automatically:
- **Schedule**: Every Monday at 9:00 AM UTC
- **Mode**: Dry-run (preview only)
- **Output**: Tracking files uploaded as artifacts

## Workflow Outputs

### Artifacts

Every workflow run uploads three files as artifacts (retained for 30 days):

1. **ROADMAP_TRACKING.md** - Master tracking checklist
   - All 371 features with implementation status
   - Validation confidence scores
   - Evidence from codebase
   - Direct ROADMAP.md links

2. **ROADMAP_ISSUES_PREVIEW.md** - Issue templates
   - Complete issue bodies for 12 major features
   - Success criteria, benefits, technical details
   - Proper labels and references

3. **ROADMAP_ISSUE_SUMMARY.md** - Human-readable summary
   - List of features by priority
   - Creation methods
   - Maintenance instructions

### Job Summary

Each run generates a summary showing:
- Total features identified
- Implemented vs pending count
- Run mode (dry-run or live)
- List of uploaded artifacts

## Permissions

The workflow requires:
- `issues: write` - To create GitHub issues (live mode only)
- `contents: write` - To commit tracking file updates (optional)

## Use Cases

### Preview Changes
Run in **dry-run mode** to:
- See what issues would be created
- Check validation results
- Review tracking file updates
- Verify script functionality

### Create Issues
Run in **live mode** to:
- Create GitHub issues for unimplemented features
- Automatically apply proper labels
- Generate issues with full context from roadmap

### Monitor Progress
Use **scheduled runs** to:
- Track roadmap implementation progress weekly
- Identify newly added features
- Download tracking files for review
- Maintain up-to-date visibility

### Update Repository
Enable **update tracking** to:
- Automatically commit updated tracking file
- Keep `ROADMAP_TRACKING.md` current in main branch
- Track progress over time in git history

## Environment

- **Runner**: `ubuntu-latest`
- **Node.js**: v20
- **Dependencies**: Installed via `npm ci`
- **Script**: `npx tsx scripts/roadmap-tracker.ts`

## Troubleshooting

### Workflow Fails to Create Issues

**Problem**: Live mode fails with permission errors

**Solution**: Ensure the workflow has `issues: write` permission. This is configured in the workflow file.

### Tracking File Not Updated

**Problem**: "Update tracking" is true but file not committed

**Solution**: Check that:
1. `contents: write` permission is granted
2. There are actual changes to commit
3. Workflow has completed successfully

### Artifacts Not Found

**Problem**: Cannot download tracking files

**Solution**: Artifacts are retained for 30 days. After that, run the workflow again to regenerate them.

### Schedule Not Running

**Problem**: Weekly scheduled run doesn't execute

**Solution**: Scheduled workflows may be disabled in forked repos. Enable via repository settings > Actions.

## Examples

### Example 1: Preview Before Creating Issues

```yaml
# Run workflow manually
Run mode: dry-run
Update tracking: false

# Result:
# - No issues created
# - Tracking files uploaded as artifacts
# - Review ROADMAP_ISSUES_PREVIEW.md to see what would be created
```

### Example 2: Create All Issues

```yaml
# Run workflow manually
Run mode: live
Update tracking: false

# Result:
# - 12 GitHub issues created with proper labels
# - Tracking files uploaded as artifacts
# - Job summary shows statistics
```

### Example 3: Update Tracking File

```yaml
# Run workflow manually
Run mode: dry-run
Update tracking: true

# Result:
# - No issues created (dry-run mode)
# - ROADMAP_TRACKING.md committed to main branch
# - Tracking files also available as artifacts
```

## Related Documentation

- **Script Documentation**: `scripts/README_ROADMAP_TRACKER.md`
- **Implementation Summary**: `IMPLEMENTATION_COMPLETE.md`
- **Issue Creation Guide**: `ROADMAP_ISSUE_SUMMARY.md`
- **Manual Script**: `scripts/create-roadmap-issues.sh`

## Maintenance

The workflow is designed to be low-maintenance:

1. **Weekly automated runs** keep tracking current
2. **Artifacts** provide history of tracking state
3. **Optional commits** create git history
4. **No secrets required** for dry-run mode

To modify the schedule, edit the `cron` expression in the workflow file:

```yaml
schedule:
  - cron: '0 9 * * 1'  # Monday at 9 AM UTC
```
