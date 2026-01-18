/**
 * Unit tests for storage-factory.ts
 *
 * Tests the storage routing logic and Firestore integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as storageFactory from './storage-factory';
import * as firestoreService from './firestore-service';
import * as firebase from './firebase';

// Mock the dependencies
vi.mock('./firestore-service');
vi.mock('./firebase');
vi.mock('./firestore-storage', () => ({
  firestoreStorage: {
    getUserQuizzes: vi.fn(),
    createQuiz: vi.fn(),
    getQuiz: vi.fn(),
    setCurrentUserId: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('./errors', () => ({
  logError: vi.fn(),
}));

describe('Storage Factory', () => {
  describe('initializeStorage', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should successfully initialize when Firestore is available', async () => {
      vi.mocked(firestoreService.initializeFirestoreService).mockResolvedValue(true);
      vi.mocked(firebase.getCurrentFirebaseUser).mockReturnValue(null);

      await expect(storageFactory.initializeStorage()).resolves.toBeUndefined();
    });

    it('should throw error when Firestore initialization fails', async () => {
      vi.mocked(firestoreService.initializeFirestoreService).mockResolvedValue(false);

      await expect(storageFactory.initializeStorage()).rejects.toThrow(
        'Failed to initialize Firestore'
      );
    });

    it('should handle Firebase user provided as parameter', async () => {
      const mockUser = { uid: 'test-user-123', email: 'test@example.com' };
      vi.mocked(firestoreService.initializeFirestoreService).mockResolvedValue(true);

      await storageFactory.initializeStorage(mockUser);

      // Should not call getCurrentFirebaseUser when user is provided
      expect(firebase.getCurrentFirebaseUser).not.toHaveBeenCalled();
    });

    it('should get current Firebase user when not provided', async () => {
      vi.mocked(firestoreService.initializeFirestoreService).mockResolvedValue(true);
      vi.mocked(firebase.getCurrentFirebaseUser).mockReturnValue({
        uid: 'test-user-456',
        email: 'user@example.com',
      });

      await storageFactory.initializeStorage();

      expect(firebase.getCurrentFirebaseUser).toHaveBeenCalled();
    });
  });

  describe('isCloudSyncAvailable', () => {
    it('should return true when Firestore is initialized', async () => {
      vi.mocked(firestoreService.initializeFirestoreService).mockResolvedValue(true);
      vi.mocked(firestoreService.isFirestoreInitialized).mockReturnValue(true);
      vi.mocked(firebase.getCurrentFirebaseUser).mockReturnValue(null);

      await storageFactory.initializeStorage();

      expect(storageFactory.isCloudSyncAvailable()).toBe(true);
    });

    it('should return false when Firestore is not initialized', () => {
      vi.mocked(firestoreService.isFirestoreInitialized).mockReturnValue(false);

      expect(storageFactory.isCloudSyncAvailable()).toBe(false);
    });
  });

  describe('getStorageMode', () => {
    it('should always return "cloud"', () => {
      expect(storageFactory.getStorageMode()).toBe('cloud');
    });
  });

  describe('storage interface', () => {
    beforeEach(async () => {
      vi.mocked(firestoreService.initializeFirestoreService).mockResolvedValue(true);
      vi.mocked(firestoreService.isFirestoreInitialized).mockReturnValue(true);
      vi.mocked(firebase.getCurrentFirebaseUser).mockReturnValue(null);
      await storageFactory.initializeStorage();
    });

    it('should provide storage object', () => {
      expect(storageFactory.storage).toBeDefined();
      expect(typeof storageFactory.storage.getUserQuizzes).toBe('function');
      expect(typeof storageFactory.storage.createQuiz).toBe('function');
    });

    it('should route calls to Firestore storage', () => {
      expect(storageFactory.storage).toHaveProperty('getUserQuizzes');
      expect(storageFactory.storage).toHaveProperty('createQuiz');
      expect(storageFactory.storage).toHaveProperty('getQuiz');
    });
  });
});
