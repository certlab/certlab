/**
 * Global test setup for Vitest
 *
 * This file is run before all test files.
 *
 * Note: Firestore/Firebase mocking is handled in individual test files
 * that require storage operations. See examples in:
 * - client/src/lib/auth-provider.test.tsx
 * - client/src/components/ContributionHeatmap.test.tsx
 *
 * Tests mock the storage-factory module to avoid Firestore dependencies.
 */

import '@testing-library/jest-dom';
