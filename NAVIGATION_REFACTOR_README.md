# Side Navigation Refactor Issue

This directory contains documentation for the proposed side navigation drawer refactoring.

## Files

- **ISSUE_SIDE_NAVIGATION_REFACTOR.md** - Complete GitHub issue description with analysis, proposed solution, and implementation details
- **scripts/create-navigation-issue.sh** - Shell script to create the issue automatically (requires GitHub CLI authentication)

## Quick Start

### Option 1: Create Issue via GitHub Web UI (Recommended)

1. Go to https://github.com/certlab/certlab/issues/new
2. Open `ISSUE_SIDE_NAVIGATION_REFACTOR.md`
3. Copy the title from the file
4. Copy all content after the second `---` separator (the main body)
5. Add labels: `enhancement`, `ux`, `navigation`, `accessibility`
6. Click "Submit new issue"

### Option 2: Create Issue via GitHub CLI

```bash
# Authenticate if not already done
gh auth login

# Run the creation script
./scripts/create-navigation-issue.sh
```

### Option 3: Manual gh command

```bash
# Extract the body content (skip the header and separator)
BODY=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' ISSUE_SIDE_NAVIGATION_REFACTOR.md | tail -n +2)

# Create the issue
gh issue create \
  --repo certlab/certlab \
  --title "Refactor app to use side navigation drawer with 2-level navigation items" \
  --body "$BODY" \
  --label "enhancement,ux,navigation,accessibility"
```

## Issue Summary

This issue proposes refactoring CertLab's navigation to use a unified side navigation drawer with 2-level collapsible navigation items. The current implementation uses three different navigation patterns (~1,600 lines of code) which creates inconsistency and maintenance burden.

### Key Benefits

- ✅ Consistent UX across all devices (desktop, tablet, mobile)
- ✅ Better organization with 2-level hierarchy 
- ✅ Improved discoverability of features
- ✅ ~60% code reduction in navigation logic
- ✅ Leverages existing shadcn/ui Sidebar component
- ✅ Modern UX pattern similar to Notion, Linear, GitHub

### Current Navigation Components

- `Header.tsx` - 1,168 lines (desktop dropdown mega-menus)
- `MobileNavigationEnhanced.tsx` - 300 lines (mobile sheet drawer with flat list)
- `MobileBottomNav.tsx` - 121 lines (mobile bottom nav bar)

### Proposed Structure

Single `AppNavigation.tsx` component with 6 main groups:
1. Dashboard (single item)
2. Learn (5 items: Daily Challenges, Quiz Builder, My Quizzes, Practice Tests, Question Bank)
3. Study Resources (5 items: Study Notes, Enhanced Notes, Study Timer, Marketplace, My Materials)
4. Community (3 items: Achievements, Leaderboard, Certificates)
5. Progress & Analytics (3 items: Analytics, Performance, Wallet)
6. Tools (4 items: Import Data, Import Personal Questions, I18n Demo, Credits)
7. Admin (5 items, conditional: Admin Dashboard, User Roles, Reporting, Accessibility, UI Structure)

## Technical Details

See the full issue document for:
- Detailed current state analysis
- Complete technical implementation notes
- Navigation item data structures
- Responsive breakpoint behavior
- Success criteria checklist
- Open questions for discussion

## Questions?

For questions about this proposal, please:
1. Create the issue first
2. Add your questions as comments on the issue
3. Tag relevant stakeholders for feedback
