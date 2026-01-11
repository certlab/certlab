/**
 * Tests for permission utilities
 */

import { describe, it, expect } from 'vitest';
import { canEdit, canDelete, logPermissionCheck, getPermissionDeniedMessage } from './permissions';

describe('Permission Utilities', () => {
  const mockUser = {
    id: 'user-123',
    role: 'user',
  };

  const mockAdmin = {
    id: 'admin-456',
    role: 'admin',
  };

  const mockQuizCreator = {
    userId: 'user-123',
    title: 'Test Quiz',
  };

  const mockQuizOtherUser = {
    userId: 'other-user',
    title: 'Other User Quiz',
  };

  const mockLectureCreator = {
    author: 'user-123',
    title: 'Test Lecture',
  };

  const mockTemplateCreator = {
    createdBy: 'user-123',
    title: 'Test Template',
  };

  describe('canEdit', () => {
    it('should return false if resource is null or undefined', () => {
      expect(canEdit(null, mockUser)).toBe(false);
      expect(canEdit(undefined, mockUser)).toBe(false);
    });

    it('should return false if user is null or undefined', () => {
      expect(canEdit(mockQuizCreator, null)).toBe(false);
      expect(canEdit(mockQuizCreator, undefined)).toBe(false);
    });

    it('should return true if user is the creator (userId)', () => {
      expect(canEdit(mockQuizCreator, mockUser)).toBe(true);
    });

    it('should return true if user is the creator (author)', () => {
      expect(canEdit(mockLectureCreator, mockUser)).toBe(true);
    });

    it('should return true if user is the creator (createdBy)', () => {
      expect(canEdit(mockTemplateCreator, mockUser)).toBe(true);
    });

    it('should return false if user is not the creator', () => {
      expect(canEdit(mockQuizOtherUser, mockUser)).toBe(false);
    });

    it('should return true if user is admin (even if not creator)', () => {
      expect(canEdit(mockQuizOtherUser, mockAdmin)).toBe(true);
    });
  });

  describe('canDelete', () => {
    it('should have same behavior as canEdit', () => {
      expect(canDelete(mockQuizCreator, mockUser)).toBe(canEdit(mockQuizCreator, mockUser));
      expect(canDelete(mockQuizOtherUser, mockUser)).toBe(canEdit(mockQuizOtherUser, mockUser));
      expect(canDelete(mockQuizOtherUser, mockAdmin)).toBe(canEdit(mockQuizOtherUser, mockAdmin));
    });
  });

  describe('logPermissionCheck', () => {
    it('should not throw when logging permission checks', () => {
      expect(() => {
        logPermissionCheck('edit', 'quiz', 123, 'user-123', true);
        logPermissionCheck('delete', 'lecture', 456, 'user-456', false);
      }).not.toThrow();
    });
  });

  describe('getPermissionDeniedMessage', () => {
    it('should return correct message for edit action', () => {
      const message = getPermissionDeniedMessage('edit', 'quiz');
      expect(message).toContain('view');
      expect(message).toContain('cannot edit');
      expect(message).toContain('creator');
    });

    it('should return correct message for delete action', () => {
      const message = getPermissionDeniedMessage('delete', 'lecture');
      expect(message).toContain('view');
      expect(message).toContain('cannot delete');
      expect(message).toContain('creator');
    });

    it('should return permission denied for unknown action', () => {
      // @ts-expect-error Testing invalid input
      const message = getPermissionDeniedMessage('unknown', 'material');
      expect(message).toBe('Permission denied');
    });
  });

  describe('Edge Cases', () => {
    it('should handle resource with multiple owner fields (prioritize userId)', () => {
      const resource = {
        userId: 'user-123',
        author: 'other-user',
        createdBy: 'another-user',
      };
      expect(canEdit(resource, mockUser)).toBe(true);
    });

    it('should handle resource with only author field', () => {
      const resource = {
        author: 'user-123',
      };
      expect(canEdit(resource, mockUser)).toBe(true);
    });

    it('should handle resource with only createdBy field', () => {
      const resource = {
        createdBy: 'user-123',
      };
      expect(canEdit(resource, mockUser)).toBe(true);
    });

    it('should handle resource with null author', () => {
      const resource = {
        author: null,
        userId: 'user-123',
      };
      expect(canEdit(resource, mockUser)).toBe(true);
    });

    it('should return false if all owner fields are null/undefined', () => {
      const resource = {
        author: null,
      };
      expect(canEdit(resource, mockUser)).toBe(false);
    });
  });
});
