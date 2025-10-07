#!/usr/bin/env tsx
import UIStructureAnalyzer from './index';

// Parse command line arguments
const args = process.argv.slice(2);
const watch = args.includes('--watch') || args.includes('-w');
const verbose = args.includes('--verbose') || args.includes('-v');

// Create and run analyzer
const analyzer = new UIStructureAnalyzer({
  rootDir: './client/src',
  outputPath: './ui-structure-map.yaml',
  watch,
  debounceMs: 500,
  include: ['**/*.tsx', '**/*.jsx'],
  exclude: ['node_modules/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*']
});

console.log(`
╭───────────────────────────────────────────╮
│     UI Structure Analyzer                 │
│     ─────────────────────                 │
│     📊 Analyzing React components...       │
│     📝 Output: ui-structure-map.yaml      │
│     ${watch ? '👁️  Watch mode: ENABLED           ' : '⚡ One-time analysis             '}│
╰───────────────────────────────────────────╯
`);

analyzer.run().catch(error => {
  console.error('❌ Error:', error.message);
  if (verbose) {
    console.error(error);
  }
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down UI Structure Analyzer...');
  analyzer.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  analyzer.stop();
  process.exit(0);
});