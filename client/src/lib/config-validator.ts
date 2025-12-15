/**
 * Configuration Validator
 *
 * Validates that required configuration is present in production.
 * Both Firebase and Dynatrace are required for production deployments.
 */

/**
 * Validation result interface
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate Firebase configuration
 */
function validateFirebaseConfig(): string[] {
  const errors: string[] = [];

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (!apiKey) {
    errors.push('Firebase API Key (VITE_FIREBASE_API_KEY) is missing');
  }
  if (!authDomain) {
    errors.push('Firebase Auth Domain (VITE_FIREBASE_AUTH_DOMAIN) is missing');
  }
  if (!projectId) {
    errors.push('Firebase Project ID (VITE_FIREBASE_PROJECT_ID) is missing');
  }

  return errors;
}

/**
 * Validate Dynatrace configuration
 * Supports both script URL method and individual config method
 */
function validateDynatraceConfig(): string[] {
  const errors: string[] = [];

  const scriptUrl = import.meta.env.VITE_DYNATRACE_SCRIPT_URL;
  const environmentId = import.meta.env.VITE_DYNATRACE_ENVIRONMENT_ID;
  const applicationId = import.meta.env.VITE_DYNATRACE_APPLICATION_ID;
  const beaconUrl = import.meta.env.VITE_DYNATRACE_BEACON_URL;

  // Check if using script URL method (preferred)
  const hasScriptUrl = scriptUrl && scriptUrl !== '';

  // Check if using individual config method
  const hasIndividualConfig = environmentId && applicationId && beaconUrl;

  // If neither method is configured, report error
  if (!hasScriptUrl && !hasIndividualConfig) {
    if (!scriptUrl && !environmentId) {
      errors.push(
        'Dynatrace configuration is missing. Set either VITE_DYNATRACE_SCRIPT_URL or (VITE_DYNATRACE_ENVIRONMENT_ID + VITE_DYNATRACE_APPLICATION_ID + VITE_DYNATRACE_BEACON_URL)'
      );
    } else if (!hasIndividualConfig) {
      // Partial individual config
      if (!environmentId) {
        errors.push('Dynatrace Environment ID (VITE_DYNATRACE_ENVIRONMENT_ID) is missing');
      }
      if (!applicationId) {
        errors.push('Dynatrace Application ID (VITE_DYNATRACE_APPLICATION_ID) is missing');
      }
      if (!beaconUrl) {
        errors.push('Dynatrace Beacon URL (VITE_DYNATRACE_BEACON_URL) is missing');
      }
    }
  }

  return errors;
}

/**
 * Validate all required configuration
 *
 * In production mode, Firebase must be configured for cloud sync.
 * Dynatrace is optional but recommended for production monitoring.
 * In development mode, validation is skipped (warnings only).
 *
 * @returns Validation result with any errors found
 */
export function validateRequiredConfiguration(): ConfigValidationResult {
  // In development mode, skip validation (allow developers to work without full config)
  const isDevelopment = import.meta.env.DEV;
  if (isDevelopment) {
    console.log('[Config Validator] Development mode - skipping required configuration validation');
    return { isValid: true, errors: [] };
  }

  // In production mode, validate required configuration
  const errors: string[] = [];

  // Validate Firebase (required for cloud sync in production)
  const firebaseErrors = validateFirebaseConfig();
  errors.push(...firebaseErrors);

  // Check Dynatrace but only warn (not required)
  const dynatraceErrors = validateDynatraceConfig();
  if (dynatraceErrors.length > 0) {
    console.warn(
      '[Config Validator] Dynatrace not configured (optional but recommended for production)'
    );
    dynatraceErrors.forEach((error) => console.warn(`  - ${error}`));
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    console.error('[Config Validator] Configuration validation failed:', errors);
  } else {
    console.log('[Config Validator] Configuration validation passed');
  }

  return { isValid, errors };
}
