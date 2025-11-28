/**
 * IndexedDB Service for CertLab
 *
 * This module provides a low-level IndexedDB wrapper that serves as the
 * persistent storage layer for the client-side application. It mirrors
 * the PostgreSQL schema used in the server version, allowing for
 * consistent data structures across both architectures.
 *
 * ## Architecture Overview
 *
 * IndexedDBService <-- ClientStorage <-- TanStack Query <-- React Components
 *
 * - IndexedDBService: Low-level CRUD operations on IndexedDB stores
 * - ClientStorage (client-storage.ts): Business logic and API abstraction
 * - TanStack Query (queryClient.ts): Caching and async state management
 * - React Components: UI layer
 *
 * ## Database Schema
 *
 * Current version: 3
 *
 * Stores:
 * - tenants: Multi-tenant organization data
 * - users: User accounts with credentials and preferences
 * - categories: Certification categories (e.g., CISSP, CISM)
 * - subcategories: Topic areas within categories
 * - questions: Question bank with options and explanations
 * - quizzes: Quiz attempts with scores and answers
 * - userProgress: Learning progress per category
 * - masteryScores: Performance tracking per subcategory
 * - lectures: Study materials and notes
 * - badges: Achievement definitions
 * - userBadges: Earned badges per user
 * - userGameStats: Gamification stats (points, streaks, levels)
 * - challenges: Daily/quick challenges
 * - challengeAttempts: Challenge completion records
 * - studyGroups: Study group definitions
 * - studyGroupMembers: Group membership records
 * - practiceTests: Practice test configurations
 * - practiceTestAttempts: Practice test results
 * - settings: App settings (including currentUserId)
 *
 * ## Usage
 *
 * ```typescript
 * import { indexedDBService, STORES } from './indexeddb';
 *
 * // Get a single record
 * const user = await indexedDBService.get<User>(STORES.users, 'user-id');
 *
 * // Get all records
 * const categories = await indexedDBService.getAll<Category>(STORES.categories);
 *
 * // Query by index
 * const userQuizzes = await indexedDBService.getByIndex<Quiz>(
 *   STORES.quizzes,
 *   'userId',
 *   'user-id'
 * );
 *
 * // Add/update records
 * await indexedDBService.put(STORES.users, user);
 * ```
 *
 * @module indexeddb
 */

const DB_NAME = 'certlab';
const DB_VERSION = 4;

// Define all stores (tables)
const STORES = {
  tenants: 'tenants',
  users: 'users',
  categories: 'categories',
  subcategories: 'subcategories',
  questions: 'questions',
  quizzes: 'quizzes',
  userProgress: 'userProgress',
  lectures: 'lectures',
  studyNotes: 'studyNotes',
  masteryScores: 'masteryScores',
  badges: 'badges',
  userBadges: 'userBadges',
  userGameStats: 'userGameStats',
  challenges: 'challenges',
  challengeAttempts: 'challengeAttempts',
  studyGroups: 'studyGroups',
  studyGroupMembers: 'studyGroupMembers',
  practiceTests: 'practiceTests',
  practiceTestAttempts: 'practiceTestAttempts',
  settings: 'settings', // For storing app settings and current user
} as const;

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create tenants store (added in version 2)
        if (!db.objectStoreNames.contains(STORES.tenants)) {
          const tenantStore = db.createObjectStore(STORES.tenants, {
            keyPath: 'id',
            autoIncrement: true,
          });
          tenantStore.createIndex('domain', 'domain', { unique: false });
        }

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.users)) {
          const userStore = db.createObjectStore(STORES.users, { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
          userStore.createIndex('tenantId', 'tenantId');
        }

        if (!db.objectStoreNames.contains(STORES.categories)) {
          const categoryStore = db.createObjectStore(STORES.categories, {
            keyPath: 'id',
            autoIncrement: true,
          });
          categoryStore.createIndex('tenantId', 'tenantId');
        }

        if (!db.objectStoreNames.contains(STORES.subcategories)) {
          const subcategoryStore = db.createObjectStore(STORES.subcategories, {
            keyPath: 'id',
            autoIncrement: true,
          });
          subcategoryStore.createIndex('categoryId', 'categoryId');
          subcategoryStore.createIndex('tenantId', 'tenantId');
        }

        if (!db.objectStoreNames.contains(STORES.questions)) {
          const questionStore = db.createObjectStore(STORES.questions, {
            keyPath: 'id',
            autoIncrement: true,
          });
          questionStore.createIndex('categoryId', 'categoryId');
          questionStore.createIndex('subcategoryId', 'subcategoryId');
          questionStore.createIndex('tenantId', 'tenantId');
        }

        if (!db.objectStoreNames.contains(STORES.quizzes)) {
          const quizStore = db.createObjectStore(STORES.quizzes, {
            keyPath: 'id',
            autoIncrement: true,
          });
          quizStore.createIndex('userId', 'userId');
          quizStore.createIndex('tenantId', 'tenantId');
          quizStore.createIndex('userTenant', ['userId', 'tenantId']);
        }

        if (!db.objectStoreNames.contains(STORES.userProgress)) {
          const progressStore = db.createObjectStore(STORES.userProgress, {
            keyPath: 'id',
            autoIncrement: true,
          });
          progressStore.createIndex('userId', 'userId');
          progressStore.createIndex('tenantId', 'tenantId');
          progressStore.createIndex('categoryId', 'categoryId');
          progressStore.createIndex('userCategory', ['userId', 'categoryId'], { unique: true });
          progressStore.createIndex('userTenantCategory', ['userId', 'tenantId', 'categoryId'], {
            unique: true,
          });
        }

        if (!db.objectStoreNames.contains(STORES.lectures)) {
          const lectureStore = db.createObjectStore(STORES.lectures, {
            keyPath: 'id',
            autoIncrement: true,
          });
          lectureStore.createIndex('userId', 'userId');
          lectureStore.createIndex('tenantId', 'tenantId');
          lectureStore.createIndex('quizId', 'quizId');
          lectureStore.createIndex('userTenant', ['userId', 'tenantId']);
        }

        if (!db.objectStoreNames.contains(STORES.studyNotes)) {
          const studyNotesStore = db.createObjectStore(STORES.studyNotes, {
            keyPath: 'id',
            autoIncrement: true,
          });
          studyNotesStore.createIndex('userId', 'userId');
          studyNotesStore.createIndex('tenantId', 'tenantId');
          studyNotesStore.createIndex('quizId', 'quizId');
          studyNotesStore.createIndex('userTenant', ['userId', 'tenantId']);
        }

        if (!db.objectStoreNames.contains(STORES.masteryScores)) {
          const masteryStore = db.createObjectStore(STORES.masteryScores, {
            keyPath: 'id',
            autoIncrement: true,
          });
          masteryStore.createIndex('userId', 'userId');
          masteryStore.createIndex('tenantId', 'tenantId');
          masteryStore.createIndex('categoryId', 'categoryId');
          masteryStore.createIndex(
            'userCategorySubcategory',
            ['userId', 'categoryId', 'subcategoryId'],
            { unique: true }
          );
          masteryStore.createIndex(
            'userTenantCategorySubcategory',
            ['userId', 'tenantId', 'categoryId', 'subcategoryId'],
            { unique: true }
          );
        }

        if (!db.objectStoreNames.contains(STORES.badges)) {
          db.createObjectStore(STORES.badges, { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains(STORES.userBadges)) {
          const userBadgeStore = db.createObjectStore(STORES.userBadges, {
            keyPath: 'id',
            autoIncrement: true,
          });
          userBadgeStore.createIndex('userId', 'userId');
          userBadgeStore.createIndex('tenantId', 'tenantId');
          userBadgeStore.createIndex('badgeId', 'badgeId');
          userBadgeStore.createIndex('userBadge', ['userId', 'badgeId']);
          userBadgeStore.createIndex('userTenantBadge', ['userId', 'tenantId', 'badgeId']);
        }

        if (!db.objectStoreNames.contains(STORES.userGameStats)) {
          const gameStatsStore = db.createObjectStore(STORES.userGameStats, {
            keyPath: 'id',
            autoIncrement: true,
          });
          gameStatsStore.createIndex('userId', 'userId', { unique: true });
          gameStatsStore.createIndex('tenantId', 'tenantId');
          gameStatsStore.createIndex('userTenant', ['userId', 'tenantId'], { unique: true });
        }

        if (!db.objectStoreNames.contains(STORES.challenges)) {
          const challengeStore = db.createObjectStore(STORES.challenges, {
            keyPath: 'id',
            autoIncrement: true,
          });
          challengeStore.createIndex('userId', 'userId');
          challengeStore.createIndex('type', 'type');
        }

        if (!db.objectStoreNames.contains(STORES.challengeAttempts)) {
          const attemptStore = db.createObjectStore(STORES.challengeAttempts, {
            keyPath: 'id',
            autoIncrement: true,
          });
          attemptStore.createIndex('userId', 'userId');
          attemptStore.createIndex('tenantId', 'tenantId');
          attemptStore.createIndex('challengeId', 'challengeId');
          attemptStore.createIndex('userTenant', ['userId', 'tenantId']);
        }

        if (!db.objectStoreNames.contains(STORES.studyGroups)) {
          const studyGroupStore = db.createObjectStore(STORES.studyGroups, {
            keyPath: 'id',
            autoIncrement: true,
          });
          studyGroupStore.createIndex('tenantId', 'tenantId');
        }

        if (!db.objectStoreNames.contains(STORES.studyGroupMembers)) {
          const memberStore = db.createObjectStore(STORES.studyGroupMembers, {
            keyPath: 'id',
            autoIncrement: true,
          });
          memberStore.createIndex('userId', 'userId');
          memberStore.createIndex('groupId', 'groupId');
        }

        if (!db.objectStoreNames.contains(STORES.practiceTests)) {
          const practiceTestStore = db.createObjectStore(STORES.practiceTests, {
            keyPath: 'id',
            autoIncrement: true,
          });
          practiceTestStore.createIndex('tenantId', 'tenantId');
        }

        if (!db.objectStoreNames.contains(STORES.practiceTestAttempts)) {
          const testAttemptStore = db.createObjectStore(STORES.practiceTestAttempts, {
            keyPath: 'id',
            autoIncrement: true,
          });
          testAttemptStore.createIndex('userId', 'userId');
          testAttemptStore.createIndex('tenantId', 'tenantId');
          testAttemptStore.createIndex('testId', 'testId');
          testAttemptStore.createIndex('userTenant', ['userId', 'tenantId']);
        }

        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(
    storeName: string,
    mode: IDBTransactionMode = 'readonly'
  ): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Generic CRUD operations
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, key: IDBValidKey): Promise<T[]> {
    const store = await this.getStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getOneByIndex<T>(
    storeName: string,
    indexName: string,
    key: IDBValidKey
  ): Promise<T | undefined> {
    const store = await this.getStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T>(storeName: string, value: T): Promise<IDBValidKey> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, value: T): Promise<IDBValidKey> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Export all data
  async exportData(): Promise<Record<string, any[]>> {
    await this.init();
    const data: Record<string, any[]> = {};

    for (const storeName of Object.values(STORES)) {
      data[storeName] = await this.getAll(storeName);
    }

    return data;
  }

  // Import data
  async importData(data: Record<string, any[]>): Promise<void> {
    await this.init();

    // Clear all stores first
    for (const storeName of Object.values(STORES)) {
      await this.clear(storeName);
    }

    // Import data
    for (const [storeName, items] of Object.entries(data)) {
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await this.put(storeName, item);
        }
      }
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    await this.init();
    for (const storeName of Object.values(STORES)) {
      await this.clear(storeName);
    }
  }
}

export const indexedDBService = new IndexedDBService();
export { STORES };
