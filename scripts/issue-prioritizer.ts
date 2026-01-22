#!/usr/bin/env tsx

/**
 * Issue Prioritization System
 *
 * This script analyzes all open issues and prioritizes them according to ROADMAP.md phases.
 * It generates a prioritized tracking document with phase mappings and reasoning.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface GitHubIssue {
  number: number;
  title: string;
  body?: string;
  labels?: Array<{ name: string }>;
}

export interface PrioritizedIssue {
  number: number;
  title: string;
  phase: string;
  phaseNumber: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  criticalPath: boolean;
  security: boolean;
  accessibility: boolean;
  roadmapSection?: string;
  reasoning: string;
  dependencies: number[];
  labels: string[];
  timeline?: string;
}

export interface PhaseInfo {
  number: number;
  name: string;
  description: string;
  criticalPath: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Phase definitions from ROADMAP.md
 */
export const PHASES: Record<string, PhaseInfo> = {
  'phase-0': {
    number: 0,
    name: 'Study Materials Marketplace & Access Control',
    description:
      'Highest priority critical path - marketplace infrastructure, admin publishing, access control',
    criticalPath: true,
    priority: 'critical',
  },
  'phase-1': {
    number: 1,
    name: 'Foundation & Core Infrastructure',
    description: 'Critical path - error handling, security, metadata/taxonomy',
    criticalPath: true,
    priority: 'critical',
  },
  'phase-2': {
    number: 2,
    name: 'Content Authoring & Management',
    description: 'Critical path - rich editor, content types, quiz types, versioning',
    criticalPath: true,
    priority: 'high',
  },
  'firebase-completion': {
    number: 1.5, // Between phase 1 and 2 in priority
    name: 'Firebase Completion & Enhancement',
    description: 'Q1 2025 roadmap - complete remaining 5% of Firebase integration',
    criticalPath: true,
    priority: 'high',
  },
  'phase-3': {
    number: 3,
    name: 'User Experience & Accessibility',
    description: 'Preview mode, drag-drop, duplication, accessibility audit',
    criticalPath: false,
    priority: 'high',
  },
  'phase-4': {
    number: 4,
    name: 'Permissions & Access Control',
    description: 'Security and sharing - permissions, access verification, collaboration',
    criticalPath: false,
    priority: 'high',
  },
  'phase-5': {
    number: 5,
    name: 'Discovery & Navigation',
    description: 'Pagination, search, templates',
    criticalPath: false,
    priority: 'medium',
  },
  'phase-6': {
    number: 6,
    name: 'Distribution & Engagement',
    description: 'Distribution methods, notifications, certificates',
    criticalPath: false,
    priority: 'medium',
  },
  'phase-7': {
    number: 7,
    name: 'Analytics & Insights',
    description: 'Analytics dashboard, gamification',
    criticalPath: false,
    priority: 'medium',
  },
  'phase-8': {
    number: 8,
    name: 'Customization & Localization',
    description: 'Branding, translation, attachments',
    criticalPath: false,
    priority: 'low',
  },
  'phase-9': {
    number: 9,
    name: 'Quality of Life Improvements',
    description: 'Print functionality and polish features',
    criticalPath: false,
    priority: 'low',
  },
  'phase-10': {
    number: 10,
    name: 'Release Preparation',
    description: 'Final QA, compliance, audit readiness',
    criticalPath: false,
    priority: 'medium',
  },
};

/**
 * Prioritize issues according to roadmap phases
 */
export function prioritizeIssues(openIssues: GitHubIssue[]): PrioritizedIssue[] {
  const prioritized: PrioritizedIssue[] = [];

  for (const issue of openIssues) {
    const mapping = mapIssueToPhase(issue);
    if (mapping) {
      prioritized.push(mapping);
    }
  }

  // Sort by priority
  prioritized.sort((a, b) => {
    // Critical path first
    if (a.criticalPath !== b.criticalPath) {
      return a.criticalPath ? -1 : 1;
    }
    // Security issues next
    if (a.security !== b.security) {
      return a.security ? -1 : 1;
    }
    // Accessibility issues next
    if (a.accessibility !== b.accessibility) {
      return a.accessibility ? -1 : 1;
    }
    // Phase number (lower is higher priority)
    if (a.phaseNumber !== b.phaseNumber) {
      return a.phaseNumber - b.phaseNumber;
    }
    // Priority level
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return prioritized;
}

/**
 * Map a single issue to its roadmap phase
 */
function mapIssueToPhase(issue: GitHubIssue): PrioritizedIssue | null {
  const title = issue.title.toLowerCase();
  const body = (issue.body || '').toLowerCase();
  const labels = issue.labels?.map((l: any) => l.name) || [];

  // Firebase completion issues - map each to specific dependencies and order
  const firebaseIssues: Record<number, { reasoning: string; dependencies: number[] }> = {
    770: {
      reasoning:
        'Comprehensive testing should be done last, after all other Firebase features are implemented and stable. This ensures all edge cases, sync scenarios, and integration points are covered.',
      dependencies: [771, 772, 773, 774, 775],
    },
    771: {
      reasoning:
        'Connection status indicators provide visibility into Firestore state. Should be implemented early to help debug and monitor other Firebase features during development.',
      dependencies: [],
    },
    772: {
      reasoning:
        'Query optimization should be done before implementing complex sync logic. Efficient queries reduce costs and improve performance for all subsequent features.',
      dependencies: [771],
    },
    773: {
      reasoning:
        'Offline queue is foundational infrastructure for reliable sync. Must be in place before implementing conflict resolution and edge case handling.',
      dependencies: [771, 772],
    },
    774: {
      reasoning:
        'Conflict resolution depends on having offline queue in place. Handles racing updates and simultaneous edits from multiple clients.',
      dependencies: [773],
    },
    775: {
      reasoning:
        'Real-time sync edge cases are the final polish on sync implementation. Should be done after conflict resolution is working properly.',
      dependencies: [774],
    },
  };

  if (firebaseIssues[issue.number]) {
    const { reasoning, dependencies } = firebaseIssues[issue.number];
    return {
      number: issue.number,
      title: issue.title,
      phase: 'firebase-completion',
      phaseNumber: PHASES['firebase-completion'].number,
      priority: 'high',
      criticalPath: true,
      security: false,
      accessibility: false,
      roadmapSection:
        'Short-Term Roadmap (Q1-Q2 2025) > Q1 2025: Firebase Completion & Enhancement',
      reasoning,
      dependencies,
      labels: labels,
      timeline: labels.find((l) => l.startsWith('timeline:')) || 'Q1 2025',
    };
  }

  // General Firebase/Firestore detection (for future issues)
  if (
    title.includes('firestore') ||
    title.includes('firebase') ||
    title.includes('sync') ||
    title.includes('offline')
  ) {
    return {
      number: issue.number,
      title: issue.title,
      phase: 'firebase-completion',
      phaseNumber: PHASES['firebase-completion'].number,
      priority: 'high',
      criticalPath: true,
      security: false,
      accessibility: false,
      roadmapSection:
        'Short-Term Roadmap (Q1-Q2 2025) > Q1 2025: Firebase Completion & Enhancement',
      reasoning:
        'Part of Firebase integration completion (95% → 100%). Critical infrastructure for cloud-native architecture.',
      dependencies: [],
      labels: labels,
      timeline: labels.find((l) => l.startsWith('timeline:')) || 'Q1 2025',
    };
  }

  // Detect Phase 0 issues (Marketplace & Access Control)
  if (
    title.includes('marketplace') ||
    title.includes('access control') ||
    title.includes('purchase') ||
    title.includes('admin') ||
    title.includes('study pack')
  ) {
    return {
      number: issue.number,
      title: issue.title,
      phase: 'phase-0',
      phaseNumber: PHASES['phase-0'].number,
      priority: 'critical',
      criticalPath: true,
      security: title.includes('security') || title.includes('access'),
      accessibility: false,
      roadmapSection:
        'Implementation Phases > Phase 0: Study Materials Marketplace & Access Control',
      reasoning:
        'Phase 0 is the HIGHEST PRIORITY critical path. Must be completed before other features can proceed effectively.',
      dependencies: [],
      labels: labels,
    };
  }

  // Detect Phase 1 issues (Foundation & Infrastructure)
  if (
    title.includes('error') ||
    title.includes('validation') ||
    title.includes('security') ||
    title.includes('metadata') ||
    title.includes('taxonomy') ||
    title.includes('logging')
  ) {
    return {
      number: issue.number,
      title: issue.title,
      phase: 'phase-1',
      phaseNumber: PHASES['phase-1'].number,
      priority: 'critical',
      criticalPath: true,
      security: title.includes('security') || title.includes('validation'),
      accessibility: false,
      roadmapSection: 'Implementation Phases > Phase 1: Foundation & Core Infrastructure',
      reasoning:
        'Critical path infrastructure. Establishes foundational systems that other features depend on.',
      dependencies: [],
      labels: labels,
    };
  }

  // Default: general enhancement
  return {
    number: issue.number,
    title: issue.title,
    phase: 'general-enhancement',
    phaseNumber: 99,
    priority: 'medium',
    criticalPath: false,
    security: false,
    accessibility: false,
    roadmapSection: 'Not directly mapped to a specific phase',
    reasoning: 'General enhancement or improvement not directly tied to a specific roadmap phase.',
    dependencies: [],
    labels: labels,
    timeline: labels.find((l) => l.startsWith('timeline:')),
  };
}

/**
 * Sort issues within a phase by specific ordering logic
 */
function sortIssuesWithinPhase(issues: PrioritizedIssue[], phaseName: string): PrioritizedIssue[] {
  // For Firebase completion, order by logical dependency chain
  if (phaseName === 'firebase-completion') {
    // Recommended order based on dependencies and logical flow:
    // 1. #771 - Connection Status (no dependencies, helps debug others)
    // 2. #772 - Query Performance (depends on #771)
    // 3. #773 - Offline Queue (depends on #771, #772)
    // 4. #774 - Conflict Resolution (depends on #773)
    // 5. #775 - Sync Edge Cases (depends on #774)
    // 6. #770 - Comprehensive Testing (depends on all above)
    const ordering = new Map([
      [771, 1], // Connection Status Indicators - first, helps debug others
      [772, 2], // Query Performance - optimize before complex logic
      [773, 3], // Offline Queue - foundation for sync
      [774, 4], // Conflict Resolution - handles sync conflicts
      [775, 5], // Real-time Sync Edge Cases - final sync polish
      [770, 6], // Comprehensive Testing - last, tests everything
    ]);

    return issues.sort((a, b) => {
      const orderA = ordering.get(a.number) || 999;
      const orderB = ordering.get(b.number) || 999;
      return orderA - orderB;
    });
  }

  // Default: by issue number (older issues first)
  return issues.sort((a, b) => a.number - b.number);
}

/**
 * Generate markdown report
 */
export function generateReport(prioritizedIssues: PrioritizedIssue[]): string {
  let report = `# CertLab Issue Prioritization Report

**Generated**: ${new Date().toISOString()}  
**Total Open Issues**: ${prioritizedIssues.length}

---

## Executive Summary

This document provides a prioritized ordering of all open issues in the CertLab repository, aligned with the roadmap phases defined in [ROADMAP.md](https://github.com/archubbuck/certlab/blob/main/ROADMAP.md).

### Prioritization Principles (from ROADMAP.md)

1. **Phase 0 (Study Materials Marketplace & Access Control)** is the HIGHEST PRIORITY critical path
2. **Phases 1-2** remain critical path items for infrastructure
3. **Security-related issues** should not be skipped or delayed
4. **Accessibility issues** are essential for inclusivity
5. Each phase should be fully tested before moving to the next

### Priority Levels

- **Critical**: Phase 0-1 critical path items, security issues
- **High**: Phase 2 critical path, Firebase completion, Phase 3-4 items
- **Medium**: Phase 5-7 items, general enhancements
- **Low**: Phase 8-9 polish features

---

## Prioritized Issue Order

`;

  // Group by phase
  const byPhase = new Map<string, PrioritizedIssue[]>();
  for (const issue of prioritizedIssues) {
    if (!byPhase.has(issue.phase)) {
      byPhase.set(issue.phase, []);
    }
    byPhase.get(issue.phase)!.push(issue);
  }

  // Sort phases by priority
  const sortedPhases = Array.from(byPhase.keys()).sort((a, b) => {
    const phaseA = PHASES[a] || { number: 99 };
    const phaseB = PHASES[b] || { number: 99 };
    return phaseA.number - phaseB.number;
  });

  let orderNumber = 1;
  for (const phaseName of sortedPhases) {
    const issues = byPhase.get(phaseName)!;
    const phase = PHASES[phaseName];

    if (phase) {
      report += `### ${phase.name} (Phase ${phase.number})\n\n`;
      report += `**Priority**: ${phase.priority.toUpperCase()}  \n`;
      report += `**Critical Path**: ${phase.criticalPath ? '✅ Yes' : '❌ No'}  \n`;
      report += `**Description**: ${phase.description}\n\n`;
    } else {
      report += `### ${phaseName}\n\n`;
    }

    // Sort issues within phase by specific ordering logic
    const sortedIssues = sortIssuesWithinPhase(issues, phaseName);

    for (const issue of sortedIssues) {
      const badges = [];
      if (issue.criticalPath) badges.push('🔴 CRITICAL PATH');
      if (issue.security) badges.push('🔒 SECURITY');
      if (issue.accessibility) badges.push('♿ ACCESSIBILITY');

      report += `#### ${orderNumber}. Issue #${issue.number}: ${issue.title}\n\n`;

      if (badges.length > 0) {
        report += `**Badges**: ${badges.join(' | ')}\n\n`;
      }

      report += `**Priority**: ${issue.priority.toUpperCase()}\n\n`;
      report += `**Roadmap Section**: ${issue.roadmapSection}\n\n`;
      report += `**Reasoning**: ${issue.reasoning}\n\n`;

      if (issue.timeline) {
        report += `**Timeline**: ${issue.timeline}\n\n`;
      }

      if (issue.labels.length > 0) {
        report += `**Labels**: ${issue.labels.join(', ')}\n\n`;
      }

      if (issue.dependencies.length > 0) {
        report += `**Dependencies**: ${issue.dependencies.map((d) => `#${d}`).join(', ')}\n\n`;
      }

      report += `**GitHub Issue**: [#${issue.number}](https://github.com/archubbuck/certlab/issues/${issue.number})\n\n`;
      report += `---\n\n`;

      orderNumber++;
    }
  }

  // Add implementation guidance
  report += `
## Implementation Guidance

### Recommended Approach

1. **Start with Firebase Completion** (Issues #770-775)
   - These are Q1 2025 roadmap items
   - Critical infrastructure for cloud-native architecture
   - Should be completed before moving to Phase 0

2. **Proceed to Phase 0** (if any Phase 0 issues exist)
   - Highest priority critical path
   - Marketplace infrastructure, admin publishing, access control
   - Must be completed before other features

3. **Complete Phase 1** (Foundation & Core Infrastructure)
   - Error handling, security, metadata/taxonomy
   - Required for subsequent phases

4. **Continue through remaining phases in order**
   - Each phase builds on previous phases
   - Test thoroughly before moving to next phase

### Parallel Development Opportunities

Some features within different phases can be developed in parallel if dependencies allow:
- Mobile experience improvements can be worked on alongside infrastructure
- Documentation updates can happen continuously
- UI/UX enhancements can be developed in parallel with backend work

### Special Considerations

- **Security issues** (🔒) should not be skipped or delayed
- **Accessibility issues** (♿) are essential for inclusivity
- **Critical path items** (🔴) block other features and should be prioritized
- Gather feedback after each phase to refine subsequent phases

---

## Next Steps

1. Review this prioritization with the team
2. Update issue labels to reflect priorities (e.g., "priority: high", "priority: critical")
3. Create milestones for each phase
4. Assign issues to team members based on expertise
5. Begin implementation starting with the highest priority issues

---

**References:**
- [ROADMAP.md](https://github.com/archubbuck/certlab/blob/main/ROADMAP.md)
- [Issue #776](https://github.com/archubbuck/certlab/issues/776) - Original prioritization request
- [scripts/roadmap-tracker.ts](https://github.com/archubbuck/certlab/blob/main/scripts/roadmap-tracker.ts)
- [client/src/lib/content-prioritization.ts](https://github.com/archubbuck/certlab/blob/main/client/src/lib/content-prioritization.ts)

---

_This report was generated automatically by [scripts/issue-prioritizer.ts](https://github.com/archubbuck/certlab/blob/main/scripts/issue-prioritizer.ts)_
`;

  return report;
}

/**
 * Load open issues - In production, this would fetch from GitHub API
 * For now, we use a static list that should be updated as issues change
 */
function getOpenIssues(): GitHubIssue[] {
  // TODO: Replace with actual GitHub API call: gh api repos/archubbuck/certlab/issues?state=open
  return [
    {
      number: 775,
      title: 'Complete Real-time Firestore Sync Edge Cases',
      body: 'Finish implementing and testing all remaining real-time sync edge cases between client and Firestore.',
      labels: [{ name: 'enhancement' }, { name: 'timeline: Q1 2025' }],
    },
    {
      number: 774,
      title: 'Implement Conflict Resolution Strategies for Firestore',
      body: 'Design and implement robust conflict resolution strategies for Firestore syncing.',
      labels: [{ name: 'enhancement' }, { name: 'timeline: Q1 2025' }],
    },
    {
      number: 773,
      title: 'Add Offline Queue with Retry Logic for Firestore',
      body: 'Create an offline queue for Firestore mutations and implement reliable retry logic.',
      labels: [{ name: 'enhancement' }, { name: 'timeline: Q1 2025' }],
    },
    {
      number: 772,
      title: 'Optimize Firestore Query Performance',
      body: 'Audit Firestore queries for the application and optimize them for both speed and cost.',
      labels: [{ name: 'enhancement' }, { name: 'timeline: Q1 2025' }],
    },
    {
      number: 771,
      title: 'Add Firestore Connection Status Indicators',
      body: 'Add UI and developer tools indicators showing Firestore connection status.',
      labels: [{ name: 'enhancement' }, { name: 'timeline: Q1 2025' }],
    },
    {
      number: 770,
      title: 'Comprehensive Firestore Testing',
      body: 'Develop and run comprehensive integration and edge-case tests for Firestore sync.',
      labels: [{ name: 'enhancement' }, { name: 'timeline: Q1 2025' }],
    },
  ];
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 CertLab Issue Prioritization System\n');

  // Load open issues
  const openIssues = getOpenIssues();

  console.log(`📊 Analyzing ${openIssues.length} open issues...\n`);

  // Prioritize issues
  const prioritized = prioritizeIssues(openIssues);

  console.log('✅ Issues prioritized\n');

  // Generate report
  console.log('📝 Generating report...\n');
  const report = generateReport(prioritized);

  // Save report
  const repoRoot = path.resolve(__dirname, '..');
  const reportPath = path.join(repoRoot, 'ROADMAP_TRACKING.md');
  fs.writeFileSync(reportPath, report);

  console.log(`✅ Report saved to: ROADMAP_TRACKING.md\n`);

  // Print summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Issues: ${prioritized.length}`);
  console.log(`Critical Path: ${prioritized.filter((i) => i.criticalPath).length}`);
  console.log(`Security: ${prioritized.filter((i) => i.security).length}`);
  console.log(`Accessibility: ${prioritized.filter((i) => i.accessibility).length}`);
  console.log('\nBy Priority:');
  console.log(`  Critical: ${prioritized.filter((i) => i.priority === 'critical').length}`);
  console.log(`  High: ${prioritized.filter((i) => i.priority === 'high').length}`);
  console.log(`  Medium: ${prioritized.filter((i) => i.priority === 'medium').length}`);
  console.log(`  Low: ${prioritized.filter((i) => i.priority === 'low').length}`);
  console.log('='.repeat(60));
}

// Run if called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}
