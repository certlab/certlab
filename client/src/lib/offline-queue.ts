/**
 * Offline Queue Manager
 *
 * Manages a persistent queue of Firestore operations that should be executed
 * when the network is available. Supports automatic retry with exponential backoff.
 *
 * ## Features
 *
 * - **Persistent Storage**: Queue is stored in localStorage and survives page reloads
 * - **Automatic Retry**: Failed operations are retried with exponential backoff
 * - **Network Detection**: Automatically processes queue when network reconnects
 * - **Dev Tools Visibility**: Queue state is exposed for debugging
 * - **Batch Support**: Multiple operations can be queued together
 *
 * ## Usage
 *
 * ```typescript
 * import { offlineQueue } from './offline-queue';
 *
 * // Queue an operation
 * await offlineQueue.enqueue({
 *   type: 'create',
 *   collection: 'quizzes',
 *   data: quizData,
 *   operation: async () => firestoreStorage.createQuiz(quizData)
 * });
 *
 * // Process queue (called automatically on reconnect)
 * await offlineQueue.processQueue();
 * ```
 *
 * @module offline-queue
 */

import { logError, logInfo } from './errors';
import { withRetry, createNetworkRetryOptions } from './retry-utils';

/**
 * Operation types that can be queued
 */
export type QueuedOperationType = 'create' | 'update' | 'delete' | 'batch';

/**
 * Status of a queued operation
 */
export type QueuedOperationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * A single operation in the queue
 */
export interface QueuedOperation {
  /** Unique identifier for this operation */
  id: string;
  /** Type of operation */
  type: QueuedOperationType;
  /** Firestore collection being operated on */
  collection: string;
  /** Operation data (document data, update fields, etc.) */
  data: any;
  /** Current status */
  status: QueuedOperationStatus;
  /** Number of retry attempts made */
  retryCount: number;
  /** Timestamp when operation was queued */
  queuedAt: number;
  /** Timestamp of last attempt (null if never attempted) */
  lastAttemptAt: number | null;
  /** Error message from last failed attempt (if any) */
  lastError: string | null;
  /** Function to execute the operation (not persisted) */
  operation?: () => Promise<any>;
}

/**
 * Queue state for Dev Tools visibility
 */
export interface QueueState {
  /** Number of operations in queue */
  total: number;
  /** Number of pending operations */
  pending: number;
  /** Number of processing operations */
  processing: number;
  /** Number of completed operations */
  completed: number;
  /** Number of failed operations */
  failed: number;
  /** Whether queue is currently being processed */
  isProcessing: boolean;
  /** All queued operations (without operation functions) */
  operations: Omit<QueuedOperation, 'operation'>[];
}

/**
 * Configuration for the offline queue
 */
export interface OfflineQueueConfig {
  /** Storage key for localStorage */
  storageKey: string;
  /** Maximum number of operations to keep in queue */
  maxQueueSize: number;
  /** Maximum retry attempts per operation */
  maxRetries: number;
  /** Whether to expose state to window for Dev Tools */
  exposeToDevTools: boolean;
  /** Callback when queue state changes */
  onStateChange?: (state: QueueState) => void;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OfflineQueueConfig = {
  storageKey: 'certlab_offline_queue',
  maxQueueSize: 100,
  maxRetries: 5,
  exposeToDevTools: true,
};

/**
 * Offline Queue Manager
 */
export class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private config: OfflineQueueConfig;
  private isProcessing = false;
  private processingPromise: Promise<void> | null = null;

  constructor(config: Partial<OfflineQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadQueue();
    this.setupNetworkListeners();
    this.exposeToDevTools();
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Validate that parsed data is an array
        if (!Array.isArray(parsed)) {
          logError('Invalid queue data in localStorage (not an array), clearing', null);
          localStorage.removeItem(this.config.storageKey);
          this.queue = [];
          return;
        }

        // Filter out completed operations and validate structure
        this.queue = parsed.filter((op: any) => {
          // Basic validation of operation structure
          if (!op || typeof op !== 'object' || !op.id || !op.type || !op.collection) {
            logError('Invalid operation in queue, skipping', null, { op });
            return false;
          }
          return op.status !== 'completed';
        });

        logInfo('Offline queue loaded', { count: this.queue.length });
      }
    } catch (error) {
      logError('Failed to load offline queue', error);
      // Clear corrupted data
      try {
        localStorage.removeItem(this.config.storageKey);
      } catch (clearError) {
        // Ignore clear errors
      }
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      // Don't persist operation functions
      const serializable = this.queue.map(({ operation, ...rest }) => rest);
      localStorage.setItem(this.config.storageKey, JSON.stringify(serializable));
      this.notifyStateChange();
    } catch (error) {
      logError('Failed to save offline queue', error);
      // Critical: If we can't persist, we should notify
      // This could be due to quota exceeded or storage disabled
      throw new Error('Failed to persist offline queue to localStorage');
    }
  }

  /**
   * Setup network listeners to auto-process queue on reconnect
   */
  private setupNetworkListeners(): void {
    // Skip setting up network listeners in test environment to prevent hanging tests
    // Tests can manually call processQueue() when needed
    if (
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')
    ) {
      return;
    }

    if (typeof window !== 'undefined') {
      const listener = () => {
        logInfo('Network reconnected, processing offline queue');
        this.processQueue();
      };

      // Store listener reference for cleanup
      (this as any)._onlineListener = listener;
      window.addEventListener('online', listener);
    }
  }

  /**
   * Expose queue state to Dev Tools
   */
  private exposeToDevTools(): void {
    if (!this.config.exposeToDevTools || typeof window === 'undefined') {
      return;
    }

    const globalObj = window as any;
    const key = '__CERTLAB_OFFLINE_QUEUE__';

    if (globalObj[key]) {
      // Avoid overwriting an existing devtools hook (e.g. from another instance or HMR)
      logInfo(
        'OfflineQueue devtools hook already exists on window.__CERTLAB_OFFLINE_QUEUE__; skipping re-exposure.'
      );
      return;
    }

    globalObj[key] = {
      getState: () => this.getState(),
      getQueue: () => this.queue.map(({ operation, ...rest }) => rest),
      processQueue: () => this.processQueue(),
      clearQueue: () => this.clearQueue(),
      clearCompleted: () => this.clearCompleted(),
    };
  }

  /**
   * Cleanup resources such as network listeners
   *
   * This should be called when the OfflineQueue instance is no longer needed
   * to avoid accumulating event listeners on window.
   */
  public destroy(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const listener = (this as any)._onlineListener;
    if (listener) {
      window.removeEventListener('online', listener);
      (this as any)._onlineListener = undefined;
    }
  }

  /**
   * Generate unique ID for operation
   */
  private generateId(): string {
    // Prefer cryptographically strong UUIDs when available
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as Crypto).randomUUID();
    }

    // Fallback: timestamp + extended random component
    const timestamp = Date.now().toString(36);
    const randomPart =
      Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    return `${timestamp}-${randomPart}`;
  }

  /**
   * Notify state change callback
   */
  private notifyStateChange(): void {
    if (this.config.onStateChange) {
      this.config.onStateChange(this.getState());
    }
  }

  /**
   * Get current queue state
   */
  public getState(): QueueState {
    const operations = this.queue.map(({ operation, ...rest }) => rest);
    return {
      total: this.queue.length,
      pending: this.queue.filter((op) => op.status === 'pending').length,
      processing: this.queue.filter((op) => op.status === 'processing').length,
      completed: this.queue.filter((op) => op.status === 'completed').length,
      failed: this.queue.filter((op) => op.status === 'failed').length,
      isProcessing: this.isProcessing,
      operations,
    };
  }

  /**
   * Enqueue an operation
   */
  public async enqueue(params: {
    type: QueuedOperationType;
    collection: string;
    data: any;
    operation: () => Promise<any>;
  }): Promise<string> {
    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest completed operations
      this.clearCompleted();

      // If still over limit, reject
      if (this.queue.length >= this.config.maxQueueSize) {
        throw new Error('Offline queue is full');
      }
    }

    const queuedOp: QueuedOperation = {
      id: this.generateId(),
      type: params.type,
      collection: params.collection,
      data: params.data,
      status: 'pending',
      retryCount: 0,
      queuedAt: Date.now(),
      lastAttemptAt: null,
      lastError: null,
      operation: params.operation,
    };

    this.queue.push(queuedOp);

    // Save to localStorage - if this fails, remove from queue
    try {
      this.saveQueue();
    } catch (error) {
      // Revert the in-memory change if persistence fails
      this.queue.pop();
      throw error;
    }

    logInfo('Operation queued', {
      id: queuedOp.id,
      type: queuedOp.type,
      collection: queuedOp.collection,
    });

    // Try to process immediately if online
    // Skip automatic background processing in test environments: this spawns
    // fire-and-forget promises that may still be running when the test runner
    // tears down, which can cause hanging tests or timeout failures.
    const isTestEnv =
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');
    if (!isTestEnv && typeof navigator !== 'undefined' && navigator.onLine && !this.isProcessing) {
      // Process in background and log any errors
      (async () => {
        try {
          await this.processQueue();
        } catch (error) {
          logError('Background offline queue processing failed', error);
        }
      })();
    }

    return queuedOp.id;
  }

  /**
   * Process all pending operations in the queue
   */
  public async processQueue(): Promise<void> {
    // If already processing, return the existing promise
    if (this.isProcessing && this.processingPromise) {
      return this.processingPromise;
    }

    this.isProcessing = true;
    this.notifyStateChange();

    this.processingPromise = (async () => {
      try {
        const pendingOps = this.queue.filter(
          (op) => op.status === 'pending' || op.status === 'failed'
        );

        logInfo('Processing offline queue', { count: pendingOps.length });

        for (const op of pendingOps) {
          // Skip if already at max retries
          if (op.retryCount >= this.config.maxRetries) {
            op.status = 'failed';
            op.lastError = `Max retries (${this.config.maxRetries}) exceeded`;
            // Save state immediately for failed operations
            this.saveQueue();
            continue;
          }

          // Skip if no operation function (loaded from storage)
          if (!op.operation) {
            logError('Operation function not available for queued operation', null, {
              id: op.id,
              type: op.type,
              collection: op.collection,
            });
            op.status = 'failed';
            op.lastError = 'Operation function not available';
            // Save state immediately for failed operations
            this.saveQueue();
            continue;
          }

          await this.processOperation(op);
        }

        this.saveQueue();
      } finally {
        this.isProcessing = false;
        this.processingPromise = null;
        this.notifyStateChange();
      }
    })();

    return this.processingPromise;
  }

  /**
   * Process a single operation with retry logic
   */
  private async processOperation(op: QueuedOperation): Promise<void> {
    if (!op.operation) {
      return;
    }

    op.status = 'processing';
    op.lastAttemptAt = Date.now();

    // Calculate remaining attempts (don't increment retryCount yet)
    const remainingAttempts = this.config.maxRetries - op.retryCount;

    try {
      await withRetry(
        op.operation,
        `offline-queue:${op.type}:${op.collection}`,
        createNetworkRetryOptions({
          maxAttempts: remainingAttempts,
          onRetry: (error, attempt, delayMs) => {
            // Increment retry count on each retry attempt
            op.retryCount++;
            logInfo('Retrying queued operation', {
              id: op.id,
              attempt,
              delayMs,
              retryCount: op.retryCount,
              error: error instanceof Error ? error.message : String(error),
            });
          },
        })
      );

      op.status = 'completed';
      op.lastError = null;

      logInfo('Queued operation completed', {
        id: op.id,
        type: op.type,
        collection: op.collection,
        retryCount: op.retryCount,
      });
    } catch (error) {
      op.status = 'failed';
      op.lastError = error instanceof Error ? error.message : String(error);

      logError('Queued operation failed', error, {
        id: op.id,
        type: op.type,
        collection: op.collection,
        retryCount: op.retryCount,
      });
    }
  }

  /**
   * Clear completed operations from queue
   */
  public clearCompleted(): void {
    const beforeCount = this.queue.length;
    this.queue = this.queue.filter((op) => op.status !== 'completed');
    const removedCount = beforeCount - this.queue.length;

    if (removedCount > 0) {
      this.saveQueue();
      logInfo('Cleared completed operations', { count: removedCount });
    }
  }

  /**
   * Clear all operations from queue
   */
  public clearQueue(): void {
    this.queue = [];
    // In test environment, also reset processing state to prevent hanging
    if (
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')
    ) {
      this.isProcessing = false;
      this.processingPromise = null;
    }
    this.saveQueue();
    logInfo('Offline queue cleared');
  }

  /**
   * Get operation by ID
   */
  public getOperation(id: string): QueuedOperation | undefined {
    return this.queue.find((op) => op.id === id);
  }

  /**
   * Remove operation by ID
   */
  public removeOperation(id: string): boolean {
    const index = this.queue.findIndex((op) => op.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }

  /**
   * Check if queue has pending operations
   */
  public hasPendingOperations(): boolean {
    return this.queue.some((op) => op.status === 'pending' || op.status === 'processing');
  }
}

/**
 * Singleton instance of the offline queue
 */
export const offlineQueue = new OfflineQueue();

/**
 * Type guard to check if an error indicates offline status
 */
export function isOfflineError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('offline') ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('connection')
    );
  }
  return false;
}
