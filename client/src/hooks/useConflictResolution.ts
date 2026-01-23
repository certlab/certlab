/**
 * useConflictResolution Hook
 *
 * Provides conflict resolution functionality for React components.
 * Manages conflict state, resolution UI, and integration with storage operations.
 */

import { useState, useCallback } from 'react';
import { ConflictError } from '@/lib/errors';
import {
  resolveConflict,
  type DocumentConflict,
  type ConflictResolutionResult,
  type ConflictStrategy,
} from '@/lib/conflict-resolution';
import { useToast } from '@/hooks/use-toast';

export interface ConflictResolutionState {
  hasConflict: boolean;
  conflict: DocumentConflict | null;
  isResolving: boolean;
  showDialog: boolean;
}

export interface UseConflictResolutionOptions {
  onResolved?: (result: ConflictResolutionResult) => void;
  onError?: (error: Error) => void;
  strategy?: ConflictStrategy;
}

export function useConflictResolution(options: UseConflictResolutionOptions = {}) {
  const { toast } = useToast();
  const [state, setState] = useState<ConflictResolutionState>({
    hasConflict: false,
    conflict: null,
    isResolving: false,
    showDialog: false,
  });

  /**
   * Detect and handle a conflict
   */
  const handleConflict = useCallback(
    async (
      documentType: DocumentConflict['documentType'],
      documentId: string,
      localVersion: any,
      remoteVersion: any,
      userId: string,
      baseVersion: any = null
    ) => {
      // Import detectConflicts to compute conflicting fields
      const conflictResolution = await import('@/lib/conflict-resolution');

      const conflictingFields = conflictResolution.detectConflicts(localVersion, remoteVersion);

      const conflict: DocumentConflict = {
        documentType,
        documentId,
        localVersion,
        remoteVersion,
        baseVersion,
        // Normalize timestamps to Date objects
        localTimestamp: localVersion.updatedAt
          ? localVersion.updatedAt instanceof Date
            ? localVersion.updatedAt
            : new Date(localVersion.updatedAt)
          : new Date(),
        remoteTimestamp: remoteVersion.updatedAt
          ? remoteVersion.updatedAt instanceof Date
            ? remoteVersion.updatedAt
            : new Date(remoteVersion.updatedAt)
          : new Date(),
        conflictingFields,
        userId,
      };

      setState({
        hasConflict: true,
        conflict,
        isResolving: false,
        showDialog: false,
      });

      // Try automatic resolution first
      setState((prev) => ({ ...prev, isResolving: true }));

      try {
        const result = await resolveConflict(
          conflict,
          options.strategy !== undefined ? { strategy: options.strategy } : undefined
        );

        if (result.resolved && !result.requiresUserInput) {
          // Automatic resolution succeeded
          setState({
            hasConflict: false,
            conflict: null,
            isResolving: false,
            showDialog: false,
          });

          toast({
            title: 'Conflict Resolved',
            description: `Changes were automatically merged using ${result.strategy} strategy.`,
          });

          options.onResolved?.(result);
          return result;
        } else {
          // Manual resolution required
          setState((prev) => ({
            ...prev,
            isResolving: false,
            showDialog: true,
          }));

          toast({
            title: 'Manual Resolution Required',
            description: 'Please review the conflicting changes and choose how to resolve them.',
            variant: 'default',
          });

          return null;
        }
      } catch (error) {
        setState((prev) => ({ ...prev, isResolving: false }));

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: 'Resolution Failed',
          description: errorMessage,
          variant: 'destructive',
        });

        options.onError?.(error instanceof Error ? error : new Error(errorMessage));
        return null;
      }
    },
    [options, toast]
  );

  /**
   * Handle manual resolution from dialog
   */
  const resolveManually = useCallback(
    (resolution: 'local' | 'remote' | 'manual', mergedData?: any) => {
      if (!state.conflict) return;

      let resultData: any;

      switch (resolution) {
        case 'local':
          resultData = state.conflict.localVersion;
          break;
        case 'remote':
          resultData = state.conflict.remoteVersion;
          break;
        case 'manual':
          resultData = mergedData;
          break;
      }

      const result: ConflictResolutionResult = {
        resolved: true,
        mergedData: resultData,
        strategy: 'manual',
        requiresUserInput: false,
      };

      setState({
        hasConflict: false,
        conflict: null,
        isResolving: false,
        showDialog: false,
      });

      toast({
        title: 'Conflict Resolved',
        description: 'Your changes have been saved.',
      });

      options.onResolved?.(result);
    },
    [state.conflict, options, toast]
  );

  /**
   * Cancel conflict resolution
   */
  const cancelResolution = useCallback(() => {
    setState({
      hasConflict: false,
      conflict: null,
      isResolving: false,
      showDialog: false,
    });

    toast({
      title: 'Resolution Cancelled',
      description: 'Your changes were not saved.',
      variant: 'default',
    });
  }, [toast]);

  /**
   * Close the conflict dialog
   */
  const closeDialog = useCallback(() => {
    setState((prev) => ({ ...prev, showDialog: false }));
  }, []);

  /**
   * Check if an error is a conflict error
   */
  const isConflictError = useCallback((error: unknown): boolean => {
    return error instanceof ConflictError;
  }, []);

  /**
   * Extract conflict information from a ConflictError
   */
  const extractConflict = useCallback(
    (
      error: ConflictError,
      localVersion: any,
      remoteVersion: any,
      baseVersion: any = null
    ): DocumentConflict | null => {
      const context = error.context;

      if (!context || !context.documentType || !context.documentId) {
        return null;
      }

      return {
        documentType: context.documentType as DocumentConflict['documentType'],
        documentId: String(context.documentId),
        localVersion,
        remoteVersion,
        baseVersion,
        localTimestamp: new Date(),
        remoteTimestamp: new Date(),
        conflictingFields: [],
        userId: String(context.userId || ''),
      };
    },
    []
  );

  return {
    // State
    hasConflict: state.hasConflict,
    conflict: state.conflict,
    isResolving: state.isResolving,
    showDialog: state.showDialog,

    // Actions
    handleConflict,
    resolveManually,
    cancelResolution,
    closeDialog,

    // Utilities
    isConflictError,
    extractConflict,
  };
}
