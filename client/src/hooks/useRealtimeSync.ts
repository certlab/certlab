/**
 * React Hook for Real-Time Firestore Sync
 *
 * Provides easy-to-use React hooks for subscribing to real-time Firestore updates.
 * Handles automatic cleanup on unmount and provides loading/error states.
 *
 * @module useRealtimeSync
 */

import { useEffect, useState, useRef } from 'react';
import {
  realtimeSyncManager,
  type DocumentChangeCallback,
  type CollectionChangeCallback,
} from '@/lib/realtime-sync';
import { logError } from '@/lib/errors';

/**
 * Hook to subscribe to a single document
 */
export function useRealtimeDocument<T = any>(
  documentPath: string | null,
  options?: {
    includeMetadataChanges?: boolean;
    enabled?: boolean;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const subscriptionIdRef = useRef<string | null>(null);

  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!documentPath || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const callback: DocumentChangeCallback<T> = (docData, metadata) => {
      setData(docData);
      setFromCache(metadata.fromCache);
      setHasPendingWrites(metadata.hasPendingWrites);
      setLoading(false);
    };

    try {
      subscriptionIdRef.current = realtimeSyncManager.subscribeToDocument<T>(
        documentPath,
        callback,
        {
          includeMetadataChanges: options?.includeMetadataChanges,
          onError: (err) => {
            setError(err);
            setLoading(false);
            logError('useRealtimeDocument', err);
          },
        }
      );
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      logError('useRealtimeDocument', err);
    }

    return () => {
      if (subscriptionIdRef.current) {
        realtimeSyncManager.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [documentPath, options?.includeMetadataChanges, enabled]);

  return {
    data,
    loading,
    error,
    fromCache,
    hasPendingWrites,
  };
}

/**
 * Hook to subscribe to a collection
 */
export function useRealtimeCollection<T = any>(
  collectionPath: string | null,
  options?: {
    filters?: Array<{ field: string; operator: any; value: any }>;
    orderBy?: { field: string; direction?: 'asc' | 'desc' };
    limit?: number;
    includeMetadataChanges?: boolean;
    enabled?: boolean;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [changes, setChanges] = useState<Array<{ type: 'added' | 'modified' | 'removed'; doc: T }>>(
    []
  );
  const subscriptionIdRef = useRef<string | null>(null);

  const enabled = options?.enabled ?? true;
  const filtersString = JSON.stringify(options?.filters);
  const orderByString = JSON.stringify(options?.orderBy);

  useEffect(() => {
    if (!collectionPath || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const callback: CollectionChangeCallback<T> = (collectionData, metadata) => {
      setData(collectionData);
      setFromCache(metadata.fromCache);
      setHasPendingWrites(metadata.hasPendingWrites);
      setChanges(metadata.changes);
      setLoading(false);
    };

    try {
      subscriptionIdRef.current = realtimeSyncManager.subscribeToCollection<T>(
        collectionPath,
        callback,
        {
          filters: options?.filters,
          orderBy: options?.orderBy,
          limit: options?.limit,
          includeMetadataChanges: options?.includeMetadataChanges,
          onError: (err) => {
            setError(err);
            setLoading(false);
            logError('useRealtimeCollection', err);
          },
        }
      );
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      logError('useRealtimeCollection', err);
    }

    return () => {
      if (subscriptionIdRef.current) {
        realtimeSyncManager.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    collectionPath,
    filtersString,
    orderByString,
    options?.limit,
    options?.includeMetadataChanges,
    enabled,
  ]);

  return {
    data,
    loading,
    error,
    fromCache,
    hasPendingWrites,
    changes,
  };
}

/**
 * Hook to subscribe to user's quizzes in real-time
 */
export function useRealtimeUserQuizzes(userId: string | null) {
  return useRealtimeCollection(userId ? `users/${userId}/quizzes` : null, {
    orderBy: { field: 'createdAt', direction: 'desc' },
  });
}

/**
 * Hook to subscribe to user's progress in real-time
 */
export function useRealtimeUserProgress(userId: string | null) {
  return useRealtimeCollection(userId ? `users/${userId}/userProgress` : null, {
    orderBy: { field: 'lastUpdated', direction: 'desc' },
  });
}

/**
 * Hook to subscribe to user's badges in real-time
 */
export function useRealtimeUserBadges(userId: string | null) {
  return useRealtimeCollection(userId ? `users/${userId}/userBadges` : null, {
    orderBy: { field: 'earnedAt', direction: 'desc' },
  });
}

/**
 * Hook to get realtime sync manager instance
 * Useful for advanced use cases like custom subscriptions
 */
export function useRealtimeSyncManager() {
  return realtimeSyncManager;
}
