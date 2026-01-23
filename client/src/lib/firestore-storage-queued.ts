/**
 * Firestore Storage with Offline Queue
 *
 * Wraps Firestore storage operations with offline queue support.
 * This module intercepts write operations (create, update, delete) and queues them
 * when offline, with automatic retry when the network reconnects.
 *
 * ## Features
 *
 * - **Transparent Offline Support**: Write operations are queued when offline
 * - **Optimistic Updates**: Returns immediately with optimistic ID/result
 * - **Automatic Sync**: Queue processes automatically when network reconnects
 * - **Batched Operations**: Support for batching multiple operations
 *
 * ## Usage
 *
 * ```typescript
 * import { createFirestoreStorageWithQueue } from './firestore-storage-queued';
 *
 * const storage = createFirestoreStorageWithQueue(firestoreStorage);
 *
 * // Use exactly like regular storage - writes are queued when offline
 * const quiz = await storage.createQuiz(quizData);
 * ```
 *
 * @module firestore-storage-queued
 */

import { offlineQueue, isOfflineError } from './offline-queue';
import { logInfo } from './errors';
import type { IClientStorage } from '@shared/storage-interface';

/**
 * Check if a method name indicates a write operation
 * Write operations include: create*, update*, delete*
 *
 * Note: 'set*' methods are excluded because many are in-memory operations
 * (e.g., setCurrentUserId, setSelectedTitle) that should not be queued.
 * True Firestore set operations are rare in this codebase.
 */
function isWriteMethod(methodName: string): boolean {
  const writePatterns = ['create', 'update', 'delete'];
  const lowerMethod = methodName.toLowerCase();
  return writePatterns.some((pattern) => lowerMethod.startsWith(pattern));
}

/**
 * Check if the current environment is offline
 */
function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Create a proxy wrapper around Firestore storage that queues write operations
 *
 * @param storage - The underlying Firestore storage implementation
 * @returns Proxied storage with offline queue support
 */
export function createFirestoreStorageWithQueue<T extends IClientStorage>(storage: T): T {
  return new Proxy(storage, {
    get(target, prop: string | symbol, receiver) {
      // Only intercept function properties
      if (typeof prop !== 'string') {
        return Reflect.get(target, prop, receiver);
      }

      const originalMethod = target[prop as keyof T];

      // If not a function or not a write method, return as-is
      if (typeof originalMethod !== 'function' || !isWriteMethod(prop)) {
        return originalMethod;
      }

      // Wrap write method with offline queue support
      return async function (this: T, ...args: any[]) {
        try {
          // Try to execute operation directly first
          const result = await (originalMethod as any).apply(target, args);
          return result;
        } catch (error) {
          // If offline or network error, queue the operation
          if (isOffline() || isOfflineError(error)) {
            logInfo('Queueing operation due to offline/network error', {
              method: prop,
              error: error instanceof Error ? error.message : String(error),
            });

            // Queue the operation for later
            const queueId = await offlineQueue.enqueue({
              type: getOperationType(prop),
              collection: getCollectionName(prop),
              data: args,
              operation: async () => {
                // Re-execute the original method when online
                return await (originalMethod as any).apply(target, args);
              },
            });

            // Return optimistic result based on operation type
            return createOptimisticResult(prop, args, queueId);
          }

          // Re-throw non-network errors
          throw error;
        }
      };
    },
  });
}

/**
 * Determine operation type from method name
 */
function getOperationType(methodName: string): 'create' | 'update' | 'delete' {
  const lowerMethod = methodName.toLowerCase();
  if (lowerMethod.startsWith('create')) return 'create';
  if (lowerMethod.startsWith('update')) return 'update';
  if (lowerMethod.startsWith('delete')) return 'delete';
  return 'update'; // Default to update
}

/**
 * Determine collection name from method name
 */
function getCollectionName(methodName: string): string {
  // Extract collection name from method name
  // e.g., createQuiz -> quizzes, updateUser -> users
  const lowerMethod = methodName.toLowerCase();

  if (lowerMethod.includes('quiz')) return 'quizzes';
  if (lowerMethod.includes('user')) return 'users';
  if (lowerMethod.includes('category')) return 'categories';
  if (lowerMethod.includes('subcategory')) return 'subcategories';
  if (lowerMethod.includes('question')) return 'questions';
  if (lowerMethod.includes('lecture')) return 'lectures';
  if (lowerMethod.includes('mastery')) return 'masteryScores';
  if (lowerMethod.includes('badge')) return 'badges';
  if (lowerMethod.includes('gamestats')) return 'userGameStats';
  if (lowerMethod.includes('challenge')) return 'challenges';
  if (lowerMethod.includes('studygroup')) return 'studyGroups';
  if (lowerMethod.includes('practicetest')) return 'practiceTests';
  if (lowerMethod.includes('quest')) return 'quests';
  if (lowerMethod.includes('title')) return 'titles';
  if (lowerMethod.includes('timer')) return 'studyTimer';
  if (lowerMethod.includes('product')) return 'products';
  if (lowerMethod.includes('purchase')) return 'purchases';
  if (lowerMethod.includes('group')) return 'groups';
  if (lowerMethod.includes('template')) return 'templates';
  if (lowerMethod.includes('certificate')) return 'certificates';
  if (lowerMethod.includes('notification')) return 'notifications';
  if (lowerMethod.includes('enrollment')) return 'enrollments';
  if (lowerMethod.includes('assignment')) return 'assignments';
  if (lowerMethod.includes('leaderboard')) return 'leaderboards';
  if (lowerMethod.includes('branding')) return 'branding';
  if (lowerMethod.includes('theme')) return 'themes';
  if (lowerMethod.includes('attachment')) return 'attachments';

  return 'unknown';
}

/**
 * Create an optimistic result for queued operations
 * This allows the UI to continue working even when offline
 */
function createOptimisticResult(methodName: string, args: any[], queueId: string): any {
  const operationType = getOperationType(methodName);

  if (operationType === 'create') {
    // For create operations, return an object with a temporary ID
    // and the data that was passed in
    const data = args[0] || {};
    return {
      ...data,
      id: data.id || queueId, // Use queueId as temporary ID if not provided
      _queued: true,
      _queueId: queueId,
    };
  }

  if (operationType === 'update') {
    // For update operations, return the updated data
    const id = args[0];
    const updates = args[1] || {};
    return {
      id,
      ...updates,
      _queued: true,
      _queueId: queueId,
    };
  }

  if (operationType === 'delete') {
    // For delete operations, return void (or success indication)
    return {
      _queued: true,
      _queueId: queueId,
    };
  }

  // Default: return queued marker
  return {
    _queued: true,
    _queueId: queueId,
  };
}
