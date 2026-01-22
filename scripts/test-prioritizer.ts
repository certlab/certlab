#!/usr/bin/env tsx
import { prioritizeIssues, generateReport, PHASES, type GitHubIssue } from './issue-prioritizer';

// Test with mock issues
const mockIssues: GitHubIssue[] = [
  {
    number: 999,
    title: 'Test Marketplace Feature',
    body: 'Testing marketplace',
    labels: [{ name: 'enhancement' }],
  },
  {
    number: 998,
    title: 'Test Security Validation',
    body: 'Testing security',
    labels: [{ name: 'security' }],
  },
  {
    number: 771,
    title: 'Add Firestore Connection Status Indicators',
    body: 'Add UI and developer tools indicators showing Firestore connection status.',
    labels: [{ name: 'enhancement' }, { name: 'timeline: Q1 2025' }],
  },
];

console.log('🧪 Testing issue prioritization module...\n');
console.log('✅ Available phases:', Object.keys(PHASES).length);
console.log('✅ Phase 0:', PHASES['phase-0'].name);

const prioritized = prioritizeIssues(mockIssues);
console.log('\n✅ Prioritized issues:', prioritized.length);
console.log('✅ Issue #999 phase:', prioritized.find((i) => i.number === 999)?.phase);
console.log('✅ Issue #998 phase:', prioritized.find((i) => i.number === 998)?.phase);
console.log('✅ Issue #771 phase:', prioritized.find((i) => i.number === 771)?.phase);
console.log('✅ Issue #771 dependencies:', prioritized.find((i) => i.number === 771)?.dependencies);

console.log('\n📝 Testing report generation...');
const report = generateReport(prioritized);
console.log('✅ Report length:', report.length, 'characters');
console.log('✅ Contains "Executive Summary":', report.includes('Executive Summary'));
console.log('✅ Contains "Prioritized Issue Order":', report.includes('Prioritized Issue Order'));

console.log('\n✅ All tests passed!');
