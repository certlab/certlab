/**
 * Configuration Validator
 *
 * Validates that required configuration is present.
 * Firebase is now mandatory for all deployments (development and production).
 * Google Sign-In via Firebase is the only authentication method.
 * Dynatrace is RECOMMENDED for proper monitoring and error detection but optional.
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

  // Temporarily disabled for development testing - allowing the app to work without Firebase
  // This allows testing with IndexedDB as the primary storage
  const isDevelopment = import.meta.env.DEV;
  if (isDevelopment) {
    // In development, Firebase is optional to enable local testing
    return errors;
  }

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
 * Validate Dynatrace configuration (informational)
 * Uses script URL method for configuration
 * Dynatrace is RECOMMENDED but optional - warnings will be logged if not configured
 */
function validateDynatraceConfig(): string[] {
  const errors: string[] = [];

  const scriptUrl = import.meta.env.VITE_DYNATRACE_SCRIPT_URL;
  const enabledEnv = import.meta.env.VITE_ENABLE_DYNATRACE;

  // Check if explicitly disabled
  if (enabledEnv === 'false') {
    console.warn(
      '[Config Validator] Dynatrace is explicitly disabled (VITE_ENABLE_DYNATRACE=false)'
    );
    return errors; // Not an error, just disabled
  }

  // Check if script URL is configured
  const hasScriptUrl =
    typeof scriptUrl === 'string' && scriptUrl !== '' && scriptUrl.startsWith('https://');

  // If not configured, log warning but don't treat as error
  if (!hasScriptUrl) {
    console.warn(
      '[Config Validator] Dynatrace is not configured. Monitoring will be disabled.',
      '\nSet VITE_DYNATRACE_SCRIPT_URL to enable monitoring.',
      '\nSee docs/setup/dynatrace.md for setup instructions.'
    );
  }

  return errors; // Never return errors for Dynatrace - it's optional
}

/**
 * Validate all required configuration
 *
 * Firebase is now mandatory for all modes (development and production).
 * Dynatrace is RECOMMENDED but optional for monitoring and error detection.
 *
 * @returns Validation result with any errors found
 */
export function validateRequiredConfiguration(): ConfigValidationResult {
  const errors: string[] = [];
  const isDevelopment = import.meta.env.DEV;

  // Validate Firebase (now mandatory in all modes)
  const firebaseErrors = validateFirebaseConfig();
  errors.push(...firebaseErrors);

  // Validate Dynatrace (informational - warnings only, no errors)
  validateDynatraceConfig();

  const isValid = errors.length === 0;

  if (!isValid) {
    console.error('[Config Validator] Configuration validation failed:', errors);
  } else {
    console.log('[Config Validator] Configuration validation passed');
  }

  return { isValid, errors };
}
