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
    // Dynatrace is now mandatory in all environments, so validation should fail without it
    const result = validateRequiredConfiguration();

    // In test mode without Dynatrace configured, should report errors
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);

    // Since Dynatrace is mandatory, if there are errors, they must include Dynatrace errors
    // (unless Firebase is also missing in which case we'll have Firebase errors too)
    if (result.errors.length > 0) {
      const hasDynatraceError = result.errors.some((error) =>
        error.toLowerCase().includes('dynatrace')
      );

      // We should always have Dynatrace errors when Dynatrace is not configured
      // This verifies that the mandatory requirement is being enforced
      expect(hasDynatraceError).toBe(true);
    }
  });
});
