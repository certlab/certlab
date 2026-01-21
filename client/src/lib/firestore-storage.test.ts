/**
 * Firestore Storage Tests
 *
 * Tests for ID generation and other utility functions in firestore-storage.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateSafeNumericId } from './firestore-storage';

describe('generateSafeNumericId', () => {
  // Reset module state between tests
  beforeEach(() => {
    vi.resetModules();
  });

  it('should generate IDs within 32-bit integer range', () => {
    const MAX_32BIT_INT = 2147483647;
    const ids: number[] = [];

    // Generate 1000 IDs to test
    for (let i = 0; i < 1000; i++) {
      const id = generateSafeNumericId();
      ids.push(id);

      // Verify ID is within range
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThanOrEqual(MAX_32BIT_INT);
    }
  });

  it('should never return 0', () => {
    // Generate many IDs to ensure 0 is never returned
    for (let i = 0; i < 1000; i++) {
      const id = generateSafeNumericId();
      expect(id).not.toBe(0);
    }
  });

  it('should generate sequential and unique IDs within a session', () => {
    const ids: number[] = [];
    const numIds = 100;

    // Generate IDs
    for (let i = 0; i < numIds; i++) {
      ids.push(generateSafeNumericId());
    }

    // Check all IDs are unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(numIds);

    // Check IDs are sequential (each ID should be 1 more than previous, unless wrap occurred)
    for (let i = 1; i < ids.length; i++) {
      const diff = ids[i] - ids[i - 1];
      // Should be 1 in most cases, unless we wrapped around at MAX_32BIT_INT
      if (diff < 0) {
        // Wrapped around - previous should be near MAX_32BIT_INT, current should be near 1
        expect(ids[i - 1]).toBeGreaterThan(2147483640); // Near max
        expect(ids[i]).toBeLessThan(100); // Near start
      } else {
        expect(diff).toBe(1);
      }
    }
  });

  it('should handle wrap-around at MAX_32BIT_INT correctly', () => {
    const MAX_32BIT_INT = 2147483647;

    // Generate many IDs - if we hit the limit during generation,
    // the function should wrap to 1 (skipping 0)
    const ids: number[] = [];
    for (let i = 0; i < 10000; i++) {
      ids.push(generateSafeNumericId());
    }

    // All IDs should still be valid
    ids.forEach((id) => {
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThanOrEqual(MAX_32BIT_INT);
    });

    // Check for uniqueness
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should generate different IDs for subsequent calls', () => {
    const id1 = generateSafeNumericId();
    const id2 = generateSafeNumericId();
    const id3 = generateSafeNumericId();

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it('should generate positive integers only', () => {
    for (let i = 0; i < 100; i++) {
      const id = generateSafeNumericId();
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
    }
  });

  it('should handle rapid sequential calls without collision', () => {
    const ids = new Set<number>();
    const count = 1000;

    // Generate IDs rapidly in a loop
    for (let i = 0; i < count; i++) {
      const id = generateSafeNumericId();
      ids.add(id);
    }

    // All IDs should be unique
    expect(ids.size).toBe(count);
  });
});
