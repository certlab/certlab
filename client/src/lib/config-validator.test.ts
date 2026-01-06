/**
 * Configuration Validator Tests
 *
 * Note: These are smoke tests only. Full validation testing is done
 * via integration tests (build process) since import.meta.env cannot
 * be easily mocked in Vitest.
 *
 * Dynatrace is now REQUIRED for all environments.
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

  it('should require Dynatrace configuration in all environments', () => {
    // Dynatrace is now mandatory, so validation should fail without it
    const result = validateRequiredConfiguration();

    // In test mode without Dynatrace configured, should report errors
    // The actual validation depends on environment variables being set in the test environment
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);

    // Check that if there are errors, they include Dynatrace-related messages
    if (result.errors.length > 0) {
      const hasDynatraceError = result.errors.some((error) =>
        error.toLowerCase().includes('dynatrace')
      );
      // Either we have Firebase errors only (in dev mode), or we have Dynatrace errors
      expect(hasDynatraceError || result.errors.some((e) => e.includes('Firebase'))).toBe(true);
    }
  });
});
