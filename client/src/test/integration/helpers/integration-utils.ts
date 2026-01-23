/**
 * Integration Test Utilities
 *
 * Common utilities and helpers for integration tests
 */

import { firebaseMock } from '../mocks/firebase-mock';
import { firestoreMock } from '../mocks/firestore-mock';
import type { MockFirebaseUser } from '../mocks/firebase-mock';

/**
 * Reset all integration test mocks to initial state
 * Ensures categories collection always exists for health checks
 */
export function resetIntegrationMocks(): void {
  firebaseMock.reset();
  firestoreMock.reset();

  // Ensure Firestore is initialized after reset
  // This prevents connection check timeouts
  // Note: reset() already sets isInitialized = true and seeds default data
}

/**
 * Create a test user with default properties
 */
export function createTestUser(overrides?: Partial<MockFirebaseUser>): MockFirebaseUser {
  return {
    uid: `test-user-${Date.now()}`,
    email: 'testuser@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/avatar.jpg',
    emailVerified: true,
    ...overrides,
  };
}

/**
 * Create multiple test users
 */
export function createTestUsers(count: number, baseEmail = 'user'): MockFirebaseUser[] {
  return Array.from({ length: count }, (_, i) =>
    createTestUser({
      uid: `test-user-${i + 1}`,
      email: `${baseEmail}${i + 1}@example.com`,
      displayName: `Test User ${i + 1}`,
    })
  );
}

/**
 * Simulate user sign-in for integration tests
 */
export async function signInTestUser(user?: Partial<MockFirebaseUser>): Promise<MockFirebaseUser> {
  const testUser = createTestUser(user);
  firebaseMock.setUser(testUser);

  // Wait for auth state to propagate
  await new Promise((resolve) => setTimeout(resolve, 50));

  return testUser;
}

/**
 * Simulate user sign-out for integration tests
 */
export async function signOutTestUser(): Promise<void> {
  await firebaseMock.signOut();

  // Wait for auth state to propagate
  await new Promise((resolve) => setTimeout(resolve, 50));
}

/**
 * Seed test data into Firestore mock
 */
export async function seedTestData(data: {
  tenants?: Array<{ id: number; name: string; isActive: boolean }>;
  users?: Array<{ id: string; email: string; tenantId: number; [key: string]: any }>;
  categories?: Array<{ id: number; name: string; tenantId: number; [key: string]: any }>;
  subcategories?: Array<{ id: number; name: string; categoryId: number; [key: string]: any }>;
  questions?: Array<{ id: number; text: string; categoryId: number; [key: string]: any }>;
  quizzes?: Array<{ id: number; userId: string; [key: string]: any }>;
  badges?: Array<{ id: number; name: string; [key: string]: any }>;
}): Promise<void> {
  const firestoreData: Record<string, Array<{ id: string; data: any }>> = {};

  // Convert data to Firestore format
  if (data.tenants) {
    firestoreData.tenants = data.tenants.map((t) => ({
      id: t.id.toString(),
      data: t,
    }));
  }

  if (data.users) {
    firestoreData.users = data.users.map((u) => ({
      id: u.id,
      data: u,
    }));
  }

  if (data.categories) {
    firestoreData.categories = data.categories.map((c) => ({
      id: c.id.toString(),
      data: c,
    }));
  }

  if (data.subcategories) {
    firestoreData.subcategories = data.subcategories.map((s) => ({
      id: s.id.toString(),
      data: s,
    }));
  }

  if (data.questions) {
    firestoreData.questions = data.questions.map((q) => ({
      id: q.id.toString(),
      data: q,
    }));
  }

  if (data.badges) {
    firestoreData.badges = data.badges.map((b) => ({
      id: b.id.toString(),
      data: b,
    }));
  }

  // Seed data into Firestore mock
  await firestoreMock.seedData(firestoreData);

  // Seed user-specific collections
  if (data.quizzes) {
    for (const quiz of data.quizzes) {
      await firestoreMock.setSubcollectionDocument(
        'users',
        quiz.userId,
        'quizzes',
        quiz.id.toString(),
        quiz
      );
    }
  }
}

/**
 * Wait for async operations to complete
 * Useful for waiting on state updates and side effects
 */
export async function waitForAsync(ms = 100): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition timed out');
    }
    await waitForAsync(interval);
  }
}

/**
 * Create test tenant data
 */
export function createTestTenant(id: number, overrides?: Partial<any>) {
  return {
    id,
    name: `Test Tenant ${id}`,
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create test category data
 */
export function createTestCategory(id: number, tenantId: number, overrides?: Partial<any>) {
  return {
    id,
    name: `Category ${id}`,
    description: `Test category ${id}`,
    tenantId,
    ...overrides,
  };
}

/**
 * Create test question data
 */
export function createTestQuestion(
  id: number,
  categoryId: number,
  subcategoryId: number,
  overrides?: Partial<any>
) {
  return {
    id,
    text: `Question ${id}`,
    categoryId,
    subcategoryId,
    options: [
      { text: 'Option A', isCorrect: true },
      { text: 'Option B', isCorrect: false },
      { text: 'Option C', isCorrect: false },
      { text: 'Option D', isCorrect: false },
    ],
    explanation: `Explanation for question ${id}`,
    difficulty: 1,
    ...overrides,
  };
}

/**
 * Create test quiz data
 */
export function createTestQuiz(
  id: number,
  userId: string,
  tenantId: number,
  overrides?: Partial<any>
) {
  return {
    id,
    userId,
    tenantId,
    name: `Quiz ${id}`,
    categoryIds: [1],
    subcategoryIds: [],
    difficultyLevels: [1],
    numberOfQuestions: 10,
    createdAt: new Date().toISOString(),
    completedAt: null,
    score: null,
    ...overrides,
  };
}

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to be defined');
  }
}

/**
 * Assert that arrays have the same length and elements
 */
export function assertArrayEquals<T>(actual: T[], expected: T[], message?: string): void {
  if (actual.length !== expected.length) {
    throw new Error(
      message || `Array length mismatch: expected ${expected.length}, got ${actual.length}`
    );
  }

  for (let i = 0; i < actual.length; i++) {
    if (JSON.stringify(actual[i]) !== JSON.stringify(expected[i])) {
      throw new Error(
        message ||
          `Array element mismatch at index ${i}: expected ${JSON.stringify(expected[i])}, got ${JSON.stringify(actual[i])}`
      );
    }
  }
}
