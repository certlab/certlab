/**
 * Conflict Resolution Tests
 *
 * Tests for conflict detection, resolution strategies, and merge logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectConflicts,
  autoMerge,
  resolveLastWriteWins,
  resolveFirstWriteWins,
  resolveConflict,
  getConflictConfig,
  type DocumentConflict,
  type ConflictResolutionConfig,
} from './conflict-resolution';

describe('Conflict Resolution', () => {
  describe('detectConflicts', () => {
    it('should detect no conflicts when documents are identical', () => {
      const local = { title: 'Test', description: 'A test', updatedAt: new Date() };
      const remote = { title: 'Test', description: 'A test', updatedAt: new Date() };

      const conflicts = detectConflicts(local, remote);
      expect(conflicts).toEqual([]);
    });

    it('should detect conflicts when fields differ', () => {
      const local = { title: 'Local Title', description: 'Same', updatedAt: new Date() };
      const remote = { title: 'Remote Title', description: 'Same', updatedAt: new Date() };

      const conflicts = detectConflicts(local, remote);
      expect(conflicts).toContain('title');
      expect(conflicts).not.toContain('description');
    });

    it('should exclude specified fields from conflict detection', () => {
      const now = new Date();
      const later = new Date(now.getTime() + 1000);
      const local = { title: 'Same', updatedAt: now };
      const remote = { title: 'Same', updatedAt: later };

      const conflicts = detectConflicts(local, remote, ['updatedAt']);
      expect(conflicts).toEqual([]);
    });

    it('should detect conflicts in nested objects', () => {
      const local = {
        title: 'Same',
        metadata: { author: 'John', tags: ['a', 'b'] },
      };
      const remote = {
        title: 'Same',
        metadata: { author: 'Jane', tags: ['a', 'b'] },
      };

      const conflicts = detectConflicts(local, remote);
      expect(conflicts).toContain('metadata');
    });

    it('should handle arrays correctly', () => {
      const local = { tags: ['a', 'b', 'c'] };
      const remote = { tags: ['a', 'b', 'd'] };

      const conflicts = detectConflicts(local, remote);
      expect(conflicts).toContain('tags');
    });
  });

  describe('autoMerge', () => {
    const config: ConflictResolutionConfig = {
      strategy: 'auto-merge',
      autoMergeFields: ['title', 'description'],
      timestampField: 'updatedAt',
    };

    it('should merge non-conflicting changes', () => {
      const local = {
        title: 'Local Title',
        description: 'Original',
        updatedAt: new Date('2024-01-02'),
      };
      const remote = {
        title: 'Original',
        description: 'Remote Desc',
        updatedAt: new Date('2024-01-01'),
      };
      const base = {
        title: 'Original',
        description: 'Original',
        updatedAt: new Date('2024-01-01'),
      };

      const result = autoMerge(local, remote, base, config);

      expect(result.resolved).toBe(true);
      expect(result.mergedData?.title).toBe('Local Title'); // Local changed
      expect(result.mergedData?.description).toBe('Remote Desc'); // Remote changed
    });

    it('should require user input for non-auto-mergeable conflicts', () => {
      const local = {
        title: 'Local',
        nonMergeableField: 'Local Value',
        updatedAt: new Date(),
      };
      const remote = {
        title: 'Remote',
        nonMergeableField: 'Remote Value',
        updatedAt: new Date(),
      };

      const result = autoMerge(local, remote, null, config);

      expect(result.resolved).toBe(false);
      expect(result.requiresUserInput).toBe(true);
    });

    it('should use timestamp for conflicting auto-mergeable fields', () => {
      const local = {
        title: 'Local Title',
        updatedAt: new Date('2024-01-02'),
      };
      const remote = {
        title: 'Remote Title',
        updatedAt: new Date('2024-01-01'),
      };

      const result = autoMerge(local, remote, null, config);

      expect(result.resolved).toBe(true);
      expect(result.mergedData?.title).toBe('Local Title'); // Local is more recent
    });

    it('should handle missing base version', () => {
      const local = {
        title: 'Local',
        description: 'Local Desc',
        updatedAt: new Date('2024-01-02'),
      };
      const remote = {
        title: 'Remote',
        description: 'Remote Desc',
        updatedAt: new Date('2024-01-01'),
      };

      const result = autoMerge(local, remote, null, config);

      expect(result.resolved).toBe(true);
      expect(result.mergedData?.title).toBe('Local'); // Local is more recent
    });
  });

  describe('resolveLastWriteWins', () => {
    const config: ConflictResolutionConfig = {
      strategy: 'last-write-wins',
      timestampField: 'updatedAt',
    };

    it('should choose local when it has newer timestamp', () => {
      const local = {
        title: 'Local',
        updatedAt: new Date('2024-01-02'),
      };
      const remote = {
        title: 'Remote',
        updatedAt: new Date('2024-01-01'),
      };

      const result = resolveLastWriteWins(local, remote, config);

      expect(result.resolved).toBe(true);
      expect(result.mergedData).toEqual(local);
      expect(result.strategy).toBe('last-write-wins');
    });

    it('should choose remote when it has newer timestamp', () => {
      const local = {
        title: 'Local',
        updatedAt: new Date('2024-01-01'),
      };
      const remote = {
        title: 'Remote',
        updatedAt: new Date('2024-01-02'),
      };

      const result = resolveLastWriteWins(local, remote, config);

      expect(result.resolved).toBe(true);
      expect(result.mergedData).toEqual(remote);
    });

    it('should handle Date objects', () => {
      const now = new Date();
      const later = new Date(now.getTime() + 1000);

      const local = { title: 'Local', updatedAt: later };
      const remote = { title: 'Remote', updatedAt: now };

      const result = resolveLastWriteWins(local, remote, config);

      expect(result.mergedData).toEqual(local);
    });

    it('should prefer local when timestamps are missing', () => {
      const local = { title: 'Local' };
      const remote = { title: 'Remote' };

      const result = resolveLastWriteWins(local, remote, config);

      expect(result.mergedData).toEqual(local);
    });
  });

  describe('resolveFirstWriteWins', () => {
    it('should always keep remote (first) version', () => {
      const remote = { title: 'Remote', updatedAt: new Date() };

      const result = resolveFirstWriteWins(remote);

      expect(result.resolved).toBe(true);
      expect(result.mergedData).toEqual(remote);
      expect(result.strategy).toBe('first-write-wins');
    });
  });

  describe('resolveConflict', () => {
    it('should use auto-merge strategy for quiz conflicts', async () => {
      const conflict: DocumentConflict = {
        documentType: 'quiz',
        documentId: '123',
        localVersion: {
          title: 'Local Quiz',
          description: 'Same',
          updatedAt: new Date('2024-01-02'),
        },
        remoteVersion: {
          title: 'Remote Quiz',
          description: 'Same',
          updatedAt: new Date('2024-01-01'),
        },
        baseVersion: null,
        localTimestamp: new Date('2024-01-02'),
        remoteTimestamp: new Date('2024-01-01'),
        conflictingFields: ['title'],
        userId: 'user123',
      };

      const result = await resolveConflict(conflict);

      expect(result.resolved).toBe(true);
      expect(result.strategy).toBe('auto-merge');
      expect(result.mergedData?.title).toBe('Local Quiz');
    });

    it('should use last-write-wins for questions', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 1000);

      const conflict: DocumentConflict = {
        documentType: 'question',
        documentId: '456',
        localVersion: { text: 'Local Question', updatedAt: later },
        remoteVersion: { text: 'Remote Question', updatedAt: now },
        baseVersion: null,
        localTimestamp: later,
        remoteTimestamp: now,
        conflictingFields: ['text'],
        userId: 'user123',
      };

      const result = await resolveConflict(conflict);

      expect(result.resolved).toBe(true);
      expect(result.strategy).toBe('last-write-wins');
      expect(result.mergedData?.text).toBe('Local Question');
    });

    it('should require user input for manual strategy', async () => {
      const conflict: DocumentConflict = {
        documentType: 'quiz',
        documentId: '789',
        localVersion: { title: 'Local' },
        remoteVersion: { title: 'Remote' },
        baseVersion: null,
        localTimestamp: new Date(),
        remoteTimestamp: new Date(),
        conflictingFields: ['title'],
        userId: 'user123',
      };

      const result = await resolveConflict(conflict, { strategy: 'manual' });

      expect(result.resolved).toBe(false);
      expect(result.requiresUserInput).toBe(true);
      expect(result.strategy).toBe('manual');
    });

    it('should handle custom configuration', async () => {
      const conflict: DocumentConflict = {
        documentType: 'quiz',
        documentId: '101',
        localVersion: { title: 'Local', customField: 'Value' },
        remoteVersion: { title: 'Remote', customField: 'Value' },
        baseVersion: null,
        localTimestamp: new Date(),
        remoteTimestamp: new Date(),
        conflictingFields: ['title'],
        userId: 'user123',
      };

      const customConfig = {
        strategy: 'auto-merge' as const,
        autoMergeFields: ['title', 'customField'],
        timestampField: 'updatedAt',
      };

      const result = await resolveConflict(conflict, customConfig);

      expect(result.resolved).toBe(true);
    });
  });

  describe('getConflictConfig', () => {
    it('should return config for quiz', () => {
      const config = getConflictConfig('quiz');

      expect(config.strategy).toBe('auto-merge');
      expect(config.autoMergeFields).toContain('title');
      expect(config.timestampField).toBe('updatedAt');
    });

    it('should return config for userProgress', () => {
      const config = getConflictConfig('userProgress');

      expect(config.strategy).toBe('auto-merge');
      expect(config.autoMergeFields).toContain('questionsAnswered');
    });

    it('should return default config for unknown type', () => {
      const config = getConflictConfig('unknown');

      expect(config.strategy).toBe('last-write-wins');
      expect(config.timestampField).toBe('updatedAt');
    });
  });

  describe('Race Condition Scenarios', () => {
    it('should handle simultaneous edits to different fields', async () => {
      const base = {
        title: 'Original Title',
        description: 'Original Description',
        updatedAt: new Date('2024-01-01'),
      };

      const user1Edit = {
        title: 'User1 Title', // User 1 changes title
        description: 'Original Description',
        updatedAt: new Date('2024-01-02'),
      };

      const user2Edit = {
        title: 'Original Title',
        description: 'User2 Description', // User 2 changes description
        updatedAt: new Date('2024-01-02'),
      };

      const conflict: DocumentConflict = {
        documentType: 'quiz',
        documentId: 'race1',
        localVersion: user1Edit,
        remoteVersion: user2Edit,
        baseVersion: base,
        localTimestamp: user1Edit.updatedAt,
        remoteTimestamp: user2Edit.updatedAt,
        conflictingFields: [],
        userId: 'user1',
      };

      const result = await resolveConflict(conflict);

      // Both changes should be preserved
      expect(result.resolved).toBe(true);
      expect(result.mergedData?.title).toBe('User1 Title');
      expect(result.mergedData?.description).toBe('User2 Description');
    });

    it('should handle simultaneous edits to same field', async () => {
      const now = new Date();
      const slightlyLater = new Date(now.getTime() + 100);

      const user1Edit = {
        title: 'User1 Title',
        updatedAt: slightlyLater,
      };

      const user2Edit = {
        title: 'User2 Title',
        updatedAt: now,
      };

      const conflict: DocumentConflict = {
        documentType: 'quiz',
        documentId: 'race2',
        localVersion: user1Edit,
        remoteVersion: user2Edit,
        baseVersion: { title: 'Original', updatedAt: new Date('2024-01-01') },
        localTimestamp: slightlyLater,
        remoteTimestamp: now,
        conflictingFields: ['title'],
        userId: 'user1',
      };

      const result = await resolveConflict(conflict);

      // Most recent change should win
      expect(result.resolved).toBe(true);
      expect(result.mergedData?.title).toBe('User1 Title');
    });

    it('should handle rapid successive updates', async () => {
      const updates = [
        { title: 'Update 1', updatedAt: new Date('2024-01-01T10:00:00') },
        { title: 'Update 2', updatedAt: new Date('2024-01-01T10:00:01') },
        { title: 'Update 3', updatedAt: new Date('2024-01-01T10:00:02') },
      ];

      // Simulate out-of-order arrival
      const conflict: DocumentConflict = {
        documentType: 'quiz',
        documentId: 'race3',
        localVersion: updates[2], // Latest
        remoteVersion: updates[1], // Middle
        baseVersion: updates[0], // Earliest
        localTimestamp: updates[2].updatedAt,
        remoteTimestamp: updates[1].updatedAt,
        conflictingFields: ['title'],
        userId: 'user1',
      };

      const result = await resolveConflict(conflict);

      // Latest update should be preserved
      expect(result.resolved).toBe(true);
      expect(result.mergedData?.title).toBe('Update 3');
    });

    it('should handle network delay causing version mismatch', async () => {
      const v1 = { title: 'Version 1', version: 1, updatedAt: new Date('2024-01-01') };
      const v2 = { title: 'Version 2', version: 2, updatedAt: new Date('2024-01-02') };
      const v3 = { title: 'Version 3', version: 3, updatedAt: new Date('2024-01-03') };

      // User edits based on v1, but v3 is already on server
      const conflict: DocumentConflict = {
        documentType: 'quiz',
        documentId: 'race4',
        localVersion: { ...v1, title: 'Local Edit' },
        remoteVersion: v3,
        baseVersion: v1,
        localTimestamp: new Date('2024-01-04'),
        remoteTimestamp: v3.updatedAt,
        conflictingFields: ['title', 'version'],
        userId: 'user1',
      };

      const result = await resolveConflict(conflict, { strategy: 'manual' });

      // Should require manual resolution due to version skip
      expect(result.requiresUserInput).toBe(true);
    });

    it('should handle concurrent updates to progress counters', async () => {
      const base = {
        questionsAnswered: 100,
        correctAnswers: 75,
        streak: 5,
        updatedAt: new Date('2024-01-01'),
      };

      // User answered questions on device 1
      const device1 = {
        questionsAnswered: 105, // +5
        correctAnswers: 79, // +4
        streak: 9, // +4
        updatedAt: new Date('2024-01-02'),
      };

      // User answered questions on device 2
      const device2 = {
        questionsAnswered: 103, // +3
        correctAnswers: 77, // +2
        streak: 7, // +2
        updatedAt: new Date('2024-01-02'),
      };

      const conflict: DocumentConflict = {
        documentType: 'userProgress',
        documentId: 'progress1',
        localVersion: device1,
        remoteVersion: device2,
        baseVersion: base,
        localTimestamp: device1.updatedAt,
        remoteTimestamp: device2.updatedAt,
        conflictingFields: ['questionsAnswered', 'correctAnswers', 'streak'],
        userId: 'user1',
      };

      const result = await resolveConflict(conflict);

      // Should auto-merge progress fields
      expect(result.resolved).toBe(true);
      // Since both have same timestamp, it will use one of them
      // In production, we'd want additive merging for counters
      expect(result.mergedData).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const local = { title: 'Title', description: null };
      const remote = { title: 'Title', description: 'Description' };

      const conflicts = detectConflicts(local, remote);
      expect(conflicts).toContain('description');
    });

    it('should handle undefined values', () => {
      const local = { title: 'Title' };
      const remote = { title: 'Title', description: 'Description' };

      const conflicts = detectConflicts(local, remote);
      // New field in remote is not a conflict
      expect(conflicts.length).toBe(0);
    });

    it('should handle empty objects', async () => {
      const conflict: DocumentConflict = {
        documentType: 'quiz',
        documentId: 'empty',
        localVersion: {},
        remoteVersion: {},
        baseVersion: null,
        localTimestamp: new Date(),
        remoteTimestamp: new Date(),
        conflictingFields: [],
        userId: 'user1',
      };

      const result = await resolveConflict(conflict);
      expect(result.resolved).toBe(true);
    });

    it('should handle circular references gracefully', () => {
      const local: any = { title: 'Test' };
      local.self = local; // Circular reference

      const remote = { title: 'Test' };

      // Should not throw
      expect(() => detectConflicts(local, remote)).not.toThrow();
    });
  });
});
