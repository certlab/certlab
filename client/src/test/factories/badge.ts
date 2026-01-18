/**
 * Test data factories for Badge and achievement entities
 */
import type { Badge, InsertBadge, UserBadge, InsertUserBadge } from '@shared/schema';

/**
 * Default badge for testing
 * Note: Uses current date/time for timestamps. Override as needed for time-sensitive tests.
 */
const DEFAULT_BADGE: Badge = {
  id: 1,
  name: 'First Steps',
  description: 'Complete your first quiz',
  icon: '🎯',
  category: 'progress',
  requirement: { type: 'quiz_count', value: 1 },
  color: 'blue',
  rarity: 'common',
  tier: 'bronze',
  points: 10,
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
};

/**
 * Creates a test Badge with optional overrides
 */
export function createBadge(overrides?: Partial<Badge>): Badge {
  return {
    ...DEFAULT_BADGE,
    ...overrides,
    createdAt: overrides?.createdAt || new Date(),
  };
}

/**
 * Creates a progress badge (quiz completion, etc.)
 */
export function createProgressBadge(overrides?: Partial<Badge>): Badge {
  return createBadge({
    ...overrides,
    category: 'progress',
    requirement: overrides?.requirement || { type: 'quiz_count', value: 10 },
  });
}

/**
 * Creates a performance badge (high scores, perfect scores, etc.)
 */
export function createPerformanceBadge(overrides?: Partial<Badge>): Badge {
  return createBadge({
    ...overrides,
    name: overrides?.name || 'Perfect Score',
    description: overrides?.description || 'Achieve a perfect score on a quiz',
    category: 'performance',
    requirement: overrides?.requirement || { type: 'perfect_score', value: 1 },
    rarity: 'uncommon',
    tier: 'silver',
    points: 25,
  });
}

/**
 * Creates a streak badge (daily login, quiz streaks, etc.)
 */
export function createStreakBadge(overrides?: Partial<Badge>): Badge {
  return createBadge({
    ...overrides,
    name: overrides?.name || 'Week Warrior',
    description: overrides?.description || 'Maintain a 7-day learning streak',
    category: 'streak',
    requirement: overrides?.requirement || { type: 'streak_days', value: 7 },
    rarity: 'rare',
    tier: 'gold',
    points: 50,
  });
}

/**
 * Creates a mastery badge (category completion, expertise, etc.)
 */
export function createMasteryBadge(overrides?: Partial<Badge>): Badge {
  return createBadge({
    ...overrides,
    name: overrides?.name || 'Security Expert',
    description: overrides?.description || 'Achieve 90% mastery in Security Management',
    category: 'mastery',
    requirement: overrides?.requirement || { type: 'category_mastery', categoryId: 1, value: 90 },
    rarity: 'legendary',
    tier: 'platinum',
    points: 100,
  });
}

/**
 * Creates multiple test badges with sequential IDs
 */
export function createBadges(count: number, baseOverrides?: Partial<Badge>): Badge[] {
  const badgeTemplates = [
    { name: 'First Steps', category: 'progress', rarity: 'common', tier: 'bronze' },
    { name: 'Getting Started', category: 'progress', rarity: 'common', tier: 'bronze' },
    { name: 'Quiz Master', category: 'performance', rarity: 'uncommon', tier: 'silver' },
    { name: 'Perfect Score', category: 'performance', rarity: 'rare', tier: 'gold' },
    { name: 'Week Warrior', category: 'streak', rarity: 'rare', tier: 'gold' },
    { name: 'Security Expert', category: 'mastery', rarity: 'legendary', tier: 'platinum' },
  ];

  return Array.from({ length: count }, (_, index) => {
    const template = badgeTemplates[index % badgeTemplates.length];
    return createBadge({
      ...baseOverrides,
      ...template,
      id: index + 1,
      name: `${template?.name} ${index + 1}`,
    });
  });
}

/**
 * Creates an InsertBadge object (for creation tests)
 */
export function createInsertBadge(overrides?: Partial<InsertBadge>): InsertBadge {
  return {
    name: overrides?.name || 'New Badge',
    description: overrides?.description || 'A new test badge',
    icon: overrides?.icon || '⭐',
    category: overrides?.category || 'progress',
    requirement: overrides?.requirement || { type: 'quiz_count', value: 1 },
    color: overrides?.color || 'blue',
    rarity: overrides?.rarity || 'common',
    tier: overrides?.tier || 'bronze',
    points: overrides?.points || 10,
  };
}

/**
 * Default user badge for testing
 */
const DEFAULT_USER_BADGE: UserBadge = {
  id: 1,
  userId: 'test-user-1',
  tenantId: 1,
  badgeId: 1,
  earnedAt: new Date('2024-01-01T10:00:00Z'),
  progress: 100,
  isNotified: false,
};

/**
 * Creates a test UserBadge with optional overrides
 */
export function createUserBadge(overrides?: Partial<UserBadge>): UserBadge {
  return {
    ...DEFAULT_USER_BADGE,
    ...overrides,
    earnedAt: overrides?.earnedAt || new Date(),
  };
}

/**
 * Creates an InsertUserBadge object (for creation tests)
 */
export function createInsertUserBadge(overrides?: Partial<InsertUserBadge>): InsertUserBadge {
  return {
    userId: overrides?.userId || 'test-user-1',
    tenantId: overrides?.tenantId || 1,
    badgeId: overrides?.badgeId || 1,
    progress: overrides?.progress || 0,
    isNotified: overrides?.isNotified || false,
  };
}

/**
 * Creates multiple user badges for a user
 */
export function createUserBadges(
  count: number,
  userId: string,
  baseOverrides?: Partial<UserBadge>
): UserBadge[] {
  return Array.from({ length: count }, (_, index) =>
    createUserBadge({
      ...baseOverrides,
      id: index + 1,
      userId,
      badgeId: index + 1,
    })
  );
}
