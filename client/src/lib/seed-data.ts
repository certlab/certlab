/**
 * Seed Data Module for CertLab
 * 
 * This module handles the initial data seeding for new CertLab installations.
 * When a user first loads the application, this module ensures that essential
 * data exists in IndexedDB, including:
 * 
 * - Default tenants (organizations)
 * - Certification categories (CISSP, CISM)
 * - Topic subcategories
 * - Sample questions
 * - Achievement badges
 * 
 * ## Versioning
 * 
 * The seed data is versioned using `SEED_VERSION`. When this version is
 * incremented, the seeding process will run again to update the data.
 * Currently at version 2.
 * 
 * ## Seeding Process
 * 
 * 1. Check if data already exists and matches current version
 * 2. If not, create tenants, categories, subcategories
 * 3. Add sample questions for each category
 * 4. Create achievement badges
 * 5. Save the seed version to prevent re-seeding
 * 
 * ## Usage
 * 
 * The seeding is called automatically in App.tsx on first load:
 * 
 * ```typescript
 * import { ensureDataSeeded } from './lib/seed-data';
 * 
 * useEffect(() => {
 *   ensureDataSeeded();
 * }, []);
 * ```
 * 
 * ## Customization
 * 
 * To add new seed data:
 * 1. Increment SEED_VERSION
 * 2. Add your data creation code in seedInitialData()
 * 3. The new data will be created on next app load
 * 
 * Note: Existing user data is preserved. Only new seed data is added.
 * 
 * @module seed-data
 */

import { clientStorage } from './client-storage';
import { indexedDBService } from './indexeddb';

const SEED_VERSION = 2;

export async function seedInitialData(): Promise<void> {
  // Check if data already exists and version
  const existingCategories = await clientStorage.getCategories();
  
  // Check seed version
  const versionSetting = await indexedDBService.get<{ key: string; value: number }>('settings', 'seedVersion');
  if (existingCategories.length > 0 && versionSetting?.value === SEED_VERSION) {
    console.log('Data already seeded (version', SEED_VERSION, ')');
    return;
  }

  console.log('Seeding initial data (version', SEED_VERSION, ')...');

  // Create tenants
  const existingTenants = await clientStorage.getTenants();
  if (existingTenants.length === 0) {
    await clientStorage.createTenant({
      name: 'Default Organization',
      domain: null,
      settings: {},
      isActive: true,
    });

    await clientStorage.createTenant({
      name: 'CISSP Training Center',
      domain: null,
      settings: { focusArea: 'CISSP' },
      isActive: true,
    });

    await clientStorage.createTenant({
      name: 'CISM Academy',
      domain: null,
      settings: { focusArea: 'CISM' },
      isActive: true,
    });

    console.log('Created initial tenants');
  }

  // Create categories
  const cissp = await clientStorage.createCategory({
    tenantId: 1,
    name: 'CISSP',
    description: 'Certified Information Systems Security Professional',
    icon: 'shield',
  });

  const cism = await clientStorage.createCategory({
    tenantId: 1,
    name: 'CISM',
    description: 'Certified Information Security Manager',
    icon: 'briefcase',
  });

  // Create subcategories for CISSP
  const securityGovernance = await clientStorage.createSubcategory({
    tenantId: 1,
    categoryId: cissp.id,
    name: 'Security and Risk Management',
    description: 'Security governance, compliance, and risk management',
  });

  const assetSecurity = await clientStorage.createSubcategory({
    tenantId: 1,
    categoryId: cissp.id,
    name: 'Asset Security',
    description: 'Protecting security of assets',
  });

  const securityArchitecture = await clientStorage.createSubcategory({
    tenantId: 1,
    categoryId: cissp.id,
    name: 'Security Architecture and Engineering',
    description: 'Engineering and managing security',
  });

  // Create subcategories for CISM
  const infoSecGovernance = await clientStorage.createSubcategory({
    tenantId: 1,
    categoryId: cism.id,
    name: 'Information Security Governance',
    description: 'Establishing and maintaining IS governance framework',
  });

  const riskManagement = await clientStorage.createSubcategory({
    tenantId: 1,
    categoryId: cism.id,
    name: 'Information Risk Management',
    description: 'Managing information security risk',
  });

  // Create sample questions for CISSP
  await clientStorage.createQuestion({
    tenantId: 1,
    categoryId: cissp.id,
    subcategoryId: securityGovernance.id,
    text: 'What is the primary goal of information security?',
    options: [
      { id: 0, text: 'Confidentiality' },
      { id: 1, text: 'Integrity' },
      { id: 2, text: 'Availability' },
      { id: 3, text: 'All of the above' },
    ],
    correctAnswer: 3,
    explanation: 'Information security aims to maintain the CIA triad: Confidentiality, Integrity, and Availability of information.',
    difficultyLevel: 1,
    tags: ['fundamentals', 'CIA triad'],
  });

  await clientStorage.createQuestion({
    tenantId: 1,
    categoryId: cissp.id,
    subcategoryId: securityGovernance.id,
    text: 'Which of the following is NOT a security control type?',
    options: [
      { id: 0, text: 'Administrative' },
      { id: 1, text: 'Technical' },
      { id: 2, text: 'Physical' },
      { id: 3, text: 'Logical' },
    ],
    correctAnswer: 3,
    explanation: 'Security controls are typically classified as Administrative, Technical, or Physical. "Logical" is sometimes used synonymously with "Technical" but is not a separate category.',
    difficultyLevel: 2,
    tags: ['controls', 'fundamentals'],
  });

  await clientStorage.createQuestion({
    tenantId: 1,
    categoryId: cissp.id,
    subcategoryId: assetSecurity.id,
    text: 'What is the purpose of data classification?',
    options: [
      { id: 0, text: 'To organize files alphabetically' },
      { id: 1, text: 'To determine appropriate security controls' },
      { id: 2, text: 'To delete old data' },
      { id: 3, text: 'To encrypt all data' },
    ],
    correctAnswer: 1,
    explanation: 'Data classification helps organizations determine the appropriate level of security controls needed based on the sensitivity and criticality of the data.',
    difficultyLevel: 1,
    tags: ['data classification', 'asset security'],
  });

  await clientStorage.createQuestion({
    tenantId: 1,
    categoryId: cissp.id,
    subcategoryId: securityArchitecture.id,
    text: 'What does "defense in depth" mean?',
    options: [
      { id: 0, text: 'Having one strong security control' },
      { id: 1, text: 'Using multiple layers of security controls' },
      { id: 2, text: 'Focusing only on perimeter security' },
      { id: 3, text: 'Relying solely on user training' },
    ],
    correctAnswer: 1,
    explanation: 'Defense in depth is a security strategy that uses multiple layers of security controls throughout an IT system to provide redundancy in case one control fails.',
    difficultyLevel: 2,
    tags: ['defense in depth', 'architecture'],
  });

  // Create sample questions for CISM
  await clientStorage.createQuestion({
    tenantId: 1,
    categoryId: cism.id,
    subcategoryId: infoSecGovernance.id,
    text: 'What is the primary purpose of an information security governance framework?',
    options: [
      { id: 0, text: 'To install firewalls' },
      { id: 1, text: 'To align security with business objectives' },
      { id: 2, text: 'To conduct penetration tests' },
      { id: 3, text: 'To write security policies' },
    ],
    correctAnswer: 1,
    explanation: 'Information security governance ensures that security strategies and initiatives support and align with business objectives and requirements.',
    difficultyLevel: 2,
    tags: ['governance', 'business alignment'],
  });

  await clientStorage.createQuestion({
    tenantId: 1,
    categoryId: cism.id,
    subcategoryId: riskManagement.id,
    text: 'What is risk appetite?',
    options: [
      { id: 0, text: 'The amount of risk an organization is willing to accept' },
      { id: 1, text: 'The total amount of risk in an organization' },
      { id: 2, text: 'The cost of implementing security controls' },
      { id: 3, text: 'The probability of a security breach' },
    ],
    correctAnswer: 0,
    explanation: 'Risk appetite is the amount and type of risk that an organization is willing to pursue, retain, or take in pursuit of its objectives.',
    difficultyLevel: 2,
    tags: ['risk management', 'risk appetite'],
  });

  // Create achievement badges
  await indexedDBService.put('badges', {
    id: 1,
    name: 'First Steps',
    description: 'Complete your first quiz',
    icon: '🎯',
    category: 'progress',
    requirement: { type: 'quizzes_completed', value: 1 },
    color: 'blue',
    rarity: 'common',
    points: 10,
    createdAt: new Date(),
  });

  await indexedDBService.put('badges', {
    id: 2,
    name: 'Quiz Master',
    description: 'Complete 10 quizzes',
    icon: '🏆',
    category: 'progress',
    requirement: { type: 'quizzes_completed', value: 10 },
    color: 'gold',
    rarity: 'uncommon',
    points: 50,
    createdAt: new Date(),
  });

  await indexedDBService.put('badges', {
    id: 3,
    name: 'Perfect Score',
    description: 'Score 100% on a quiz',
    icon: '💯',
    category: 'performance',
    requirement: { type: 'perfect_score', value: 1 },
    color: 'purple',
    rarity: 'rare',
    points: 100,
    createdAt: new Date(),
  });

  await indexedDBService.put('badges', {
    id: 4,
    name: 'Streak Champion',
    description: 'Maintain a 7-day study streak',
    icon: '🔥',
    category: 'streak',
    requirement: { type: 'study_streak', value: 7 },
    color: 'orange',
    rarity: 'rare',
    points: 75,
    createdAt: new Date(),
  });

  await indexedDBService.put('badges', {
    id: 5,
    name: 'Knowledge Seeker',
    description: 'Read 5 lecture materials',
    icon: '📚',
    category: 'progress',
    requirement: { type: 'lectures_read', value: 5 },
    color: 'green',
    rarity: 'common',
    points: 25,
    createdAt: new Date(),
  });

  // Save seed version
  await indexedDBService.put('settings', { key: 'seedVersion', value: SEED_VERSION });
  
  console.log('Initial data seeded successfully (version', SEED_VERSION, ')');
}

// Function to check if seeding is needed and perform it
export async function ensureDataSeeded(): Promise<void> {
  try {
    await seedInitialData();
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}
