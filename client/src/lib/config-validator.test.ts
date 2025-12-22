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

  it('should make Firebase optional in development mode', () => {
    // Firebase is now optional in development, mandatory in production
    const result = validateRequiredConfiguration();

    // In test mode (similar to development), should pass even without Firebase
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
