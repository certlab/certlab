/**
 * Configuration Validator Tests
 *
 * Note: These are smoke tests only. Full validation testing is done
 * via integration tests (build process) since import.meta.env cannot
 * be easily mocked in Vitest.
 */

import { describe, it, expect } from 'vitest';
import { validateRequiredConfiguration } from './config-validator';

describe('validateRequiredConfiguration', () => {
  it('should return a validation result object with isValid and errors', () => {
    const result = validateRequiredConfiguration();

    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('errors');
    expect(typeof result.isValid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('should require Firebase configuration in all modes (including development)', () => {
    // Firebase is now mandatory in both development and production
    const result = validateRequiredConfiguration();

    // Should fail without Firebase configuration
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Should have Firebase-related errors
    const hasFirebaseError = result.errors.some(
      (error) => error.includes('Firebase') || error.includes('VITE_FIREBASE')
    );
    expect(hasFirebaseError).toBe(true);
  });
});
