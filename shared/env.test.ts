import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  buildEnvSchema, 
  serverEnvSchema, 
  validateBuildEnv, 
  getBasePath,
  requireDatabaseUrl 
} from './env';

describe('Environment validation schemas', () => {
  describe('buildEnvSchema', () => {
    it('should accept valid build environment', () => {
      const result = buildEnvSchema.safeParse({
        VITE_BASE_PATH: '/custom/',
        NODE_ENV: 'production',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty VITE_BASE_PATH', () => {
      const result = buildEnvSchema.safeParse({
        NODE_ENV: 'development',
      });
      expect(result.success).toBe(true);
    });

    it('should default NODE_ENV to development', () => {
      const result = buildEnvSchema.parse({});
      expect(result.NODE_ENV).toBe('development');
    });

    it('should reject invalid NODE_ENV values', () => {
      const result = buildEnvSchema.safeParse({
        NODE_ENV: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid NODE_ENV values', () => {
      const environments = ['development', 'production', 'test'] as const;
      for (const env of environments) {
        const result = buildEnvSchema.safeParse({ NODE_ENV: env });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('serverEnvSchema', () => {
    it('should accept valid server environment', () => {
      const result = serverEnvSchema.safeParse({
        SESSION_SECRET: 'secret123',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        APP_URL: 'http://localhost:5000',
      });
      expect(result.success).toBe(true);
    });

    it('should default APP_URL to localhost', () => {
      const result = serverEnvSchema.parse({});
      expect(result.APP_URL).toBe('http://localhost:5000');
    });

    it('should default APP_URL when empty string is provided', () => {
      const result = serverEnvSchema.parse({ APP_URL: '' });
      expect(result.APP_URL).toBe('http://localhost:5000');
    });

    it('should accept any DATABASE_URL string (validation happens in requireDatabaseUrl)', () => {
      const result = serverEnvSchema.safeParse({
        DATABASE_URL: 'any-string-value',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty DATABASE_URL', () => {
      const result = serverEnvSchema.safeParse({
        DATABASE_URL: '',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all optional Polar configuration', () => {
      const result = serverEnvSchema.safeParse({
        POLAR_API_KEY: 'api-key',
        POLAR_ORGANIZATION_ID: 'org-id',
        POLAR_PRO_PRODUCT_ID: 'pro-id',
        POLAR_ENTERPRISE_PRODUCT_ID: 'enterprise-id',
        POLAR_WEBHOOK_SECRET: 'webhook-secret',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Environment validation functions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateBuildEnv', () => {
    it('should return validated build environment', () => {
      process.env.VITE_BASE_PATH = '/test/';
      process.env.NODE_ENV = 'production';
      
      const result = validateBuildEnv();
      expect(result.VITE_BASE_PATH).toBe('/test/');
      expect(result.NODE_ENV).toBe('production');
    });

    it('should handle undefined environment variables', () => {
      delete process.env.VITE_BASE_PATH;
      delete process.env.NODE_ENV;
      
      const result = validateBuildEnv();
      expect(result.VITE_BASE_PATH).toBeUndefined();
      expect(result.NODE_ENV).toBe('development');
    });
  });

  describe('getBasePath', () => {
    it('should return VITE_BASE_PATH if set', () => {
      process.env.VITE_BASE_PATH = '/custom/';
      process.env.NODE_ENV = 'production';
      
      expect(getBasePath()).toBe('/custom/');
    });

    it('should return /certlab/ in production without VITE_BASE_PATH', () => {
      delete process.env.VITE_BASE_PATH;
      process.env.NODE_ENV = 'production';
      
      expect(getBasePath()).toBe('/certlab/');
    });

    it('should return / in development without VITE_BASE_PATH', () => {
      delete process.env.VITE_BASE_PATH;
      delete process.env.NODE_ENV;
      
      expect(getBasePath()).toBe('/');
    });

    it('should return / in test environment without VITE_BASE_PATH', () => {
      delete process.env.VITE_BASE_PATH;
      process.env.NODE_ENV = 'test';
      
      expect(getBasePath()).toBe('/');
    });
  });

  describe('requireDatabaseUrl', () => {
    it('should return DATABASE_URL when valid', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      
      expect(requireDatabaseUrl()).toBe('postgresql://user:pass@localhost:5432/db');
    });

    it('should throw when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      
      expect(() => requireDatabaseUrl()).toThrow('DATABASE_URL environment variable is required');
    });

    it('should throw when DATABASE_URL is empty', () => {
      process.env.DATABASE_URL = '';
      
      expect(() => requireDatabaseUrl()).toThrow('DATABASE_URL environment variable is required');
    });

    it('should throw when DATABASE_URL is not a valid URL', () => {
      process.env.DATABASE_URL = 'not-a-url';
      
      expect(() => requireDatabaseUrl()).toThrow('DATABASE_URL must be a valid URL');
    });
  });
});
