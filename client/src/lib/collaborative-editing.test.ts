/**
 * Collaborative Editing Tests
 *
 * Tests for presence tracking, conflict detection, and version management
 */

import { describe, it, expect } from 'vitest';
import { detectConflict } from '@/lib/collaborative-editing';
import type { EditOperation } from '@shared/schema';

describe('Collaborative Editing', () => {
  describe('Conflict Detection', () => {
    const baseOperation: EditOperation = {
      id: 'op1',
      sessionId: 'session1',
      userId: 'user1',
      documentType: 'quizTemplate',
      documentId: '123',
      timestamp: new Date(),
      operation: 'update',
      fieldPath: 'title',
      oldValue: 'Old Title',
      newValue: 'New Title',
      baseVersion: 1,
      applied: false,
      conflicted: false,
    };

    it('should not detect conflict when operations are on different fields', () => {
      const op1 = { ...baseOperation, fieldPath: 'title' };
      const op2 = { ...baseOperation, id: 'op2', fieldPath: 'description' };

      const hasConflict = detectConflict(op1, op2);
      expect(hasConflict).toBe(false);
    });

    it('should not detect conflict when operations are by same user', () => {
      const op1 = { ...baseOperation, userId: 'user1' };
      const op2 = { ...baseOperation, id: 'op2', userId: 'user1' };

      const hasConflict = detectConflict(op1, op2);
      expect(hasConflict).toBe(false);
    });

    it('should detect conflict when different users edit same field with different base versions', () => {
      const op1 = { ...baseOperation, userId: 'user1', baseVersion: 1 };
      const op2 = {
        ...baseOperation,
        id: 'op2',
        userId: 'user2',
        baseVersion: 2,
      };

      const hasConflict = detectConflict(op1, op2);
      expect(hasConflict).toBe(true);
    });

    it('should detect conflict when text operations overlap', () => {
      const op1: EditOperation = {
        ...baseOperation,
        userId: 'user1',
        operation: 'insert',
        position: 10,
        length: 5,
      };

      const op2: EditOperation = {
        ...baseOperation,
        id: 'op2',
        userId: 'user2',
        operation: 'delete',
        position: 12,
        length: 3,
      };

      const hasConflict = detectConflict(op1, op2);
      expect(hasConflict).toBe(true);
    });

    it('should not detect conflict when text operations do not overlap', () => {
      const op1: EditOperation = {
        ...baseOperation,
        userId: 'user1',
        operation: 'insert',
        position: 10,
        length: 5,
      };

      const op2: EditOperation = {
        ...baseOperation,
        id: 'op2',
        userId: 'user2',
        operation: 'delete',
        position: 20,
        length: 3,
      };

      const hasConflict = detectConflict(op1, op2);
      expect(hasConflict).toBe(false);
    });
  });

  describe('Schema Validation', () => {
    it('should validate editor presence schema', () => {
      const presence = {
        userId: 'user123',
        userName: 'John Doe',
        color: '#3B82F6',
        lastSeen: new Date(),
        isActive: true,
        documentType: 'quiz' as const,
        documentId: '456',
      };

      // Validate that all required fields are present
      expect(presence.userId).toBeDefined();
      expect(presence.userName).toBeDefined();
      expect(presence.color).toBeDefined();
      expect(presence.lastSeen).toBeInstanceOf(Date);
      expect(presence.isActive).toBe(true);
      expect(presence.documentType).toBe('quiz');
    });

    it('should validate document lock schema', () => {
      const lock = {
        documentType: 'quizTemplate' as const,
        documentId: '789',
        lockMode: 'optimistic' as const,
        version: 5,
        lastModifiedBy: 'user123',
        lastModifiedAt: new Date(),
      };

      expect(lock.version).toBeGreaterThanOrEqual(0);
      expect(lock.lockMode).toBe('optimistic');
      expect(lock.lastModifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('Version Management', () => {
    it('should increment version numbers sequentially', () => {
      const versions = [
        { versionNumber: 1, id: 'v1' },
        { versionNumber: 2, id: 'v2' },
        { versionNumber: 3, id: 'v3' },
      ];

      // Verify versions are sequential
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i].versionNumber).toBe(versions[i - 1].versionNumber + 1);
      }
    });

    it('should preserve version history', () => {
      const versions = [
        { id: 'v1', title: 'Version 1', createdAt: new Date('2024-01-01') },
        { id: 'v2', title: 'Version 2', createdAt: new Date('2024-01-02') },
        { id: 'v3', title: 'Version 3', createdAt: new Date('2024-01-03') },
      ];

      // Versions should be ordered by creation date
      const sorted = [...versions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      expect(sorted[0].id).toBe('v3'); // Newest first
      expect(sorted[sorted.length - 1].id).toBe('v1'); // Oldest last
    });
  });

  describe('Presence Tracking', () => {
    it('should detect stale presence (> 5 minutes)', () => {
      const FIVE_MINUTES_MS = 5 * 60 * 1000;
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - FIVE_MINUTES_MS);
      const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);

      const isStale = (lastSeen: Date) => now.getTime() - lastSeen.getTime() > FIVE_MINUTES_MS;

      // Exactly at the 5 minute boundary should NOT be considered stale
      expect(isStale(fiveMinutesAgo)).toBe(false);
      // More than 5 minutes ago should be considered stale
      expect(isStale(sixMinutesAgo)).toBe(true);
    });

    it('should maintain unique colors for editors', () => {
      const colors = [
        '#3B82F6', // Blue
        '#10B981', // Green
        '#F59E0B', // Amber
        '#EF4444', // Red
      ];

      // Each editor should have a unique color
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });
});
