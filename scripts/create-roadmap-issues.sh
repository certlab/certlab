#!/bin/bash

# Roadmap Issue Creation Script
# This script creates GitHub issues for major roadmap features

set -e

echo "🚀 CertLab Roadmap Issue Creator"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed"
    echo ""
    echo "Please install it first:"
    echo "  macOS:   brew install gh"
    echo "  Linux:   See https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    echo ""
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub CLI"
    echo ""
    echo "Please authenticate first:"
    echo "  gh auth login"
    echo ""
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Confirm with user
echo "This will create approximately 12 GitHub issues for roadmap features."
echo ""
read -p "Do you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "📝 Creating issues using roadmap tracker..."
echo ""

# Run the TypeScript script in live mode
npx tsx scripts/roadmap-tracker.ts --live

echo ""
echo "✅ Done!"
echo ""
echo "Next steps:"
echo "  1. Review created issues: gh issue list --label roadmap"
echo "  2. Check tracking file: cat ROADMAP_TRACKING.md"
echo "  3. Update issue descriptions as needed"
echo ""
