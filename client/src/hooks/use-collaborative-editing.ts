/**
 * useCollaborativeEditing Hook
 *
 * React hook for managing collaborative editing sessions.
 * Handles presence tracking, conflict detection, and real-time sync.
 *
 * @module use-collaborative-editing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-provider';
import {
  setEditorPresence,
  updateEditorPresence,
  removeEditorPresence,
  subscribeToEditors,
  getDocumentLock,
  updateDocumentVersion,
  subscribeToDocumentLock,
  startEditSession,
  updateEditSession,
  endEditSession,
  cleanupStalePresence,
} from '@/lib/collaborative-editing';
import type { EditorPresence, DocumentLock, EditSession } from '@shared/schema';

interface UseCollaborativeEditingOptions {
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material';
  documentId: string;
  enabled?: boolean;
  onConflict?: (lock: DocumentLock) => void;
  onEditorsChange?: (editors: EditorPresence[]) => void;
}

interface UseCollaborativeEditingReturn {
  // Presence
  activeEditors: EditorPresence[];
  isOnline: boolean;

  // Document lock/version
  documentLock: DocumentLock | null;
  currentVersion: number;

  // Session
  sessionId: string | null;

  // Actions
  updatePresence: (editingSection?: string) => Promise<void>;
  recordEdit: () => Promise<boolean>; // Returns true if edit was successful (no conflict)

  // Status
  hasConflict: boolean;
  isLoading: boolean;
  error: string | null;
}

const PRESENCE_HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLEANUP_INTERVAL = 60000; // 1 minute

export function useCollaborativeEditing({
  documentType,
  documentId,
  enabled = true,
  onConflict,
  onEditorsChange,
}: UseCollaborativeEditingOptions): UseCollaborativeEditingReturn {
  const { user } = useAuth();
  const [activeEditors, setActiveEditors] = useState<EditorPresence[]>([]);
  const [documentLock, setDocumentLock] = useState<DocumentLock | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeEditorsRef = useRef<(() => void) | null>(null);
  const unsubscribeLockRef = useRef<(() => void) | null>(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize collaborative session
  useEffect(() => {
    if (!enabled || !user || !isOnline) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function initialize() {
      try {
        setIsLoading(true);
        setError(null);

        // Ensure user is available
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        // Set editor presence
        await setEditorPresence(
          user.id,
          user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
          documentType,
          documentId,
          {
            userEmail: user.email,
            profileImageUrl: user.profileImageUrl || undefined,
          }
        );

        // Get document lock
        const lock = await getDocumentLock(documentType, documentId, user.id);
        if (mounted) {
          setDocumentLock(lock);
        }

        // Start edit session
        const session = await startEditSession(user.id, documentType, documentId);
        if (mounted) {
          setSessionId(session.id);
        }

        // Subscribe to active editors
        const unsubEditors = subscribeToEditors(documentType, documentId, (editors) => {
          if (mounted) {
            setActiveEditors(editors);
            onEditorsChange?.(editors);
          }
        });
        unsubscribeEditorsRef.current = unsubEditors;

        // Subscribe to document lock changes
        const unsubLock = subscribeToDocumentLock(documentType, documentId, (lock) => {
          if (mounted) {
            setDocumentLock(lock);

            // Check if someone else modified the document
            if (lock.lastModifiedBy !== user.id) {
              setHasConflict(true);
              onConflict?.(lock);
            }
          }
        });
        unsubscribeLockRef.current = unsubLock;

        // Set up presence heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (isOnline) {
            updateEditorPresence(user.id, documentType, documentId).catch((err) => {
              console.error('Failed to update presence:', err);
            });
          }
        }, PRESENCE_HEARTBEAT_INTERVAL);

        // Set up cleanup interval
        cleanupIntervalRef.current = setInterval(() => {
          if (isOnline) {
            cleanupStalePresence(documentType, documentId).catch((err) => {
              console.error('Failed to cleanup stale presence:', err);
            });
          }
        }, CLEANUP_INTERVAL);

        setIsLoading(false);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to initialize collaborative editing'
          );
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;

      // Cleanup subscriptions
      if (unsubscribeEditorsRef.current) {
        unsubscribeEditorsRef.current();
        unsubscribeEditorsRef.current = null;
      }
      if (unsubscribeLockRef.current) {
        unsubscribeLockRef.current();
        unsubscribeLockRef.current = null;
      }

      // Clear intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }

      // Remove presence and end session
      if (user) {
        removeEditorPresence(user.id, documentType, documentId).catch(() => {});
        if (sessionId) {
          endEditSession(user.id, sessionId).catch(() => {});
        }
      }
    };
  }, [enabled, user, documentType, documentId, isOnline, onConflict, onEditorsChange, sessionId]);

  // Update presence with current editing section
  const updatePresence = useCallback(
    async (editingSection?: string) => {
      if (!user || !isOnline) return;

      try {
        await updateEditorPresence(user.id, documentType, documentId, {
          editingSection,
        });
      } catch (err) {
        console.error('Failed to update presence:', err);
      }
    },
    [user, documentType, documentId, isOnline]
  );

  // Record an edit and check for conflicts
  const recordEdit = useCallback(async (): Promise<boolean> => {
    if (!user || !sessionId || !documentLock || !isOnline) {
      return false;
    }

    try {
      // Update document version
      const result = await updateDocumentVersion(
        documentType,
        documentId,
        user.id,
        documentLock.version
      );

      if (result.conflict) {
        setHasConflict(true);
        onConflict?.(documentLock);
        return false;
      }

      // Update local lock state
      setDocumentLock({
        ...documentLock,
        version: result.currentVersion,
        lastModifiedBy: user.id,
        lastModifiedAt: new Date(),
      });

      // Update session edit count
      await updateEditSession(user.id, sessionId, true);

      // Clear conflict flag if it was set
      setHasConflict(false);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record edit');
      return false;
    }
  }, [user, sessionId, documentLock, documentType, documentId, isOnline, onConflict]);

  return {
    activeEditors,
    isOnline,
    documentLock,
    currentVersion: documentLock?.version ?? 0,
    sessionId,
    updatePresence,
    recordEdit,
    hasConflict,
    isLoading,
    error,
  };
}
