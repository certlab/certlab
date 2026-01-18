/**
 * Test data factories for User entities
 * Provides factory functions to create test User objects with sensible defaults
 */
import type { User, InsertUser } from '@shared/schema';

/**
 * Default user for testing
 * Note: Uses current date/time for timestamps. Override as needed for time-sensitive tests.
 */
const DEFAULT_USER: User = {
  id: 'test-user-1',
  email: 'test@example.com',
  passwordHash: null,
  firstName: 'Test',
  lastName: 'User',
  profileImageUrl: null,
  role: 'user',
  tenantId: 1,
  certificationGoals: [],
  studyPreferences: null,
  skillsAssessment: null,
  polarCustomerId: null,
  tokenBalance: 100,
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  updatedAt: new Date(),
};

/**
 * Creates a test User with optional overrides
 *
 * @example
 * const user = createUser({ email: 'custom@example.com', role: 'admin' });
 */
export function createUser(overrides?: Partial<User>): User {
  return {
    ...DEFAULT_USER,
    ...overrides,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  };
}

/**
 * Creates a test admin User
 */
export function createAdminUser(overrides?: Partial<User>): User {
  return createUser({
    ...overrides,
    role: 'admin',
    email: overrides?.email || 'admin@example.com',
  });
}

/**
 * Creates an InsertUser object (for creation tests)
 */
export function createInsertUser(overrides?: Partial<InsertUser>): InsertUser {
  return {
    id: overrides?.id || 'new-user-1',
    email: overrides?.email || 'newuser@example.com',
    passwordHash: overrides?.passwordHash || null,
    firstName: overrides?.firstName || 'New',
    lastName: overrides?.lastName || 'User',
    profileImageUrl: overrides?.profileImageUrl || null,
    role: overrides?.role || 'user',
    tenantId: overrides?.tenantId || 1,
    certificationGoals: overrides?.certificationGoals || [],
    studyPreferences: overrides?.studyPreferences || null,
    skillsAssessment: overrides?.skillsAssessment || null,
    polarCustomerId: overrides?.polarCustomerId || null,
    tokenBalance: overrides?.tokenBalance || 100,
  };
}

/**
 * Creates multiple test users with sequential IDs
 *
 * @example
 * const users = createUsers(3); // Creates 3 users with IDs test-user-1, test-user-2, test-user-3
 */
export function createUsers(count: number, baseOverrides?: Partial<User>): User[] {
  return Array.from({ length: count }, (_, index) =>
    createUser({
      ...baseOverrides,
      id: `test-user-${index + 1}`,
      email: `test${index + 1}@example.com`,
    })
  );
}

/**
 * Creates a user with full profile and preferences
 */
export function createFullProfileUser(overrides?: Partial<User>): User {
  return createUser({
    ...overrides,
    firstName: 'John',
    lastName: 'Doe',
    profileImageUrl: 'https://example.com/avatar.jpg',
    certificationGoals: ['CISSP', 'CISM'],
    studyPreferences: {
      dailyTimeMinutes: 30,
      preferredDifficulty: 'intermediate',
      focusAreas: ['Security Management', 'Risk Assessment'],
      studyDays: ['Monday', 'Wednesday', 'Friday'],
      reminderTime: '09:00',
    },
    skillsAssessment: {
      experienceLevel: 'intermediate',
      relevantExperience: ['IT Security', 'Network Administration'],
      learningStyle: 'visual',
      completedCertifications: ['Security+'],
      motivations: ['Career advancement', 'Knowledge improvement'],
    },
  });
}
