/**
 * Dynatrace Real User Monitoring (RUM) Integration
 *
 * This module provides Dynatrace observability for the CertLab application.
 * It handles initialization, custom action tracking, and error reporting.
 *
 * REQUIRED: Dynatrace is mandatory for proper monitoring and error detection.
 *
 * Features:
 * - Automatic page load and route change tracking
 * - Custom action tracking for user interactions
 * - Error and exception monitoring
 * - Performance metrics collection
 * - User session tracking
 *
 * Setup:
 * 1. Configure environment variables in .env (see .env.example)
 * 2. Call initializeDynatrace() at application startup - will throw if not configured
 * 3. Use trackAction() for custom event tracking
 *
 * See docs/setup/dynatrace.md for detailed configuration instructions.
 */

/**
 * Dynatrace configuration interface
 */
export interface DynatraceConfig {
  scriptUrl: string;
  enabled: boolean;
  devMode: boolean;
  appName: string;
  actionPrefix?: string;
}

/**
 * Dynatrace API interface (subset of dtrum API)
 * @see https://www.dynatrace.com/support/help/platform-modules/digital-experience/web-applications/support/javascript-api
 */
interface DynatraceAPI {
  enable(): void;
  disable(): void;
  enterAction(name: string, actionType?: string, startTime?: number, sourceUrl?: string): number;
  leaveAction(actionId: number, stopTime?: number, startTime?: number): void;
  reportError(error: Error | string, parentActionId?: number): void;
  addEnterActionListener(callback: (actionId: number, actionName: string) => void): void;
  addLeaveActionListener(callback: (actionId: number) => void): void;
  identifyUser(userId: string): void;
  endSession(): void;
  sendBeacon(force?: boolean): boolean;
  now(): number;
}

/**
 * Extend window interface to include Dynatrace
 */
declare global {
  interface Window {
    dtrum?: DynatraceAPI;
    dT_?: {
      initAngularNg?(): void;
      initReact?(): void;
    };
  }
}

/**
 * Get Dynatrace configuration from environment variables
 * @throws {Error} If configuration is missing or invalid (Dynatrace is required)
 */
export function getDynatraceConfig(): DynatraceConfig {
  const scriptUrl = import.meta.env.VITE_DYNATRACE_SCRIPT_URL;
  // Parse boolean environment variables (they come as strings)
  const enabledEnv = import.meta.env.VITE_ENABLE_DYNATRACE;
  const explicitlyDisabled = enabledEnv === 'false';
  const devMode = String(import.meta.env.VITE_DYNATRACE_DEV_MODE || 'false') === 'true';
  const appName = import.meta.env.VITE_DYNATRACE_APP_NAME || 'CertLab';
  const actionPrefix = import.meta.env.VITE_DYNATRACE_ACTION_PREFIX;

  // Check if explicitly disabled
  if (explicitlyDisabled) {
    throw new Error(
      'Dynatrace monitoring is required but VITE_ENABLE_DYNATRACE is set to false. ' +
        'Remove this setting or set it to true.'
    );
  }

  // Validate required configuration
  const hasValidConfig = typeof scriptUrl === 'string' && scriptUrl.startsWith('https://');
  if (!hasValidConfig) {
    throw new Error(
      'Dynatrace configuration is missing or invalid. ' +
        'VITE_DYNATRACE_SCRIPT_URL must be set to an HTTPS URL from Dynatrace. ' +
        'See docs/setup/dynatrace.md for setup instructions.'
    );
  }

  return {
    scriptUrl,
    enabled: true,
    devMode,
    appName,
    actionPrefix,
  };
}

/**
 * Check if Dynatrace is available and loaded
 */
export function isDynatraceAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.dtrum !== 'undefined';
}

/**
 * Initialize Dynatrace RUM monitoring
 *
 * This should be called once at application startup, before any user interactions.
 * The Dynatrace script must be loaded via index.html for this to work.
 *
 * @throws {Error} If Dynatrace configuration is missing or initialization fails
 * @returns true if initialization successful
 */
export function initializeDynatrace(): boolean {
  const config = getDynatraceConfig(); // Will throw if config is missing

  // Wait for dtrum to be available (it's loaded via script tag in index.html)
  if (!isDynatraceAvailable()) {
    throw new Error(
      'Dynatrace dtrum API is not available. ' +
        'Ensure the Dynatrace script is properly loaded in index.html. ' +
        'The script should be loaded from: ' +
        config.scriptUrl
    );
  }

  try {
    // Enable Dynatrace if it was previously disabled
    window.dtrum!.enable();

    // Initialize React integration if available
    if (window.dT_?.initReact) {
      window.dT_.initReact();
    }

    console.log(`[Dynatrace] Successfully initialized for ${config.appName}`);
    return true;
  } catch (error) {
    console.error('[Dynatrace] Initialization failed:', error);
    throw new Error(
      `Dynatrace initialization failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Track a custom user action
 *
 * Use this to track significant user interactions that aren't automatically
 * captured by Dynatrace (e.g., completing a quiz, earning a badge).
 *
 * @param actionName Name of the action (e.g., "Quiz Completed", "Badge Earned")
 * @param actionType Type of action (e.g., "click", "custom")
 * @returns Action ID if tracking successful, -1 otherwise
 *
 * @example
 * ```typescript
 * const actionId = trackAction("Quiz Completed", "custom");
 * // ... perform action ...
 * completeAction(actionId);
 * ```
 */
export function trackAction(actionName: string, actionType: string = 'custom'): number {
  if (!isDynatraceAvailable()) {
    console.warn('[Dynatrace] dtrum API not available - cannot track action:', actionName);
    return -1;
  }

  try {
    const config = getDynatraceConfig();
    const prefixedName = config?.actionPrefix ? `${config.actionPrefix}${actionName}` : actionName;

    return window.dtrum!.enterAction(prefixedName, actionType);
  } catch (error) {
    console.error('[Dynatrace] Failed to track action:', error);
    return -1;
  }
}

/**
 * Complete a tracked action
 *
 * @param actionId The action ID returned by trackAction()
 *
 * @example
 * ```typescript
 * const actionId = trackAction("Quiz Completed");
 * // ... action logic ...
 * completeAction(actionId);
 * ```
 */
export function completeAction(actionId: number): void {
  if (!isDynatraceAvailable() || actionId === -1) {
    return;
  }

  try {
    window.dtrum!.leaveAction(actionId);
  } catch (error) {
    console.error('[Dynatrace] Failed to complete action:', error);
  }
}

/**
 * Report an error to Dynatrace
 *
 * Use this to manually report errors that might not be caught automatically.
 *
 * @param error Error object or error message string
 * @param parentActionId Optional parent action ID to associate the error with
 *
 * @example
 * ```typescript
 * try {
 *   // ... code that might throw ...
 * } catch (error) {
 *   reportError(error);
 *   throw error; // Re-throw if needed
 * }
 * ```
 */
export function reportError(error: Error | string, parentActionId?: number): void {
  if (!isDynatraceAvailable()) {
    return;
  }

  try {
    window.dtrum!.reportError(error, parentActionId);
  } catch (err) {
    console.error('[Dynatrace] Failed to report error:', err);
  }
}

/**
 * Identify the current user for session tracking
 *
 * Call this after user authentication to associate sessions with user IDs.
 * Do NOT pass personally identifiable information (PII) like names or emails.
 *
 * @param userId Anonymous user ID (e.g., hashed user ID, UUID)
 *
 * @example
 * ```typescript
 * // After successful login
 * identifyUser(user.id.toString());
 * ```
 */
export function identifyUser(userId: string): void {
  if (!isDynatraceAvailable()) {
    return;
  }

  try {
    window.dtrum!.identifyUser(userId);
  } catch (error) {
    console.error('[Dynatrace] Failed to identify user:', error);
  }
}

/**
 * End the current user session
 *
 * Call this on user logout to properly close the Dynatrace session.
 *
 * @example
 * ```typescript
 * // On logout
 * endSession();
 * ```
 */
export function endSession(): void {
  if (!isDynatraceAvailable()) {
    return;
  }

  try {
    window.dtrum!.endSession();
  } catch (error) {
    console.error('[Dynatrace] Failed to end session:', error);
  }
}

/**
 * Force send all collected data to Dynatrace
 *
 * Useful for ensuring data is sent before page unload or navigation.
 *
 * @param force If true, sends beacon even if buffer is not full
 * @returns true if beacon was sent, false otherwise
 */
export function sendBeacon(force: boolean = false): boolean {
  if (!isDynatraceAvailable()) {
    return false;
  }

  try {
    return window.dtrum!.sendBeacon(force);
  } catch (error) {
    console.error('[Dynatrace] Failed to send beacon:', error);
    return false;
  }
}

/**
 * Get current high-resolution timestamp from Dynatrace
 *
 * @returns Current timestamp in milliseconds
 */
export function now(): number {
  if (!isDynatraceAvailable()) {
    return Date.now();
  }

  try {
    return window.dtrum!.now();
  } catch (error) {
    console.error('[Dynatrace] Failed to get timestamp:', error);
    return Date.now();
  }
}

/**
 * Convenience function to track an action with automatic completion
 *
 * @param actionName Name of the action
 * @param fn Async function to execute and track
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const result = await trackAsyncAction("Save User Data", async () => {
 *   return await saveUserData(data);
 * });
 * ```
 */
export async function trackAsyncAction<T>(actionName: string, fn: () => Promise<T>): Promise<T> {
  const actionId = trackAction(actionName);

  try {
    const result = await fn();
    completeAction(actionId);
    return result;
  } catch (error) {
    reportError(error instanceof Error ? error : String(error), actionId);
    completeAction(actionId);
    throw error;
  }
}

/**
 * Convenience function to track a synchronous action with automatic completion
 *
 * @param actionName Name of the action
 * @param fn Function to execute and track
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const result = trackSyncAction("Calculate Score", () => {
 *   return calculateQuizScore(answers);
 * });
 * ```
 */
export function trackSyncAction<T>(actionName: string, fn: () => T): T {
  const actionId = trackAction(actionName);

  try {
    const result = fn();
    completeAction(actionId);
    return result;
  } catch (error) {
    reportError(error instanceof Error ? error : String(error), actionId);
    completeAction(actionId);
    throw error;
  }
}
