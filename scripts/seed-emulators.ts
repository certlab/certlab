#!/usr/bin/env node
/**
 * Seed Firebase Emulators with Test Data
 *
 * This script populates the Firebase Emulator Suite with test data for local development.
 * It creates:
 * - Test users (regular and admin)
 * - Certification categories (CISSP, CISM)
 * - Sample questions
 * - Badges and achievements
 * - Study groups
 *
 * Usage:
 *   npx tsx scripts/seed-emulators.ts
 *
 * Prerequisites:
 * - Firebase Emulators must be running (npm run emulators:start)
 * - VITE_USE_FIREBASE_EMULATOR=true in environment
 *
 * Note: This script uses the Firebase Admin SDK to seed emulator data.
 * For production seeding, use proper service account credentials.
 */

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

console.log('🌱 Firebase Emulator Data Seeding Script');
console.log('========================================\n');

// Check if running against emulator
if (process.env.VITE_USE_FIREBASE_EMULATOR !== 'true') {
  console.warn('⚠️  Warning: VITE_USE_FIREBASE_EMULATOR is not set to "true"');
  console.warn('This script is designed for Firebase Emulators only.');
  console.warn('To proceed, set: VITE_USE_FIREBASE_EMULATOR=true\n');
}

// Get project ID from environment or use default
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'demo-certlab';

if (!process.env.VITE_FIREBASE_PROJECT_ID) {
  console.log(
    'ℹ️  Using default Firebase projectId "demo-certlab" for emulator seeding.\n' +
      '   Set VITE_FIREBASE_PROJECT_ID to override.\n'
  );
}

// Initialize Firebase Admin SDK for Emulator
let app: App;
if (getApps().length === 0) {
  // For emulator, we can initialize without credentials
  app = initializeApp({
    projectId,
  });
  
  // Configure to use emulator
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  
  console.log('✓ Firebase Admin SDK initialized for emulator\n');
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Seed test users
 */
async function seedUsers() {
  console.log('📝 Seeding test users...');
  
  const users = [
    {
      uid: 'test-user-1',
      email: 'user@certlab.local',
      password: 'password123',
      displayName: 'Test User',
      role: 'user',
    },
    {
      uid: 'test-admin-1',
      email: 'admin@certlab.local',
      password: 'admin123',
      displayName: 'Admin User',
      role: 'admin',
    },
    {
      uid: 'test-contributor-1',
      email: 'contributor@certlab.local',
      password: 'contributor123',
      displayName: 'Contributor User',
      role: 'user',
    },
  ];

  for (const userData of users) {
    try {
      // Create auth user
      const { uid, email, password, displayName, ...profileData } = userData;
      
      try {
        await auth.createUser({
          uid,
          email,
          password,
          displayName,
        });
        console.log(`  ✓ Created auth user: ${email}`);
      } catch (error: any) {
        if (error.code === 'auth/uid-already-exists') {
          console.log(`  ℹ User already exists: ${email}`);
        } else {
          throw error;
        }
      }

      // Create Firestore user profile
      await db.collection('users').doc(uid).set({
        email,
        displayName,
        role: profileData.role,
        tenantId: 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`  ✓ Created Firestore profile: ${email}`);
    } catch (error) {
      console.error(`  ✗ Error creating user ${userData.email}:`, error);
    }
  }
  
  console.log('');
}

/**
 * Seed categories
 */
async function seedCategories() {
  console.log('📚 Seeding categories...');
  
  const categories = [
    {
      id: 'cissp',
      name: 'CISSP',
      description: 'Certified Information Systems Security Professional',
      questionCount: 0,
      createdAt: Timestamp.now(),
    },
    {
      id: 'cism',
      name: 'CISM',
      description: 'Certified Information Security Manager',
      questionCount: 0,
      createdAt: Timestamp.now(),
    },
    {
      id: 'security-plus',
      name: 'Security+',
      description: 'CompTIA Security+ Certification',
      questionCount: 0,
      createdAt: Timestamp.now(),
    },
  ];

  for (const category of categories) {
    try {
      await db.collection('categories').doc(category.id).set(category);
      console.log(`  ✓ Created category: ${category.name}`);
    } catch (error) {
      console.error(`  ✗ Error creating category ${category.name}:`, error);
    }
  }
  
  console.log('');
}

/**
 * Seed subcategories
 */
async function seedSubcategories() {
  console.log('📂 Seeding subcategories...');
  
  const subcategories = [
    // CISSP Domains
    { id: 'cissp-1', categoryId: 'cissp', name: 'Security and Risk Management', order: 1 },
    { id: 'cissp-2', categoryId: 'cissp', name: 'Asset Security', order: 2 },
    { id: 'cissp-3', categoryId: 'cissp', name: 'Security Architecture and Engineering', order: 3 },
    { id: 'cissp-4', categoryId: 'cissp', name: 'Communication and Network Security', order: 4 },
    { id: 'cissp-5', categoryId: 'cissp', name: 'Identity and Access Management', order: 5 },
    { id: 'cissp-6', categoryId: 'cissp', name: 'Security Assessment and Testing', order: 6 },
    { id: 'cissp-7', categoryId: 'cissp', name: 'Security Operations', order: 7 },
    { id: 'cissp-8', categoryId: 'cissp', name: 'Software Development Security', order: 8 },
    
    // CISM Domains
    { id: 'cism-1', categoryId: 'cism', name: 'Information Security Governance', order: 1 },
    { id: 'cism-2', categoryId: 'cism', name: 'Information Risk Management', order: 2 },
    { id: 'cism-3', categoryId: 'cism', name: 'Information Security Program', order: 3 },
    { id: 'cism-4', categoryId: 'cism', name: 'Incident Management', order: 4 },
  ];

  for (const subcategory of subcategories) {
    try {
      await db.collection('subcategories').doc(subcategory.id).set({
        ...subcategory,
        createdAt: Timestamp.now(),
      });
      console.log(`  ✓ Created subcategory: ${subcategory.name}`);
    } catch (error) {
      console.error(`  ✗ Error creating subcategory ${subcategory.name}:`, error);
    }
  }
  
  console.log('');
}

/**
 * Seed sample questions
 */
async function seedQuestions() {
  console.log('❓ Seeding sample questions...');
  
  const questions = [
    {
      id: 'q-cissp-1',
      categoryId: 'cissp',
      subcategoryId: 'cissp-1',
      question: 'What is the primary goal of information security governance?',
      answers: [
        { text: 'To ensure business objectives are achieved securely', correct: true },
        { text: 'To implement all available security controls', correct: false },
        { text: 'To eliminate all security risks', correct: false },
        { text: 'To maximize security spending', correct: false },
      ],
      explanation: 'Information security governance aligns security strategy with business objectives, ensuring that security supports and enables business goals rather than hindering them.',
      difficulty: 'medium',
      tags: ['governance', 'risk-management'],
      createdAt: Timestamp.now(),
    },
    {
      id: 'q-cissp-2',
      categoryId: 'cissp',
      subcategoryId: 'cissp-5',
      question: 'Which authentication factor is "something you are"?',
      answers: [
        { text: 'Password', correct: false },
        { text: 'Security token', correct: false },
        { text: 'Biometric scan', correct: true },
        { text: 'PIN code', correct: false },
      ],
      explanation: 'Biometric authentication (fingerprint, iris scan, facial recognition) represents "something you are" - an inherent physical characteristic of the user.',
      difficulty: 'easy',
      tags: ['authentication', 'access-control'],
      createdAt: Timestamp.now(),
    },
    {
      id: 'q-cism-1',
      categoryId: 'cism',
      subcategoryId: 'cism-2',
      question: 'What is the primary purpose of risk assessment?',
      answers: [
        { text: 'To eliminate all organizational risks', correct: false },
        { text: 'To identify and evaluate potential threats and vulnerabilities', correct: true },
        { text: 'To implement security controls', correct: false },
        { text: 'To satisfy compliance requirements', correct: false },
      ],
      explanation: 'Risk assessment identifies and evaluates threats, vulnerabilities, and potential impact to help organizations make informed decisions about risk treatment.',
      difficulty: 'medium',
      tags: ['risk-management', 'assessment'],
      createdAt: Timestamp.now(),
    },
  ];

  for (const question of questions) {
    try {
      await db.collection('questions').doc(question.id).set(question);
      console.log(`  ✓ Created question: ${question.question.substring(0, 50)}...`);
    } catch (error) {
      console.error(`  ✗ Error creating question:`, error);
    }
  }
  
  console.log('');
}

/**
 * Seed badges
 */
async function seedBadges() {
  console.log('🏆 Seeding badges...');
  
  const badges = [
    {
      id: 'first-quiz',
      name: 'First Steps',
      description: 'Complete your first quiz',
      icon: '🎯',
      requirement: { type: 'quizzes_completed', target: 1 },
      createdAt: Timestamp.now(),
    },
    {
      id: 'quiz-streak-7',
      name: 'Week Warrior',
      description: 'Maintain a 7-day study streak',
      icon: '🔥',
      requirement: { type: 'streak_days', target: 7 },
      createdAt: Timestamp.now(),
    },
    {
      id: 'perfect-score',
      name: 'Perfectionist',
      description: 'Achieve a perfect score on any quiz',
      icon: '⭐',
      requirement: { type: 'perfect_quiz', target: 1 },
      createdAt: Timestamp.now(),
    },
    {
      id: 'quiz-master',
      name: 'Quiz Master',
      description: 'Complete 100 quizzes',
      icon: '👑',
      requirement: { type: 'quizzes_completed', target: 100 },
      createdAt: Timestamp.now(),
    },
  ];

  for (const badge of badges) {
    try {
      await db.collection('badges').doc(badge.id).set(badge);
      console.log(`  ✓ Created badge: ${badge.name}`);
    } catch (error) {
      console.error(`  ✗ Error creating badge ${badge.name}:`, error);
    }
  }
  
  console.log('');
}

/**
 * Seed study groups
 */
async function seedStudyGroups() {
  console.log('👥 Seeding study groups...');
  
  const studyGroups = [
    {
      id: 'cissp-study-group',
      name: 'CISSP Study Group',
      description: 'Collaborative learning for CISSP certification',
      categoryId: 'cissp',
      memberCount: 0,
      createdAt: Timestamp.now(),
      isPublic: true,
    },
    {
      id: 'cism-study-group',
      name: 'CISM Study Group',
      description: 'Prepare for CISM certification together',
      categoryId: 'cism',
      memberCount: 0,
      createdAt: Timestamp.now(),
      isPublic: true,
    },
  ];

  for (const group of studyGroups) {
    try {
      await db.collection('studyGroups').doc(group.id).set(group);
      console.log(`  ✓ Created study group: ${group.name}`);
    } catch (error) {
      console.error(`  ✗ Error creating study group ${group.name}:`, error);
    }
  }
  
  console.log('');
}

/**
 * Main seeding function
 */
async function main() {
  try {
    console.log('Starting data seed...\n');
    
    await seedUsers();
    await seedCategories();
    await seedSubcategories();
    await seedQuestions();
    await seedBadges();
    await seedStudyGroups();
    
    console.log('✅ Seeding completed successfully!\n');
    console.log('Test Accounts:');
    console.log('  Regular User: user@certlab.local / password123');
    console.log('  Admin User:   admin@certlab.local / admin123');
    console.log('  Contributor:  contributor@certlab.local / contributor123');
    console.log('');
    console.log('View data in Emulator UI: http://localhost:4000');
    console.log('Start dev server: npm run dev');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
main();
