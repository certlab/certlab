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

  it('should pass validation in development mode (DEV=true in test env)', () => {
    // In test environment, DEV is true by default
    const result = validateRequiredConfiguration();

    // Should pass in development mode regardless of configuration
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
