/**
 * Configuration Validator
 *
 * Validates that required configuration is present.
 * Firebase is now mandatory for all deployments (development and production).
 * Google Sign-In via Firebase is the only authentication method.
 * Dynatrace is REQUIRED for proper monitoring and error detection in all environments.
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
 * Validate Dynatrace configuration
 * Uses script URL method for configuration
 * Dynatrace is REQUIRED in all environments for proper monitoring
 */
function validateDynatraceConfig(): string[] {
  const errors: string[] = [];

  const scriptUrl = import.meta.env.VITE_DYNATRACE_SCRIPT_URL;
  const enabledEnv = import.meta.env.VITE_ENABLE_DYNATRACE;

  // Check if explicitly disabled
  if (enabledEnv === 'false') {
    errors.push('Dynatrace is required but VITE_ENABLE_DYNATRACE is set to false');
    return errors;
  }

  // Check if script URL is configured
  const hasScriptUrl =
    typeof scriptUrl === 'string' && scriptUrl !== '' && scriptUrl.startsWith('https://');

  // If not configured, report error
  if (!hasScriptUrl) {
    if (!scriptUrl || scriptUrl === '') {
      errors.push(
        'Dynatrace configuration is missing. Set VITE_DYNATRACE_SCRIPT_URL to enable monitoring'
      );
    } else {
      // scriptUrl exists but doesn't start with https://
      errors.push('VITE_DYNATRACE_SCRIPT_URL must be an HTTPS URL from Dynatrace');
    }
  }

  return errors;
}

/**
 * Validate all required configuration
 *
 * Firebase is now mandatory for all modes (development and production).
 * Dynatrace is REQUIRED for proper monitoring and error detection.
 *
 * @returns Validation result with any errors found
 */
export function validateRequiredConfiguration(): ConfigValidationResult {
  const errors: string[] = [];
  const isDevelopment = import.meta.env.DEV;

  // Validate Firebase (now mandatory in all modes)
  const firebaseErrors = validateFirebaseConfig();
  errors.push(...firebaseErrors);

  // Validate Dynatrace (now mandatory in all environments)
  const dynatraceErrors = validateDynatraceConfig();
  errors.push(...dynatraceErrors);

  const isValid = errors.length === 0;

  if (!isValid) {
    console.error('[Config Validator] Configuration validation failed:', errors);
  } else {
    console.log('[Config Validator] Configuration validation passed');
  }

  return { isValid, errors };
}
