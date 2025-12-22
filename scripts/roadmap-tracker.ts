#!/usr/bin/env tsx

/**
 * Roadmap Feature Tracker and Issue Generator
 *
 * This script:
 * 1. Parses ROADMAP.md to extract all features
 * 2. Validates implementation status in the codebase
 * 3. Creates GitHub issues for unimplemented/unvalidated features
 * 4. Generates a master tracking checklist
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Feature {
  id: string;
  title: string;
  description: string;
  section: string;
  subsection: string;
  quarter?: string;
  priority?: string;
  status?: string;
  checklistItem: boolean;
  lineNumber: number;
  successCriteria?: string[];
  technicalDetails?: string[];
  benefits?: string[];
}

interface ValidationResult {
  feature: Feature;
  implemented: boolean;
  confidence: number;
  evidence: string[];
  notes: string;
}

interface IssueTemplate {
  title: string;
  body: string;
  labels: string[];
}

class RoadmapTracker {
  private roadmapPath: string;
  private repoRoot: string;
  private features: Feature[] = [];
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.repoRoot = path.resolve(__dirname, '..');
    this.roadmapPath = path.join(this.repoRoot, 'ROADMAP.md');
    this.dryRun = dryRun;
  }

  /**
   * Main execution method
   */
  async run(): Promise<void> {
    console.log('🚀 CertLab Roadmap Tracker\n');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}\n`);

    // Step 1: Parse roadmap
    console.log('📖 Step 1: Parsing ROADMAP.md...');
    this.parseRoadmap();
    console.log(`   Found ${this.features.length} features\n`);

    // Step 2: Validate implementation status
    console.log('🔍 Step 2: Validating implementation status...');
    const validationResults = await this.validateFeatures();
    console.log(`   Validated ${validationResults.length} features\n`);

    // Step 3: Generate issues
    console.log('📝 Step 3: Generating GitHub issues...');
    const issues = this.generateIssues(validationResults);
    console.log(`   Generated ${issues.length} issues\n`);

    // Step 4: Create issues (if not dry run)
    if (!this.dryRun) {
      console.log('🚀 Step 4: Creating GitHub issues...');
      await this.createGitHubIssues(issues);
    } else {
      console.log('📋 Step 4: Preview issues (dry run)...');
      this.previewIssues(issues);
    }

    // Step 5: Generate tracking checklist
    console.log('\n📊 Step 5: Generating tracking checklist...');
    const checklist = this.generateTrackingChecklist(validationResults, issues);
    this.saveChecklist(checklist);
    console.log('   ✅ Checklist saved to ROADMAP_TRACKING.md\n');

    // Summary
    this.printSummary(validationResults, issues);
  }

  /**
   * Parse ROADMAP.md and extract all features
   */
  private parseRoadmap(): void {
    const content = fs.readFileSync(this.roadmapPath, 'utf-8');
    const lines = content.split('\n');

    let currentSection = '';
    let currentSubsection = '';
    let currentQuarter = '';
    let inFeatureBlock = false;
    let featureBuffer: string[] = [];
    let featureStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track sections
      if (line.startsWith('## ')) {
        currentSection = line.replace('## ', '').trim();
        currentQuarter = '';
        currentSubsection = '';
      } else if (line.startsWith('### ')) {
        currentSubsection = line.replace('### ', '').trim();
        // Extract quarter if present
        const quarterMatch = currentSubsection.match(/Q[1-4] \d{4}/);
        if (quarterMatch) {
          currentQuarter = quarterMatch[0];
        }
      } else if (line.startsWith('#### ')) {
        // This is a feature title
        if (inFeatureBlock && featureBuffer.length > 0) {
          this.processFeatureBlock(
            featureBuffer,
            currentSection,
            currentSubsection,
            currentQuarter,
            featureStartLine
          );
        }
        inFeatureBlock = true;
        featureBuffer = [line];
        featureStartLine = i + 1;
      } else if (inFeatureBlock) {
        // Accumulate feature details
        if (line.startsWith('##')) {
          // New section, process current block
          this.processFeatureBlock(
            featureBuffer,
            currentSection,
            currentSubsection,
            currentQuarter,
            featureStartLine
          );
          inFeatureBlock = false;
          featureBuffer = [];
          currentSection = line.replace(/^#+\s*/, '').trim();
        } else if (line.trim() !== '') {
          featureBuffer.push(line);
        }
      }

      // Also capture checklist items that aren't part of feature blocks
      if (line.trim().startsWith('- [ ]') && !inFeatureBlock) {
        this.parseChecklistItem(line, i + 1, currentSection, currentSubsection, currentQuarter);
      }
    }

    // Process final feature block if any
    if (inFeatureBlock && featureBuffer.length > 0) {
      this.processFeatureBlock(
        featureBuffer,
        currentSection,
        currentSubsection,
        currentQuarter,
        featureStartLine
      );
    }
  }

  /**
   * Process a feature block (everything under #### heading until next heading)
   */
  private processFeatureBlock(
    lines: string[],
    section: string,
    subsection: string,
    quarter: string,
    lineNumber: number
  ): void {
    if (lines.length === 0) return;

    const titleLine = lines[0].replace(/^#+\s*/, '').trim();
    const title = titleLine;

    // Skip generic section headers that aren't actual features
    const skipPatterns = [
      /^From Users?$/i,
      /^From Contributors?$/i,
      /^Q[1-4][\s-]*Q[1-4]\s*\d{4}$/i,
      /^Q[1-4]\s*\d{4}$/i,
      /^\d{4}$/,
      /^\d{4}\+$/,
      /^Requested Features$/i,
    ];

    if (skipPatterns.some((pattern) => pattern.test(title))) {
      return;
    }

    // Extract priority and status from the title or subsequent lines
    let priority = '';
    let status = '';
    let description = '';
    const successCriteria: string[] = [];
    const technicalDetails: string[] = [];
    const benefits: string[] = [];
    const checklistItems: string[] = [];

    let inSuccessCriteria = false;
    let inTechnicalDetails = false;
    let inBenefits = false;
    let inImplementationDetails = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('**Priority**:')) {
        priority = line.replace('**Priority**:', '').trim();
      } else if (line.startsWith('**Status**:')) {
        status = line.replace('**Status**:', '').trim();
      } else if (line.startsWith('**Success Criteria**:')) {
        inSuccessCriteria = true;
        inTechnicalDetails = false;
        inBenefits = false;
        inImplementationDetails = false;
      } else if (line.startsWith('**Technical') || line.startsWith('**Implementation')) {
        inTechnicalDetails = true;
        inSuccessCriteria = false;
        inBenefits = false;
        inImplementationDetails = true;
      } else if (line.startsWith('**Benefits**:')) {
        inBenefits = true;
        inSuccessCriteria = false;
        inTechnicalDetails = false;
        inImplementationDetails = false;
      } else if (line.startsWith('**')) {
        // Reset flags when encountering other bold sections
        inSuccessCriteria = false;
        inTechnicalDetails = false;
        inBenefits = false;
        inImplementationDetails = false;
      }

      if (inSuccessCriteria && line.startsWith('- ')) {
        successCriteria.push(line.replace(/^-\s*/, ''));
      } else if (inTechnicalDetails && line.startsWith('- ')) {
        technicalDetails.push(line.replace(/^-\s*/, ''));
      } else if (inBenefits && line.startsWith('- ')) {
        benefits.push(line.replace(/^-\s*/, ''));
      }

      // Capture checklist items
      if (line.startsWith('- [ ]') || line.startsWith('- [x]')) {
        checklistItems.push(line);
      }

      // Build description (first paragraph after title)
      if (!description && i === 1 && !line.startsWith('**')) {
        description = line;
      }
    }

    // Create main feature
    const feature: Feature = {
      id: this.generateFeatureId(title, section),
      title,
      description,
      section,
      subsection,
      quarter,
      priority,
      status,
      checklistItem: false,
      lineNumber,
      successCriteria,
      technicalDetails,
      benefits,
    };

    this.features.push(feature);

    // Create sub-features for each checklist item
    checklistItems.forEach((item, idx) => {
      const subFeature = this.parseChecklistItemDetailed(
        item,
        lineNumber + idx + 1,
        section,
        subsection,
        quarter,
        title
      );
      if (subFeature) {
        this.features.push(subFeature);
      }
    });
  }

  /**
   * Parse a checklist item into a feature
   */
  private parseChecklistItem(
    line: string,
    lineNumber: number,
    section: string,
    subsection: string,
    quarter: string
  ): void {
    const feature = this.parseChecklistItemDetailed(line, lineNumber, section, subsection, quarter);
    if (feature) {
      this.features.push(feature);
    }
  }

  /**
   * Parse checklist item with more context
   */
  private parseChecklistItemDetailed(
    line: string,
    lineNumber: number,
    section: string,
    subsection: string,
    quarter: string,
    parentTitle?: string
  ): Feature | null {
    const match = line.match(/^-\s*\[([ x])\]\s*(.+)/);
    if (!match) return null;

    const isCompleted = match[1] === 'x';
    const title = match[2].trim();

    return {
      id: this.generateFeatureId(title, section),
      title: parentTitle ? `${parentTitle}: ${title}` : title,
      description: '',
      section,
      subsection,
      quarter,
      priority: '',
      status: isCompleted ? 'Completed' : 'Not Started',
      checklistItem: true,
      lineNumber,
    };
  }

  /**
   * Generate a unique feature ID
   */
  private generateFeatureId(title: string, section: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    const sectionSlug = section
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
    return `${sectionSlug}-${slug}`;
  }

  /**
   * Validate feature implementation status
   */
  private async validateFeatures(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const feature of this.features) {
      const result = await this.validateFeature(feature);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate a single feature
   */
  private async validateFeature(feature: Feature): Promise<ValidationResult> {
    const evidence: string[] = [];
    let implemented = false;
    let confidence = 0;

    // Skip validation for features marked as completed
    if (feature.status?.toLowerCase().includes('complet')) {
      return {
        feature,
        implemented: true,
        confidence: 100,
        evidence: ['Marked as completed in roadmap'],
        notes: 'Feature is marked as completed',
      };
    }

    // Search for evidence in codebase
    const searchTerms = this.extractSearchTerms(feature);

    for (const term of searchTerms) {
      try {
        const results = this.searchInCodebase(term);
        if (results.length > 0) {
          evidence.push(`Found "${term}" in ${results.length} file(s)`);
          confidence += Math.min(30, results.length * 5);
        }
      } catch (error) {
        // Skip search errors
      }
    }

    // Check if feature has implementation markers
    implemented = confidence > 40 || evidence.length > 2;

    return {
      feature,
      implemented,
      confidence: Math.min(100, confidence),
      evidence,
      notes: this.generateValidationNotes(feature, implemented, confidence),
    };
  }

  /**
   * Extract search terms from feature for validation
   */
  private extractSearchTerms(feature: Feature): string[] {
    const terms: string[] = [];

    // Extract key terms from title
    const titleWords = feature.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['with', 'from', 'that', 'this', 'have', 'been'].includes(w));

    // Add combinations
    if (titleWords.length >= 2) {
      terms.push(titleWords.slice(0, 2).join(' '));
    }
    if (titleWords.length >= 1) {
      terms.push(titleWords[0]);
    }

    // Add specific technical terms
    const technicalTerms = feature.title.match(
      /\b(SRS|PWA|AI|API|OAuth|SSO|WebRTC|IndexedDB|Firestore|Firebase)\b/gi
    );
    if (technicalTerms) {
      terms.push(...technicalTerms.map((t) => t.toLowerCase()));
    }

    return [...new Set(terms)].slice(0, 5); // Max 5 search terms
  }

  /**
   * Search for term in codebase
   */
  private searchInCodebase(term: string): string[] {
    try {
      const cmd = `git grep -l -i "${term}" -- "*.ts" "*.tsx" "*.js" "*.jsx" 2>/dev/null || true`;
      const output = execSync(cmd, { cwd: this.repoRoot, encoding: 'utf-8' });
      return output
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Generate validation notes
   */
  private generateValidationNotes(
    feature: Feature,
    implemented: boolean,
    confidence: number
  ): string {
    if (implemented) {
      if (confidence > 70) {
        return 'Strong evidence of implementation found';
      } else {
        return 'Some evidence found, may need validation';
      }
    } else {
      return 'No implementation evidence found';
    }
  }

  /**
   * Generate GitHub issues for features
   */
  private generateIssues(validationResults: ValidationResult[]): IssueTemplate[] {
    const issues: IssueTemplate[] = [];
    const createdTitles = new Set<string>();

    for (const result of validationResults) {
      // Skip if already implemented with high confidence
      if (result.implemented && result.confidence > 70) {
        continue;
      }

      // Skip completed features
      if (result.feature.status?.toLowerCase().includes('complet')) {
        continue;
      }

      // Skip individual checklist items - only create issues for major feature blocks
      if (result.feature.checklistItem) {
        continue;
      }

      // Skip "under consideration" features for now
      if (result.feature.status?.toLowerCase().includes('under consideration')) {
        continue;
      }

      // Skip exploratory features
      if (result.feature.status?.toLowerCase().includes('exploratory')) {
        continue;
      }

      // Avoid duplicate titles
      const normalizedTitle = result.feature.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (createdTitles.has(normalizedTitle)) {
        continue;
      }
      createdTitles.add(normalizedTitle);

      const issue = this.createIssueTemplate(result);
      issues.push(issue);
    }

    return issues;
  }

  /**
   * Create an issue template for a feature
   */
  private createIssueTemplate(result: ValidationResult): IssueTemplate {
    const { feature } = result;
    const labels = this.determineLabels(feature);

    let body = `## Feature Description\n\n`;

    if (feature.description) {
      body += `${feature.description}\n\n`;
    }

    body += `**Section**: ${feature.section}`;
    if (feature.subsection) {
      body += ` > ${feature.subsection}`;
    }
    body += '\n\n';

    if (feature.quarter) {
      body += `**Timeline**: ${feature.quarter}\n\n`;
    }

    if (feature.priority) {
      body += `**Priority**: ${feature.priority}\n\n`;
    }

    if (feature.status) {
      body += `**Current Status**: ${feature.status}\n\n`;
    }

    if (feature.successCriteria && feature.successCriteria.length > 0) {
      body += `## Success Criteria\n\n`;
      feature.successCriteria.forEach((criterion) => {
        body += `- ${criterion}\n`;
      });
      body += '\n';
    }

    if (feature.benefits && feature.benefits.length > 0) {
      body += `## Benefits\n\n`;
      feature.benefits.forEach((benefit) => {
        body += `- ${benefit}\n`;
      });
      body += '\n';
    }

    if (feature.technicalDetails && feature.technicalDetails.length > 0) {
      body += `## Technical Details\n\n`;
      feature.technicalDetails.forEach((detail) => {
        body += `- ${detail}\n`;
      });
      body += '\n';
    }

    // Validation info
    body += `## Implementation Status\n\n`;
    body += `**Validation**: ${result.implemented ? '⚠️ Partial' : '❌ Not Implemented'}\n`;
    body += `**Confidence**: ${result.confidence}%\n\n`;

    if (result.evidence.length > 0) {
      body += `**Evidence Found**:\n`;
      result.evidence.forEach((e) => {
        body += `- ${e}\n`;
      });
      body += '\n';
    }

    body += `---\n\n`;
    body += `📍 **Reference**: [ROADMAP.md#L${feature.lineNumber}](https://github.com/archubbuck/certlab/blob/main/ROADMAP.md#L${feature.lineNumber})\n`;
    body += `🏷️ **Feature ID**: \`${feature.id}\`\n\n`;
    body += `_This issue was automatically generated from the project roadmap._\n`;

    return {
      title: feature.title,
      body,
      labels,
    };
  }

  /**
   * Determine labels for a feature
   */
  private determineLabels(feature: Feature): string[] {
    const labels: string[] = ['roadmap'];

    // Add priority label
    if (feature.priority?.toLowerCase().includes('high')) {
      labels.push('priority: high');
    } else if (feature.priority?.toLowerCase().includes('medium')) {
      labels.push('priority: medium');
    } else if (feature.priority?.toLowerCase().includes('low')) {
      labels.push('priority: low');
    }

    // Add type labels based on section
    const section = feature.section.toLowerCase();
    if (section.includes('firebase') || section.includes('infrastructure')) {
      labels.push('infrastructure');
    }
    if (section.includes('mobile')) {
      labels.push('mobile');
    }
    if (section.includes('pwa')) {
      labels.push('pwa');
    }
    if (section.includes('ai')) {
      labels.push('ai');
    }
    if (section.includes('gamification')) {
      labels.push('gamification');
    }
    if (section.includes('analytics')) {
      labels.push('analytics');
    }
    if (section.includes('accessibility')) {
      labels.push('accessibility');
    }
    if (section.includes('security') || section.includes('privacy')) {
      labels.push('security');
    }

    // Add quarter label if present
    if (feature.quarter) {
      labels.push(`timeline: ${feature.quarter}`);
    }

    // Add enhancement label
    labels.push('enhancement');

    return labels;
  }

  /**
   * Ensure all required labels exist in the repository
   */
  private async ensureLabelsExist(issues: IssueTemplate[]): Promise<void> {
    // Collect all unique labels from all issues
    const allLabels = new Set<string>();
    issues.forEach((issue) => {
      issue.labels.forEach((label) => allLabels.add(label));
    });

    console.log(`\n   Ensuring ${allLabels.size} labels exist...\n`);

    // Get existing labels
    let existingLabels = new Set<string>();
    try {
      const output = execSync('gh label list --json name --jq ".[].name"', {
        cwd: this.repoRoot,
        encoding: 'utf-8',
      });
      existingLabels = new Set(output.trim().split('\n').filter((l) => l));
    } catch (error) {
      console.error('   ⚠️ Could not fetch existing labels, will attempt to create all labels');
    }

    // Create missing labels
    const labelColors = this.getLabelColors();
    for (const label of allLabels) {
      if (!existingLabels.has(label)) {
        try {
          const color = labelColors.get(label) || 'ededed';
          const description = this.getLabelDescription(label);
          const cmd = `gh label create "${label}" --color "${color}" --description "${description}"`;
          execSync(cmd, { cwd: this.repoRoot, encoding: 'utf-8' });
          console.log(`   ✅ Created label: ${label}`);
        } catch (error) {
          // Label might already exist or there might be permission issues
          console.log(`   ℹ️ Label already exists or couldn't be created: ${label}`);
        }
      }
    }
  }

  /**
   * Get color mappings for labels
   */
  private getLabelColors(): Map<string, string> {
    const colors = new Map<string, string>();
    
    // Priority labels - shades of red/orange/yellow
    colors.set('priority: high', 'd73a4a');       // Red
    colors.set('priority: medium', 'fbca04');     // Yellow
    colors.set('priority: low', 'c5def5');        // Light blue
    
    // Category labels - various colors
    colors.set('roadmap', '0075ca');              // Blue
    colors.set('enhancement', 'a2eeef');          // Light cyan
    colors.set('infrastructure', '5319e7');       // Purple
    colors.set('mobile', 'f9d0c4');               // Light orange
    colors.set('pwa', 'd4c5f9');                  // Light purple
    colors.set('ai', 'c2e0c6');                   // Light green
    colors.set('gamification', 'fef2c0');         // Light yellow
    colors.set('analytics', 'bfdadc');            // Light teal
    colors.set('accessibility', '006b75');        // Dark teal
    colors.set('security', 'b60205');             // Dark red
    
    return colors;
  }

  /**
   * Get description for labels
   */
  private getLabelDescription(label: string): string {
    const descriptions = new Map<string, string>();
    
    descriptions.set('roadmap', 'Feature from the project roadmap');
    descriptions.set('enhancement', 'New feature or request');
    descriptions.set('priority: high', 'High priority item');
    descriptions.set('priority: medium', 'Medium priority item');
    descriptions.set('priority: low', 'Low priority item');
    descriptions.set('infrastructure', 'Infrastructure and backend work');
    descriptions.set('mobile', 'Mobile-specific features');
    descriptions.set('pwa', 'Progressive Web App features');
    descriptions.set('ai', 'AI and machine learning features');
    descriptions.set('gamification', 'Gamification features');
    descriptions.set('analytics', 'Analytics and tracking');
    descriptions.set('accessibility', 'Accessibility improvements');
    descriptions.set('security', 'Security and privacy');
    
    // Timeline labels
    if (label.startsWith('timeline: ')) {
      return `Planned for ${label.replace('timeline: ', '')}`;
    }
    
    return '';
  }

  /**
   * Create GitHub issues (live mode)
   */
  private async createGitHubIssues(issues: IssueTemplate[]): Promise<void> {
    console.log(`\n   Creating ${issues.length} issues...\n`);

    // Ensure all required labels exist before creating issues
    await this.ensureLabelsExist(issues);

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      try {
        const labelArgs = issue.labels.map((l) => `--label "${l}"`).join(' ');
        const bodyFile = `/tmp/issue-body-${i}.md`;
        fs.writeFileSync(bodyFile, issue.body);

        const cmd = `gh issue create --title "${issue.title}" --body-file "${bodyFile}" ${labelArgs}`;
        execSync(cmd, { cwd: this.repoRoot, stdio: 'inherit' });

        fs.unlinkSync(bodyFile);
        console.log(`   ✅ Created: ${issue.title}`);
      } catch (error) {
        console.error(`   ❌ Failed to create: ${issue.title}`);
        console.error(`      ${error}`);
      }
    }
  }

  /**
   * Preview issues (dry run mode)
   */
  private previewIssues(issues: IssueTemplate[]): void {
    console.log(`\n   Preview of ${Math.min(5, issues.length)} issues:\n`);

    for (let i = 0; i < Math.min(5, issues.length); i++) {
      const issue = issues[i];
      console.log(`   ${i + 1}. ${issue.title}`);
      console.log(`      Labels: ${issue.labels.join(', ')}`);
      console.log(`      Body length: ${issue.body.length} chars\n`);
    }

    if (issues.length > 5) {
      console.log(`   ... and ${issues.length - 5} more issues\n`);
    }

    // Write full preview to file
    const previewPath = path.join(this.repoRoot, 'ROADMAP_ISSUES_PREVIEW.md');
    let previewContent = '# Roadmap Issues Preview\n\n';
    previewContent += `Total issues to create: ${issues.length}\n\n`;
    previewContent += '---\n\n';

    issues.forEach((issue, idx) => {
      previewContent += `## ${idx + 1}. ${issue.title}\n\n`;
      previewContent += `**Labels**: ${issue.labels.join(', ')}\n\n`;
      previewContent += issue.body;
      previewContent += '\n\n---\n\n';
    });

    fs.writeFileSync(previewPath, previewContent);
    console.log(`   📄 Full preview saved to: ROADMAP_ISSUES_PREVIEW.md\n`);
  }

  /**
   * Generate tracking checklist
   */
  private generateTrackingChecklist(
    validationResults: ValidationResult[],
    issues: IssueTemplate[]
  ): string {
    let checklist = '# CertLab Roadmap Feature Tracking\n\n';
    checklist += `Generated: ${new Date().toISOString()}\n\n`;
    checklist += `Total Features: ${this.features.length}\n`;
    checklist += `Implemented: ${validationResults.filter((r) => r.implemented).length}\n`;
    checklist += `Pending: ${validationResults.filter((r) => !r.implemented).length}\n`;
    checklist += `Issues Created: ${issues.length}\n\n`;
    checklist += '---\n\n';

    // Group by section
    const sections = new Map<string, ValidationResult[]>();
    validationResults.forEach((result) => {
      const section = result.feature.section;
      if (!sections.has(section)) {
        sections.set(section, []);
      }
      sections.get(section)!.push(result);
    });

    sections.forEach((results, section) => {
      checklist += `## ${section}\n\n`;

      results.forEach((result) => {
        const { feature } = result;
        const status = result.implemented ? '✅' : '❌';
        const confidence = result.confidence;

        checklist += `- [${result.implemented ? 'x' : ' '}] ${status} **${feature.title}**`;

        if (feature.quarter) {
          checklist += ` _(${feature.quarter})_`;
        }

        checklist += `\n`;

        if (feature.description) {
          checklist += `  - ${feature.description}\n`;
        }

        checklist += `  - Status: ${feature.status || 'Not Started'}\n`;
        checklist += `  - Validation: ${confidence}% confidence\n`;

        if (result.evidence.length > 0) {
          checklist += `  - Evidence: ${result.evidence[0]}\n`;
        }

        checklist += `  - Reference: [ROADMAP.md#L${feature.lineNumber}](https://github.com/archubbuck/certlab/blob/main/ROADMAP.md#L${feature.lineNumber})\n`;
        checklist += '\n';
      });

      checklist += '\n';
    });

    return checklist;
  }

  /**
   * Save checklist to file
   */
  private saveChecklist(checklist: string): void {
    const checklistPath = path.join(this.repoRoot, 'ROADMAP_TRACKING.md');
    fs.writeFileSync(checklistPath, checklist);
  }

  /**
   * Print summary
   */
  private printSummary(validationResults: ValidationResult[], issues: IssueTemplate[]): void {
    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Features Identified: ${this.features.length}`);
    console.log(`Implemented/Validated: ${validationResults.filter((r) => r.implemented).length}`);
    console.log(
      `Pending Implementation: ${validationResults.filter((r) => !r.implemented).length}`
    );
    console.log(`GitHub Issues ${this.dryRun ? 'to Create' : 'Created'}: ${issues.length}`);
    console.log('='.repeat(60));
  }
}

// Main execution
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

const tracker = new RoadmapTracker(dryRun);
tracker.run().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
