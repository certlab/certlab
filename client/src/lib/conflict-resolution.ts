/**
 * Conflict Resolution Service
 *
 * Provides comprehensive conflict resolution strategies for Firestore operations.
 * Integrates with collaborative-editing for version control and conflict detection.
 *
 * Features:
 * - Automatic field-level merging for non-conflicting changes
 * - Timestamp-based resolution for simple conflicts
 * - User-guided resolution for complex conflicts
 * - Support for different merge strategies per data type
 *
 * @module conflict-resolution
 */

import { ConflictError } from './errors';
import { getDocumentLock, updateDocumentVersion, type DocumentLock } from './collaborative-editing';

/**
 * Conflict resolution strategies
 */
export type ConflictStrategy =
  | 'last-write-wins' // Most recent change takes precedence (timestamp-based)
  | 'first-write-wins' // Original change kept, subsequent changes rejected
  | 'auto-merge' // Automatic field-level merge
  | 'manual' // User must manually resolve
  | 'version-based'; // Use expected version to detect conflicts

/**
 * Represents a conflict between two versions of a document
 */
export interface DocumentConflict<T = any> {
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material' | 'question' | 'userProgress';
  documentId: string;
  localVersion: T;
  remoteVersion: T;
  baseVersion: T | null;
  localTimestamp: Date;
  remoteTimestamp: Date;
  conflictingFields: string[];
  userId: string;
}

/**
 * Result of conflict resolution
 */
export interface ConflictResolutionResult<T = any> {
  resolved: boolean;
  mergedData?: T;
  strategy: ConflictStrategy;
  requiresUserInput: boolean;
  error?: Error;
}

/**
 * Configuration for conflict resolution behavior
 */
export interface ConflictResolutionConfig {
  strategy: ConflictStrategy;
  autoMergeFields?: string[]; // Fields that can be safely auto-merged
  timestampField?: string; // Field to use for timestamp comparison
  versionField?: string; // Field to use for version comparison
}

/**
 * Default configurations for different document types
 */
const DEFAULT_CONFIGS: Record<string, ConflictResolutionConfig> = {
  quiz: {
    strategy: 'auto-merge',
    autoMergeFields: ['title', 'description', 'tags', 'timeLimit'],
    timestampField: 'updatedAt',
    versionField: 'version',
  },
  quizTemplate: {
    strategy: 'auto-merge',
    autoMergeFields: ['title', 'description', 'tags'],
    timestampField: 'updatedAt',
    versionField: 'version',
  },
  question: {
    strategy: 'last-write-wins',
    timestampField: 'updatedAt',
  },
  userProgress: {
    strategy: 'auto-merge',
    autoMergeFields: ['questionsAnswered', 'correctAnswers', 'streak'],
    timestampField: 'lastUpdated',
  },
  lecture: {
    strategy: 'auto-merge',
    autoMergeFields: ['title', 'tags', 'difficulty'],
    timestampField: 'updatedAt',
  },
  material: {
    strategy: 'auto-merge',
    autoMergeFields: ['title', 'description', 'tags'],
    timestampField: 'updatedAt',
  },
};

/**
 * Detect conflicts between local and remote versions
 */
export function detectConflicts<T extends Record<string, any>>(
  local: T,
  remote: T,
  excludeFields: string[] = ['updatedAt', 'lastModified', 'version']
): string[] {
  const conflicts: string[] = [];

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const key of allKeys) {
    // Skip excluded fields
    if (excludeFields.includes(key)) {
      continue;
    }

    const localValue = local[key];
    const remoteValue = remote[key];

    // If values are different and both exist, it's a conflict
    if (
      localValue !== undefined &&
      remoteValue !== undefined &&
      !deepEqual(localValue, remoteValue)
    ) {
      conflicts.push(key);
    }
  }

  return conflicts;
}

/**
 * Deep equality check for values
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== typeof b) return false;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Automatically merge non-conflicting changes from local and remote versions
 */
export function autoMerge<T extends Record<string, any>>(
  local: T,
  remote: T,
  base: T | null,
  config: ConflictResolutionConfig
): ConflictResolutionResult<T> {
  const conflicts = detectConflicts(local, remote);

  // If no conflicts, merge is straightforward
  if (conflicts.length === 0) {
    const merged = { ...remote, ...local };
    return {
      resolved: true,
      mergedData: merged,
      strategy: 'auto-merge',
      requiresUserInput: false,
    };
  }

  // Check if all conflicts are in auto-mergeable fields
  const autoMergeFields = config.autoMergeFields || [];
  const unresolvableConflicts = conflicts.filter((field) => !autoMergeFields.includes(field));

  if (unresolvableConflicts.length > 0) {
    // Cannot auto-merge, requires user input
    return {
      resolved: false,
      strategy: 'auto-merge',
      requiresUserInput: true,
    };
  }

  // All conflicts are auto-mergeable
  const merged = { ...remote };

  for (const field of conflicts) {
    if (autoMergeFields.includes(field)) {
      // Use three-way merge if base version exists
      if (base && base[field] !== undefined) {
        // If local changed but remote didn't, use local
        if (local[field] !== base[field] && remote[field] === base[field]) {
          merged[field] = local[field];
        }
        // If remote changed but local didn't, use remote (already set)
        else if (remote[field] !== base[field] && local[field] === base[field]) {
          // Already using remote value
        }
        // Both changed - use timestamp-based resolution
        else {
          merged[field] = resolveByTimestamp(local, remote, field, config);
        }
      } else {
        // No base version - use timestamp-based resolution
        merged[field] = resolveByTimestamp(local, remote, field, config);
      }
    }
  }

  return {
    resolved: true,
    mergedData: merged as T,
    strategy: 'auto-merge',
    requiresUserInput: false,
  };
}

/**
 * Resolve conflict using timestamp comparison
 */
function resolveByTimestamp<T extends Record<string, any>>(
  local: T,
  remote: T,
  field: string,
  config: ConflictResolutionConfig
): any {
  const timestampField = config.timestampField || 'updatedAt';
  const localTimestamp = local[timestampField];
  const remoteTimestamp = remote[timestampField];

  if (!localTimestamp || !remoteTimestamp) {
    // If no timestamps, prefer local
    return local[field];
  }

  const localTime =
    localTimestamp instanceof Date ? localTimestamp.getTime() : new Date(localTimestamp).getTime();
  const remoteTime =
    remoteTimestamp instanceof Date
      ? remoteTimestamp.getTime()
      : new Date(remoteTimestamp).getTime();

  // Most recent change wins
  return localTime > remoteTime ? local[field] : remote[field];
}

/**
 * Resolve conflict using last-write-wins strategy
 */
export function resolveLastWriteWins<T extends Record<string, any>>(
  local: T,
  remote: T,
  config: ConflictResolutionConfig
): ConflictResolutionResult<T> {
  const timestampField = config.timestampField || 'updatedAt';
  const localTimestamp = local[timestampField];
  const remoteTimestamp = remote[timestampField];

  if (!localTimestamp || !remoteTimestamp) {
    return {
      resolved: true,
      mergedData: local, // Prefer local if no timestamps
      strategy: 'last-write-wins',
      requiresUserInput: false,
    };
  }

  const localTime =
    localTimestamp instanceof Date ? localTimestamp.getTime() : new Date(localTimestamp).getTime();
  const remoteTime =
    remoteTimestamp instanceof Date
      ? remoteTimestamp.getTime()
      : new Date(remoteTimestamp).getTime();

  return {
    resolved: true,
    mergedData: localTime > remoteTime ? local : remote,
    strategy: 'last-write-wins',
    requiresUserInput: false,
  };
}

/**
 * Resolve conflict using first-write-wins strategy
 */
export function resolveFirstWriteWins<T extends Record<string, any>>(
  remote: T
): ConflictResolutionResult<T> {
  return {
    resolved: true,
    mergedData: remote, // Keep the existing (first) version
    strategy: 'first-write-wins',
    requiresUserInput: false,
  };
}

/**
 * Main conflict resolution function
 */
export async function resolveConflict<T extends Record<string, any>>(
  conflict: DocumentConflict<T>,
  config?: Partial<ConflictResolutionConfig>
): Promise<ConflictResolutionResult<T>> {
  // Get default config for document type
  const defaultConfig = DEFAULT_CONFIGS[conflict.documentType] || {
    strategy: 'last-write-wins',
    timestampField: 'updatedAt',
  };

  const finalConfig: ConflictResolutionConfig = {
    ...defaultConfig,
    ...config,
  };

  try {
    switch (finalConfig.strategy) {
      case 'auto-merge':
        return autoMerge(
          conflict.localVersion,
          conflict.remoteVersion,
          conflict.baseVersion,
          finalConfig
        );

      case 'last-write-wins':
        return resolveLastWriteWins(conflict.localVersion, conflict.remoteVersion, finalConfig);

      case 'first-write-wins':
        return resolveFirstWriteWins(conflict.remoteVersion);

      case 'manual':
        // Manual resolution requires user input
        return {
          resolved: false,
          strategy: 'manual',
          requiresUserInput: true,
        };

      case 'version-based':
        // Version-based conflicts always require checking with document lock
        return {
          resolved: false,
          strategy: 'version-based',
          requiresUserInput: true,
        };

      default:
        return {
          resolved: false,
          strategy: finalConfig.strategy,
          requiresUserInput: true,
          error: new Error(`Unknown strategy: ${finalConfig.strategy}`),
        };
    }
  } catch (error) {
    return {
      resolved: false,
      strategy: finalConfig.strategy,
      requiresUserInput: true,
      error: error instanceof Error ? error : new Error('Unknown error during resolution'),
    };
  }
}

/**
 * Check for version conflicts and resolve if possible
 */
export async function checkAndResolveVersionConflict<T extends Record<string, any>>(
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  localData: T,
  expectedVersion: number | undefined,
  userId: string
): Promise<ConflictResolutionResult<T>> {
  try {
    // Get current document lock
    const lock = await getDocumentLock(documentType, documentId, userId);

    // Check for version mismatch
    if (expectedVersion !== undefined && lock.version !== expectedVersion) {
      // Version conflict detected
      throw new ConflictError('Document has been modified by another user', {
        documentType,
        documentId,
        expectedVersion,
        currentVersion: lock.version,
        userId,
      });
    }

    return {
      resolved: true,
      mergedData: localData,
      strategy: 'version-based',
      requiresUserInput: false,
    };
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        resolved: false,
        strategy: 'version-based',
        requiresUserInput: true,
        error,
      };
    }
    throw error;
  }
}

/**
 * Apply resolved changes and update document version
 */
export async function applyResolvedChanges<T extends Record<string, any>>(
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  mergedData: T,
  userId: string,
  expectedVersion?: number
): Promise<{ success: boolean; newVersion: number }> {
  const result = await updateDocumentVersion(documentType, documentId, userId, expectedVersion);

  if (!result.success) {
    throw new ConflictError('Failed to update document version', {
      documentType,
      documentId,
      expectedVersion,
      currentVersion: result.currentVersion,
      conflict: result.conflict,
    });
  }

  return {
    success: true,
    newVersion: result.currentVersion,
  };
}

/**
 * Get configuration for a document type
 */
export function getConflictConfig(documentType: string): ConflictResolutionConfig {
  return (
    DEFAULT_CONFIGS[documentType] || {
      strategy: 'last-write-wins',
      timestampField: 'updatedAt',
    }
  );
}
