#!/bin/bash
# Script to create the side navigation refactor GitHub issue
# This script requires GH_TOKEN environment variable to be set

set -e

REPO="certlab/certlab"
TITLE="Refactor app to use side navigation drawer with 2-level navigation items"
LABELS="enhancement,ux,navigation,accessibility"
BODY_FILE="ISSUE_SIDE_NAVIGATION_REFACTOR.md"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI."
    echo "Please run: gh auth login"
    exit 1
fi

# Check if body file exists
if [ ! -f "$BODY_FILE" ]; then
    echo "Error: Issue body file not found: $BODY_FILE"
    exit 1
fi

echo "Creating GitHub issue..."
echo "Repository: $REPO"
echo "Title: $TITLE"
echo "Labels: $LABELS"
echo ""

# Extract content after the separator for the issue body
BODY_CONTENT=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$BODY_FILE" | tail -n +2)

# Create the issue
ISSUE_URL=$(gh issue create \
    --repo "$REPO" \
    --title "$TITLE" \
    --body "$BODY_CONTENT" \
    --label "$LABELS" 2>&1)

if [ $? -eq 0 ]; then
    echo "✅ Issue created successfully!"
    echo "URL: $ISSUE_URL"
else
    echo "❌ Failed to create issue"
    echo "$ISSUE_URL"
    exit 1
fi
