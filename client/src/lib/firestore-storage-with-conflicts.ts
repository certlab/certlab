/**
 * Conflict-Aware Firestore Storage Wrapper
 *
 * Wraps critical Firestore storage operations with conflict detection and resolution.
 * Provides version-aware updates and automatic conflict handling.
 *
 * @module firestore-storage-with-conflicts
 */

import { ConflictError } from './errors';
import {
  type DocumentConflict,
  type ConflictResolutionResult,
  type ConflictStrategy,
  type ConflictDocumentType,
} from './conflict-resolution';
import {
  getDocumentLock,
  updateDocumentVersion,
  setEditorPresence,
  removeEditorPresence,
} from './collaborative-editing';
import { logError, logInfo } from './errors';

export interface ConflictAwareUpdateOptions {
  strategy?: ConflictStrategy;
  expectedVersion?: number;
  trackPresence?: boolean;
  maxRetries?: number;
}

export interface UpdateWithConflictResult<T> {
  success: boolean;
  data?: T;
  conflict?: DocumentConflict;
  requiresUserInput?: boolean;
  error?: Error;
}

/**
 * Perform a version-aware update with conflict detection and resolution
 */
export async function updateWithConflictResolution<T extends Record<string, any>>(
  documentType: ConflictDocumentType,
  documentId: string,
  localData: T,
  userId: string,
  updateFn: (data: T) => Promise<T>,
  options: ConflictAwareUpdateOptions = {}
): Promise<UpdateWithConflictResult<T>> {
  const {
    strategy = 'auto-merge',
    expectedVersion,
    trackPresence = false,
    maxRetries = 3,
  } = options;

  let retryCount = 0;
  let lastError: Error | undefined;

  // Set presence if tracking is enabled (only for supported document types)
  if (
    trackPresence &&
    (documentType === 'quiz' ||
      documentType === 'quizTemplate' ||
      documentType === 'lecture' ||
      documentType === 'material')
  ) {
    try {
      await setEditorPresence(userId, 'User', documentType, documentId);
    } catch (error) {
      logError('setEditorPresence', error, { userId, documentType, documentId });
      // Continue even if presence fails
    }
  }

  try {
    while (retryCount < maxRetries) {
      try {
        // For document types that support versioning
        const supportsVersioning =
          documentType === 'quiz' ||
          documentType === 'quizTemplate' ||
          documentType === 'lecture' ||
          documentType === 'material';

        let currentVersion = 0;

        if (supportsVersioning) {
          // Get current document lock
          const lock = await getDocumentLock(documentType, documentId, userId);
          currentVersion = lock.version;

          // Check for version conflict BEFORE updating
          if (expectedVersion !== undefined && lock.version !== expectedVersion) {
            // Version conflict detected
            // The caller should fetch the remote document and trigger conflict resolution
            // via the useConflictResolution hook or resolveConflict function
            throw new ConflictError('Version conflict detected', {
              documentType,
              documentId,
              expectedVersion,
              currentVersion: lock.version,
              userId,
            });
          }
        }

        // Perform the update (version check passed)
        const updatedData = await updateFn({
          ...localData,
          version: currentVersion,
        });

        if (supportsVersioning) {
          // Update document version after successful data update
          const versionResult = await updateDocumentVersion(
            documentType,
            documentId,
            userId,
            currentVersion
          );

          if (!versionResult.success) {
            throw new ConflictError('Failed to update document version', {
              documentType,
              documentId,
              expectedVersion: currentVersion,
              currentVersion: versionResult.currentVersion,
              conflict: versionResult.conflict,
            });
          }

          currentVersion = versionResult.currentVersion;
        }

        // Success!
        logInfo('Document updated successfully', {
          documentType,
          documentId,
          version: currentVersion,
        });

        return {
          success: true,
          data: {
            ...updatedData,
            version: currentVersion,
          } as T,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (error instanceof ConflictError) {
          // Handle conflict based on strategy
          const context = error.context;

          if (!context || retryCount >= maxRetries - 1) {
            // Cannot retry or max retries reached
            // Try to construct a conflict object from error context
            let conflict: DocumentConflict | undefined;
            if (context && context.documentType && context.documentId) {
              conflict = {
                documentType: context.documentType as ConflictDocumentType,
                documentId: String(context.documentId),
                localVersion: localData,
                remoteVersion: {}, // Caller should fetch remote version
                baseVersion: null,
                localTimestamp: new Date(),
                remoteTimestamp: new Date(),
                conflictingFields: [],
                userId: String(context.userId || userId),
              };
            }

            return {
              success: false,
              requiresUserInput: true,
              conflict,
              error: lastError,
            };
          }

          // Try automatic resolution if strategy allows
          if (strategy !== 'manual') {
            logInfo('Attempting automatic conflict resolution', {
              documentType,
              documentId,
              strategy,
              retryCount,
            });

            retryCount++;
            // Retry with exponential backoff (100ms, 200ms, 400ms, ...)
            const baseDelayMs = 100;
            const delayMs = Math.pow(2, retryCount - 1) * baseDelayMs;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }

          // Manual resolution required
          let conflict: DocumentConflict | undefined;
          if (context && context.documentType && context.documentId) {
            conflict = {
              documentType: context.documentType as ConflictDocumentType,
              documentId: String(context.documentId),
              localVersion: localData,
              remoteVersion: {},
              baseVersion: null,
              localTimestamp: new Date(),
              remoteTimestamp: new Date(),
              conflictingFields: [],
              userId: String(context.userId || userId),
            };
          }

          return {
            success: false,
            requiresUserInput: true,
            conflict,
            error: lastError,
          };
        }

        // Non-conflict error
        logError('updateWithConflictResolution', error, {
          documentType,
          documentId,
          retryCount,
        });

        throw error;
      }
    }

    // Max retries exceeded
    return {
      success: false,
      error: lastError || new Error('Max retries exceeded'),
    };
  } finally {
    // Remove presence on all exit paths (only for supported document types)
    if (
      trackPresence &&
      (documentType === 'quiz' ||
        documentType === 'quizTemplate' ||
        documentType === 'lecture' ||
        documentType === 'material')
    ) {
      try {
        await removeEditorPresence(userId, documentType, documentId);
      } catch (error) {
        logError('removeEditorPresence', error, { userId, documentType, documentId });
      }
    }
  }
}

/**
 * Batch update with conflict resolution
 * Updates multiple documents with conflict detection
 */
export async function batchUpdateWithConflictResolution<T extends Record<string, any>>(
  documentType: ConflictDocumentType,
  updates: Array<{ id: string; data: T }>,
  userId: string,
  updateFn: (id: string, data: T) => Promise<T>,
  options: ConflictAwareUpdateOptions = {}
): Promise<{
  successful: Array<{ id: string; data: T }>;
  failed: Array<{ id: string; error: Error }>;
  conflicts: Array<{ id: string; conflict: DocumentConflict }>;
}> {
  const results = {
    successful: [] as Array<{ id: string; data: T }>,
    failed: [] as Array<{ id: string; error: Error }>,
    conflicts: [] as Array<{ id: string; conflict: DocumentConflict }>,
  };

  // Process updates in parallel with controlled concurrency
  const BATCH_SIZE = 5;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ id, data }) => {
        const result = await updateWithConflictResolution(
          documentType,
          id,
          data,
          userId,
          (d) => updateFn(id, d),
          options
        );

        if (result.success && result.data) {
          results.successful.push({ id, data: result.data });
        } else if (result.requiresUserInput && result.conflict) {
          results.conflicts.push({ id, conflict: result.conflict });
        } else if (result.error) {
          results.failed.push({ id, error: result.error });
        }
      })
    );

    // Log batch results
    const succeeded = batchResults.filter((r) => r.status === 'fulfilled').length;
    const failed = batchResults.filter((r) => r.status === 'rejected').length;
    logInfo('Batch update completed', {
      batchIndex: Math.floor(i / BATCH_SIZE),
      succeeded,
      failed,
      total: batch.length,
    });
  }

  return results;
}

/**
 * Create a conflict-aware update function wrapper
 * Returns a function that automatically handles conflicts for a specific document type
 */
export function createConflictAwareUpdater<T extends Record<string, any>>(
  documentType: ConflictDocumentType,
  updateFn: (id: string, data: T) => Promise<T>,
  defaultOptions: ConflictAwareUpdateOptions = {}
) {
  return async (
    documentId: string,
    data: T,
    userId: string,
    options?: ConflictAwareUpdateOptions
  ): Promise<UpdateWithConflictResult<T>> => {
    return updateWithConflictResolution(
      documentType,
      documentId,
      data,
      userId,
      (d) => updateFn(documentId, d),
      { ...defaultOptions, ...options }
    );
  };
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        logInfo('Retrying operation', { attempt: i + 1, maxRetries, delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Check if an operation should be retried based on error type
 */
export function shouldRetryError(error: unknown): boolean {
  if (error instanceof ConflictError) {
    return true; // Conflicts can potentially be auto-resolved
  }

  // Check for network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('unavailable') ||
      message.includes('connection')
    );
  }

  return false;
}
