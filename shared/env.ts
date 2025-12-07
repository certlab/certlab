/**
 * Environment variable validation using zod.
 *
 * This module provides type-safe access to environment variables with
 * validation and sensible defaults where appropriate.
 *
 * Build-time variables (VITE_*) are validated at build time.
 * Server-side variables are validated at runtime startup.
 */

import { z } from 'zod';

/**
 * URL validation schema (reused to avoid creating new instances).
 */
const urlSchema = z.string().url();

/**
 * Build/Vite environment variables schema.
 * These are used during the build process and in vite.config.ts.
 */
export const buildEnvSchema = z.object({
  /**
   * The base path for the application.
   * Used for deployment configuration.
   * Defaults to '/' (root path) for Firebase Hosting.
   */
  VITE_BASE_PATH: z.string().optional(),

  /**
   * Node environment.
   * Used to determine build mode and defaults.
   */
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
});

/**
 * Server/script environment variables schema.
 * These are used by server-side scripts like import scripts.
 */
export const serverEnvSchema = z.object({
  /**
   * Session secret for secure session management.
   * Optional - only needed for server-side session handling.
   */
  SESSION_SECRET: z.string().optional(),

  /**
   * Database connection string.
   * Optional - only needed for database operations in server scripts.
   * Use requireDatabaseUrl() for scripts that require database access.
   */
  DATABASE_URL: z.string().optional(),

  /**
   * Application base URL.
   * Defaults to http://localhost:5000 if not set or empty.
   */
  APP_URL: z.preprocess(
    (val) => (val === '' || val === undefined ? 'http://localhost:5000' : val),
    z.string().url()
  ),

  /**
   * Polar API key for subscription management.
   */
  POLAR_API_KEY: z.string().optional(),

  /**
   * Polar organization ID.
   */
  POLAR_ORGANIZATION_ID: z.string().optional(),

  /**
   * Polar Pro product ID.
   */
  POLAR_PRO_PRODUCT_ID: z.string().optional(),

  /**
   * Polar Enterprise product ID.
   */
  POLAR_ENTERPRISE_PRODUCT_ID: z.string().optional(),

  /**
   * Polar webhook secret for validating webhooks.
   */
  POLAR_WEBHOOK_SECRET: z.string().optional(),
});

/**
 * Type for validated build environment variables.
 */
export type BuildEnv = z.infer<typeof buildEnvSchema>;

/**
 * Type for validated server environment variables.
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates and returns build environment variables.
 * Used in vite.config.ts and build-time configuration.
 *
 * @returns Validated build environment variables with defaults applied
 * @throws ZodError if validation fails
 */
export function validateBuildEnv(): BuildEnv {
  const env = {
    VITE_BASE_PATH: process.env.VITE_BASE_PATH,
    NODE_ENV: process.env.NODE_ENV,
  };

  return buildEnvSchema.parse(env);
}

/**
 * Validates and returns server environment variables.
 * Used in server scripts and runtime configuration.
 *
 * @returns Validated server environment variables with defaults applied
 * @throws ZodError if validation fails
 */
export function validateServerEnv(): ServerEnv {
  const env = {
    SESSION_SECRET: process.env.SESSION_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    APP_URL: process.env.APP_URL,
    POLAR_API_KEY: process.env.POLAR_API_KEY,
    POLAR_ORGANIZATION_ID: process.env.POLAR_ORGANIZATION_ID,
    POLAR_PRO_PRODUCT_ID: process.env.POLAR_PRO_PRODUCT_ID,
    POLAR_ENTERPRISE_PRODUCT_ID: process.env.POLAR_ENTERPRISE_PRODUCT_ID,
    POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
  };

  return serverEnvSchema.parse(env);
}

/**
 * Gets the base path for the application.
 *
 * Priority:
 * 1. VITE_BASE_PATH environment variable if set
 * 2. '/' (root path) as default for Firebase Hosting
 *
 * @returns The base path for the application
 */
export function getBasePath(): string {
  const env = validateBuildEnv();

  if (env.VITE_BASE_PATH) {
    return env.VITE_BASE_PATH;
  }

  return '/';
}

/**
 * Validates that required database environment is present.
 * Throws a descriptive error if DATABASE_URL is missing or invalid.
 *
 * @throws Error if DATABASE_URL is not set or is not a valid URL
 */
export function requireDatabaseUrl(): string {
  const env = validateServerEnv();
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is required.\n' +
        'Please set it in your .env file or environment.\n' +
        'See .env.example for the expected format.'
    );
  }

  // Validate it's a proper URL using the module-level schema
  const result = urlSchema.safeParse(databaseUrl);

  if (!result.success) {
    throw new Error(
      'DATABASE_URL must be a valid URL.\n' +
        `Current value: ${databaseUrl}\n` +
        'Expected format: postgresql://user:password@host:port/database'
    );
  }

  return databaseUrl;
}
