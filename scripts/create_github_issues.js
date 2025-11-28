#!/usr/bin/env node

/**
 * Script to create GitHub issues from ISSUES.md
 * 
 * This script parses the ISSUES.md file and creates GitHub issues for each
 * issue that doesn't already exist in the repository.
 * 
 * Prerequisites:
 * - GitHub CLI (gh) must be installed and authenticated
 * - Run from the root of the repository
 * 
 * Usage:
 *   node scripts/create_github_issues.js [--dry-run]
 * 
 * Options:
 *   --dry-run   Print what would be created without actually creating issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');

// Read ISSUES.md file
const issuesPath = path.join(__dirname, '..', 'ISSUES.md');
const issuesContent = fs.readFileSync(issuesPath, 'utf-8');

// Parse issues from the markdown file
function parseIssues(content) {
  const issues = [];
  const sections = content.split(/^## \d+\./m);
  
  // Also capture section 14 (User Feedback) separately
  const sectionPattern = /^## (\d+)\. (.+)$/gm;
  const issuePattern = /^### Issue: (.+?) \(Open\)$/gm;
  
  let currentSection = null;
  let currentSectionName = null;
  
  const lines = content.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check for section header
    const sectionMatch = line.match(/^## (\d+)\. (.+)$/);
    if (sectionMatch) {
      currentSection = parseInt(sectionMatch[1]);
      currentSectionName = sectionMatch[2].trim();
      i++;
      continue;
    }
    
    // Check for issue header
    const issueMatch = line.match(/^### Issue: (.+?) \(Open\)$/);
    if (issueMatch && currentSectionName) {
      const title = issueMatch[1].trim();
      
      // Collect the issue body (everything until the next ### or ## or ---)
      let body = '';
      let fileInfo = '';
      let description = '';
      let recommendation = '';
      let priority = 'Medium';
      
      i++;
      while (i < lines.length) {
        const bodyLine = lines[i];
        
        // Stop at next issue, section, or horizontal rule
        if (bodyLine.match(/^###/) || bodyLine.match(/^## \d+\./) || bodyLine === '---') {
          break;
        }
        
        // Extract file info
        if (bodyLine.startsWith('**File:**') || bodyLine.startsWith('**Files:**')) {
          fileInfo = bodyLine.replace(/\*\*/g, '').replace('File:', '').replace('Files:', '').trim();
        }
        
        // Extract priority
        if (bodyLine.startsWith('**Priority:**')) {
          const priorityMatch = bodyLine.match(/\*\*Priority:\*\* (.+)/);
          if (priorityMatch) {
            priority = priorityMatch[1].trim();
          }
        }
        
        body += bodyLine + '\n';
        i++;
      }
      
      issues.push({
        title,
        section: currentSectionName,
        body: body.trim(),
        priority,
        files: fileInfo
      });
      continue;
    }
    
    i++;
  }
  
  return issues;
}

// Get existing issues from GitHub
function getExistingIssues() {
  try {
    const result = execSync('gh issue list --state all --limit 500 --json title', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const issues = JSON.parse(result);
    return issues.map(i => i.title.toLowerCase().trim());
  } catch (error) {
    console.error('Error fetching existing issues. Make sure gh CLI is installed and authenticated.');
    console.error(error.message);
    process.exit(1);
  }
}

// Check if an issue already exists (fuzzy matching)
function issueExists(title, existingIssues) {
  const normalizedTitle = title.toLowerCase().trim();
  
  for (const existing of existingIssues) {
    // Direct match
    if (existing === normalizedTitle) return true;
    
    // Check if one contains the other
    if (existing.includes(normalizedTitle) || normalizedTitle.includes(existing)) return true;
    
    // Check word overlap
    const titleWords = new Set(normalizedTitle.replace(/[`'"-]/g, ' ').split(/\s+/).filter(w => w.length > 2));
    const existingWords = new Set(existing.replace(/[`'"-]/g, ' ').split(/\s+/).filter(w => w.length > 2));
    
    let matches = 0;
    for (const word of titleWords) {
      if (existingWords.has(word)) matches++;
    }
    
    if (titleWords.size > 0 && matches / titleWords.size >= 0.6) return true;
  }
  
  return false;
}

// Create a GitHub issue
function createIssue(issue) {
  const title = issue.title;
  const body = `## Category\n${issue.section}\n\n${issue.body}\n\n---\n*This issue was auto-generated from ISSUES.md*`;
  
  // Determine label based on section
  let label = 'enhancement';
  const section = issue.section.toLowerCase();
  if (section.includes('security')) label = 'security';
  else if (section.includes('bug') || section.includes('error')) label = 'bug';
  else if (section.includes('documentation')) label = 'documentation';
  else if (section.includes('accessibility')) label = 'accessibility';
  else if (section.includes('performance')) label = 'performance';
  
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would create issue: "${title}"`);
    console.log(`  Section: ${issue.section}`);
    console.log(`  Label: ${label}`);
    return true;
  }
  
  try {
    // Escape the body for shell
    const escapedBody = body.replace(/'/g, "'\\''");
    const escapedTitle = title.replace(/'/g, "'\\''");
    
    execSync(`gh issue create --title '${escapedTitle}' --body '${escapedBody}' --label '${label}'`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`✓ Created issue: "${title}"`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to create issue: "${title}"`);
    console.error(`  Error: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('Create GitHub Issues from ISSUES.md');
  console.log('='.repeat(60));
  
  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No issues will be created ***\n');
  }
  
  // Parse issues from ISSUES.md
  console.log('Parsing ISSUES.md...');
  const issues = parseIssues(issuesContent);
  console.log(`Found ${issues.length} issues in ISSUES.md\n`);
  
  // Get existing issues
  console.log('Fetching existing GitHub issues...');
  const existingIssues = getExistingIssues();
  console.log(`Found ${existingIssues.length} existing issues\n`);
  
  // Filter out issues that already exist
  const newIssues = issues.filter(issue => !issueExists(issue.title, existingIssues));
  console.log(`${newIssues.length} new issues to create\n`);
  
  if (newIssues.length === 0) {
    console.log('All issues from ISSUES.md already exist in GitHub!');
    return;
  }
  
  // Create new issues
  console.log('Creating issues...\n');
  let created = 0;
  let failed = 0;
  
  for (const issue of newIssues) {
    if (createIssue(issue)) {
      created++;
    } else {
      failed++;
    }
    
    // Rate limiting - wait a bit between creations
    if (!DRY_RUN) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Summary: ${created} created, ${failed} failed`);
  console.log('='.repeat(60));
}

main().catch(console.error);
