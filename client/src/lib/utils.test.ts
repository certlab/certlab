import { describe, it, expect } from 'vitest';
import { cn, formatNotificationCount, isTestEnvironment } from './utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const falseCondition = false;
    const trueCondition = true;
    expect(cn('foo', falseCondition && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', trueCondition && 'bar', 'baz')).toBe('foo bar baz');
  });

  it('should merge Tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('should handle undefined and null values', () => {
    expect(cn('foo', undefined, 'bar', null)).toBe('foo bar');
  });

  it('should handle empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('should handle arrays of class names', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('should handle objects with boolean values', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });
});

describe('formatNotificationCount utility function', () => {
  describe('with includeNumber=true (default)', () => {
    it('should format zero notifications', () => {
      expect(formatNotificationCount(0)).toBe('0 notifications');
    });

    it('should format singular notification', () => {
      expect(formatNotificationCount(1)).toBe('1 notification');
    });

    it('should format multiple notifications', () => {
      expect(formatNotificationCount(2)).toBe('2 notifications');
      expect(formatNotificationCount(5)).toBe('5 notifications');
      expect(formatNotificationCount(100)).toBe('100 notifications');
    });
  });

  describe('with includeNumber=false', () => {
    it('should return plural form for zero', () => {
      expect(formatNotificationCount(0, false)).toBe('notifications');
    });

    it('should return singular form for one', () => {
      expect(formatNotificationCount(1, false)).toBe('notification');
    });

    it('should return plural form for multiple', () => {
      expect(formatNotificationCount(2, false)).toBe('notifications');
      expect(formatNotificationCount(10, false)).toBe('notifications');
    });
  });
});

describe('isTestEnvironment utility function', () => {
  it('should return true when running in test environment', () => {
    // This test itself is running in a test environment, so it should return true
    expect(isTestEnvironment()).toBe(true);
  });

  it('should detect NODE_ENV=test', () => {
    // In Vitest, this should be set by default
    expect(process.env.NODE_ENV).toBe('test');
    expect(isTestEnvironment()).toBe(true);
  });

  it('should detect VITEST=true', () => {
    // In Vitest, this should be set by default
    expect(process.env.VITEST).toBe('true');
    expect(isTestEnvironment()).toBe(true);
  });
});
