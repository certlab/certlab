/**
 * Granular Debug Message Control System
 * 
 * This module provides configurable debug output with:
 * - Message categories (info, warn, error, feature)
 * - Production vs. development configuration
 * - Runtime enable/disable via URL parameters or localStorage
 * 
 * Usage:
 *   import { debug } from '@/lib/debug';
 *   debug.info('General information');
 *   debug.warn('Warning message');
 *   debug.error('Error occurred', errorObject);
 *   debug.feature('auth', 'User logged in');
 * 
 * Runtime Configuration:
 *   URL params: ?debug=info,warn,error,auth,quiz
 *   localStorage: localStorage.setItem('debug', 'info,warn,error')
 *   Enable all: ?debug=* or localStorage.setItem('debug', '*')
 */

export type DebugCategory = 'info' | 'warn' | 'error';
export type FeatureCategory = string;
export type DebugCategoryInput = DebugCategory | FeatureCategory | 'all' | '*';

interface DebugConfig {
  /** Enable info-level messages */
  info: boolean;
  /** Enable warning-level messages */
  warn: boolean;
  /** Enable error-level messages (always enabled by default) */
  error: boolean;
  /** Feature-specific debug categories */
  features: Set<string>;
  /** Enable all debug output */
  all: boolean;
}

/**
 * Detect if running in development environment
 * Checks for common development patterns:
 * - localhost or 127.0.0.1
 * - .local domains
 * - Common development ports (3000, 5000, 5173, 8080)
 * - import.meta.env.MODE for Vite applications
 */
function detectDevelopment(): boolean {
  if (typeof window === 'undefined') {
    return import.meta.env.MODE !== 'production';
  }
  
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // Check for known production domains first (takes priority over port checks)
  const prodDomains = ['github.io', 'githubusercontent.com', 'netlify.app', 'vercel.app'];
  const isProdDomain = prodDomains.some(d => hostname.endsWith(d));
  if (isProdDomain) return false;
  
  // Check hostname patterns
  const devHostnames = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
  ];
  
  const isDevHostname = devHostnames.some(h => hostname === h) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost') ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||  // Private IP range
    /^10\.\d+\.\d+\.\d+$/.test(hostname);     // Private IP range
  
  // Check for development ports
  const devPorts = ['3000', '5000', '5173', '8080', '8000', '4200', '3001'];
  const isDevPort = port !== '' && devPorts.includes(port);
  
  return isDevHostname || isDevPort;
}

const isProduction = !detectDevelopment();

const defaultConfig: DebugConfig = {
  info: !isProduction,
  warn: !isProduction,
  error: true, // Errors are always logged
  features: new Set<string>(),
  all: false,
};

let config: DebugConfig = { ...defaultConfig, features: new Set(defaultConfig.features) };

const STORAGE_KEY = 'debug';

/**
 * Parse debug configuration from a string (URL param or localStorage value)
 * Supports: 'info', 'warn', 'error', 'all', '*', 'none', or feature names like 'auth', 'quiz'
 */
function parseDebugString(debugStr: string): Partial<DebugConfig> {
  const parts = debugStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const result: Partial<DebugConfig> & { features: Set<string> } = { features: new Set<string>() };
  
  for (const part of parts) {
    if (part === 'none') {
      // Special value indicating all optional debug output is explicitly disabled
      result.all = false;
      result.info = false;
      result.warn = false;
      // Error logging is not affected by 'none' - it remains at default (true)
    } else if (part === '*' || part === 'all') {
      result.all = true;
      result.info = true;
      result.warn = true;
      result.error = true;
    } else if (part === 'info') {
      result.info = true;
    } else if (part === 'warn') {
      result.warn = true;
    } else if (part === 'error') {
      result.error = true;
    } else {
      // Treat as feature category
      result.features.add(part);
    }
  }
  
  return result;
}

/**
 * Load configuration from URL parameters and localStorage
 */
function loadRuntimeConfig(): void {
  if (typeof window === 'undefined') return;
  
  // Check URL parameters first (higher priority)
  const urlParams = new URLSearchParams(window.location.search);
  const urlDebug = urlParams.get('debug');
  
  if (urlDebug) {
    const parsed = parseDebugString(urlDebug);
    mergeConfig(parsed);
    saveConfig(); // Persist URL params to localStorage
    return;
  }
  
  // Fall back to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseDebugString(stored);
      mergeConfig(parsed);
    }
  } catch {
    // localStorage may not be available
  }
}

/**
 * Merge parsed config into the current config
 */
function mergeConfig(parsed: Partial<DebugConfig> & { features?: Set<string> }): void {
  if (parsed.all !== undefined) config.all = parsed.all;
  if (parsed.info !== undefined) config.info = parsed.info;
  if (parsed.warn !== undefined) config.warn = parsed.warn;
  if (parsed.error !== undefined) config.error = parsed.error;
  if (parsed.features) {
    parsed.features.forEach(f => config.features.add(f));
  }
}

// Initialize config on module load
loadRuntimeConfig();

/**
 * Check if a category is enabled
 */
function isEnabled(category: DebugCategory | FeatureCategory): boolean {
  if (config.all) return true;
  
  if (category === 'info') return config.info;
  if (category === 'warn') return config.warn;
  if (category === 'error') return config.error;
  
  // Feature category
  return config.features.has(category.toLowerCase());
}

/**
 * Format the debug prefix with timestamp and category
 */
function formatPrefix(category: string): string {
  const timestamp = new Date().toISOString().substring(11, 23); // HH:mm:ss.mmm
  return `[${timestamp}] [${category.toUpperCase()}]`;
}

/**
 * Debug utility object with granular control
 */
export const debug = {
  /**
   * Log info-level message (development only by default)
   */
  info: (message: string, ...args: unknown[]): void => {
    if (isEnabled('info')) {
      console.log(formatPrefix('info'), message, ...args);
    }
  },
  
  /**
   * Log warning-level message (development only by default)
   */
  warn: (message: string, ...args: unknown[]): void => {
    if (isEnabled('warn')) {
      console.warn(formatPrefix('warn'), message, ...args);
    }
  },
  
  /**
   * Log error-level message (always enabled by default)
   */
  error: (message: string, ...args: unknown[]): void => {
    if (isEnabled('error')) {
      console.error(formatPrefix('error'), message, ...args);
    }
  },
  
  /**
   * Log feature-specific message
   * @param feature - Feature category name (e.g., 'auth', 'quiz', 'storage'). Case-insensitive.
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  feature: (feature: FeatureCategory, message: string, ...args: unknown[]): void => {
    if (isEnabled(feature)) {
      console.log(formatPrefix(feature), message, ...args);
    }
  },
  
  /**
   * Check if a specific category is currently enabled
   */
  isEnabled,
  
  /**
   * Enable a debug category at runtime
   */
  enable: (category: DebugCategoryInput): void => {
    if (category === 'info') config.info = true;
    else if (category === 'warn') config.warn = true;
    else if (category === 'error') config.error = true;
    else if (category === 'all' || category === '*') config.all = true;
    else config.features.add(category.toLowerCase());
    
    saveConfig();
  },
  
  /**
   * Disable a debug category at runtime
   */
  disable: (category: DebugCategoryInput): void => {
    if (category === 'info') config.info = false;
    else if (category === 'warn') config.warn = false;
    else if (category === 'error') config.error = false;
    else if (category === 'all' || category === '*') config.all = false;
    else config.features.delete(category.toLowerCase());
    
    saveConfig();
  },
  
  /**
   * Enable all debug output
   */
  enableAll: (): void => {
    config.all = true;
    saveConfig();
  },
  
  /**
   * Disable all optional debug output.
   * Note: Does not modify the error flag - error logging state is preserved.
   */
  disableAll: (): void => {
    config.all = false;
    config.info = false;
    config.warn = false;
    config.features.clear();
    // Does not modify config.error - error logging state is preserved
    saveConfig();
  },
  
  /**
   * Reset configuration to defaults
   */
  reset: (): void => {
    config = { ...defaultConfig, features: new Set(defaultConfig.features) };
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // localStorage may not be available
      }
    }
  },
  
  /**
   * Get current configuration (for debugging/testing)
   */
  getConfig: (): Readonly<Omit<DebugConfig, 'features'> & { features: string[] }> => ({
    info: config.info,
    warn: config.warn,
    error: config.error,
    all: config.all,
    features: Array.from(config.features),
  }),
};

/**
 * Save current configuration to localStorage
 * Note: The 'error' flag is not persisted; error logging is always enabled by default on load
 */
function saveConfig(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const parts: string[] = [];
    if (config.all) parts.push('*');
    else {
      if (config.info) parts.push('info');
      if (config.warn) parts.push('warn');
      // Do not persist 'error' flag; error logging is always enabled by default
      config.features.forEach(f => parts.push(f));
    }
    
    if (parts.length > 0) {
      localStorage.setItem(STORAGE_KEY, parts.join(','));
    } else {
      // Store a special value to indicate all optional debug output is explicitly disabled
      localStorage.setItem(STORAGE_KEY, 'none');
    }
  } catch {
    // localStorage may not be available
  }
}

// Export for convenience - allows: import debug from '@/lib/debug'
export default debug;
