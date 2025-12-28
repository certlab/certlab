/**
 * Seed Gamification Data to Firestore
 *
 * This script seeds the Firestore database with:
 * - Quests (daily, weekly, monthly)
 * - Daily rewards (7-day cycle)
 *
 * Usage:
 *   npx tsx scripts/seed-gamification-data.ts
 *
 * Prerequisites:
 * - Firebase credentials configured in environment
 * - Admin SDK initialized
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  // Use service account key from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    console.error('Error: FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
    console.error('Please set it to the contents of your Firebase service account key JSON file');
    process.exit(1);
  }
}

const db = getFirestore();

/**
 * Quest definitions
 */
const quests = [
  // Daily Quests
  {
    id: 1,
    title: 'Daily Learner',
    description: 'Complete 3 quizzes today',
    type: 'daily',
    requirement: {
      type: 'quizzes_completed',
      target: 3,
    },
    reward: {
      points: 50,
    },
    isActive: true,
    validFrom: new Date(),
    validUntil: null,
    createdAt: new Date(),
  },
  {
    id: 2,
    title: 'Question Champion',
    description: 'Answer 20 questions correctly today',
    type: 'daily',
    requirement: {
      type: 'questions_answered',
      target: 20,
    },
    reward: {
      points: 75,
    },
    isActive: true,
    validFrom: new Date(),
    validUntil: null,
    createdAt: new Date(),
  },
  {
    id: 3,
    title: 'Perfect Score',
    description: 'Get 100% on a quiz',
    type: 'daily',
    requirement: {
      type: 'perfect_scores',
      target: 1,
    },
    reward: {
      points: 100,
      title: 'Perfectionist',
    },
    isActive: true,
    validFrom: new Date(),
    validUntil: null,
    createdAt: new Date(),
  },

  // Weekly Quests
  {
    id: 4,
    title: 'Weekly Warrior',
    description: 'Complete 20 quizzes this week',
    type: 'weekly',
    requirement: {
      type: 'quizzes_completed',
      target: 20,
    },
    reward: {
      points: 250,
      title: 'Study Warrior',
    },
    isActive: true,
    validFrom: new Date(),
    validUntil: null,
    createdAt: new Date(),
  },
  {
    id: 5,
    title: 'Knowledge Seeker',
    description: 'Answer 100 questions correctly this week',
    type: 'weekly',
    requirement: {
      type: 'questions_answered',
      target: 100,
    },
    reward: {
      points: 300,
    },
    isActive: true,
    validFrom: new Date(),
    validUntil: null,
    createdAt: new Date(),
  },
  {
    id: 6,
    title: 'Streak Master',
    description: 'Maintain a 7-day study streak',
    type: 'weekly',
    requirement: {
      type: 'study_streak',
      target: 7,
    },
    reward: {
      points: 500,
      title: 'Streak Champion',
    },
    isActive: true,
    validFrom: new Date(),
    validUntil: null,
    createdAt: new Date(),
  },

  // Monthly Quests
  {
    id: 7,
    title: 'Monthly Master',
    description: 'Complete 100 quizzes this month',
    type: 'monthly',
    requirement: {
      type: 'quizzes_completed',
      target: 100,
    },
    reward: {
      points: 1000,
      title: 'Quiz Master',
    },
    isActive: true,
    validFrom: new Date(),
    validUntil: null,
    createdAt: new Date(),
  },
  {
    id: 8,
    title: 'Knowledge Guru',
    description: 'Answer 500 questions correctly this month',
    type: 'monthly',
    requirement: {
      type: 'questions_answered',
      target: 500,
    },
    reward: {
      points: 1500,
      title: 'Knowledge Guru',
    },
    isActive: true,
    validFrom: new Date(),
    validUntil: null,
    createdAt: new Date(),
  },
  {
    id: 9,
    title: 'Perfect Month',
    description: 'Get 10 perfect scores this month',
    type: 'monthly',
    requirement: {
      type: 'perfect_scores',
      target: 10,
    },
    reward: {
      points: 2000,
      title: 'Perfection Seeker',
    },
    isActive: true,
    validFrom: new Date(),
    validUntil: null,
    createdAt: new Date(),
  },
];

/**
 * Daily reward definitions (7-day cycle)
 */
const dailyRewards = [
  {
    id: 1,
    day: 1,
    reward: {
      points: 10,
    },
    description: 'Day 1 login reward',
  },
  {
    id: 2,
    day: 2,
    reward: {
      points: 15,
    },
    description: 'Day 2 login reward',
  },
  {
    id: 3,
    day: 3,
    reward: {
      points: 20,
    },
    description: 'Day 3 login reward',
  },
  {
    id: 4,
    day: 4,
    reward: {
      points: 25,
    },
    description: 'Day 4 login reward',
  },
  {
    id: 5,
    day: 5,
    reward: {
      points: 30,
    },
    description: 'Day 5 login reward',
  },
  {
    id: 6,
    day: 6,
    reward: {
      points: 40,
    },
    description: 'Day 6 login reward',
  },
  {
    id: 7,
    day: 7,
    reward: {
      points: 50,
      streakFreeze: true,
    },
    description: 'Day 7 login reward - includes streak freeze!',
  },
];

/**
 * Seed quests to Firestore
 */
async function seedQuests() {
  console.log('Seeding quests...');

  const batch = db.batch();

  for (const quest of quests) {
    const questRef = db.collection('quests').doc(quest.id.toString());
    batch.set(questRef, quest);
  }

  await batch.commit();
  console.log(`✓ Seeded ${quests.length} quests`);
}

/**
 * Seed daily rewards to Firestore
 */
async function seedDailyRewards() {
  console.log('Seeding daily rewards...');

  const batch = db.batch();

  for (const reward of dailyRewards) {
    const rewardRef = db.collection('dailyRewards').doc(reward.id.toString());
    batch.set(rewardRef, reward);
  }

  await batch.commit();
  console.log(`✓ Seeded ${dailyRewards.length} daily rewards`);
}

/**
 * Main seed function
 */
async function main() {
  try {
    console.log('Starting gamification data seeding...\n');

    await seedQuests();
    await seedDailyRewards();

    console.log('\n✓ All gamification data seeded successfully!');
    console.log('\nSummary:');
    console.log(`  - ${quests.filter((q) => q.type === 'daily').length} daily quests`);
    console.log(`  - ${quests.filter((q) => q.type === 'weekly').length} weekly quests`);
    console.log(`  - ${quests.filter((q) => q.type === 'monthly').length} monthly quests`);
    console.log(`  - ${dailyRewards.length} daily rewards (7-day cycle)`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding gamification data:', error);
    process.exit(1);
  }
}

// Run the seeding
main();
