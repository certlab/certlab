/**
 * Example: Quiz Editor with Conflict Resolution
 *
 * This example demonstrates how to integrate conflict resolution
 * into a real component that edits quizzes.
 */

import React, { useState, useEffect } from 'react';
import { useConflictResolution } from '@/hooks/useConflictResolution';
import { ConflictResolutionDialog } from '@/components/ConflictResolutionDialog';
import { updateWithConflictResolution } from '@/lib/firestore-storage-with-conflicts';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import type { Quiz } from '@shared/schema';

interface QuizEditorProps {
  quizId: string;
  userId: string;
  onSaved?: (quiz: Quiz) => void;
  autoSaveDelay?: number; // Milliseconds, default: 2000
}

export function QuizEditorWithConflictResolution({
  quizId,
  userId,
  onSaved,
  autoSaveDelay = 2000,
}: QuizEditorProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [localChanges, setLocalChanges] = useState<Partial<Quiz>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Initialize conflict resolution hook
  const { conflict, showDialog, handleConflict, resolveManually, cancelResolution, closeDialog } =
    useConflictResolution({
      onResolved: async (result) => {
        // Save the merged data after conflict resolution
        try {
          const merged = result.mergedData as Quiz;
          await storage.updateQuiz(parseInt(quizId), merged);
          setQuiz(merged);
          setLocalChanges({});

          toast({
            title: 'Changes Saved',
            description: 'Quiz updated successfully after resolving conflict.',
          });

          onSaved?.(merged);
        } catch (error) {
          toast({
            title: 'Save Failed',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
        }
      },
      onError: (error) => {
        toast({
          title: 'Conflict Resolution Failed',
          description: error.message,
          variant: 'destructive',
        });
      },
    });

  // Load quiz
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const loadedQuiz = await storage.getQuiz(parseInt(quizId));
        if (loadedQuiz) {
          setQuiz(loadedQuiz);
        }
      } catch (error) {
        toast({
          title: 'Load Failed',
          description: 'Failed to load quiz',
          variant: 'destructive',
        });
      }
    };

    loadQuiz();
  }, [quizId, toast]);

  // Handle field changes
  const handleFieldChange = (field: keyof Quiz, value: any) => {
    setLocalChanges((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Save with conflict resolution
  const handleSave = async () => {
    if (!quiz) return;

    setIsSaving(true);

    try {
      // Merge local changes with current quiz
      const updatedQuiz = { ...quiz, ...localChanges };

      // Use conflict-aware update
      const result = await updateWithConflictResolution(
        'quiz',
        quizId,
        updatedQuiz,
        userId,
        async (data) => {
          // This is where the actual update happens
          await storage.updateQuiz(parseInt(quizId), data);
          return data as Quiz;
        },
        {
          strategy: 'auto-merge',
          trackPresence: true,
          maxRetries: 3,
        }
      );

      if (result.success && result.data) {
        // Update succeeded
        setQuiz(result.data);
        setLocalChanges({});

        toast({
          title: 'Changes Saved',
          description: 'Quiz updated successfully.',
        });

        onSaved?.(result.data);
      } else if (result.requiresUserInput) {
        // Manual conflict resolution needed
        // Get the remote version to show in conflict dialog
        const remoteQuiz = await storage.getQuiz(parseInt(quizId));

        if (remoteQuiz) {
          await handleConflict(
            'quiz',
            quizId,
            updatedQuiz,
            remoteQuiz,
            userId,
            quiz // base version
          );
        }
      } else if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error('Save error:', error);

      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save with debouncing
  useEffect(() => {
    if (Object.keys(localChanges).length === 0) return;

    const timeoutId = setTimeout(() => {
      handleSave();
    }, autoSaveDelay);

    return () => clearTimeout(timeoutId);
  }, [localChanges, autoSaveDelay]);

  if (!quiz) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold">Edit Quiz</h1>

      {/* Show warning if there are unsaved changes */}
      {Object.keys(localChanges).length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You have unsaved changes. They will be auto-saved in a moment.
          </p>
        </div>
      )}

      {/* Quiz Title */}
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          value={localChanges.title ?? quiz.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* Quiz Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={localChanges.description ?? quiz.description ?? ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          className="w-full border rounded px-3 py-2"
          rows={4}
        />
      </div>

      {/* Time Limit */}
      <div>
        <label className="block text-sm font-medium mb-1">Time Limit (minutes)</label>
        <input
          type="number"
          value={localChanges.timeLimit ?? quiz.timeLimit ?? 0}
          onChange={(e) => handleFieldChange('timeLimit', parseInt(e.target.value))}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* Save Button */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving || Object.keys(localChanges).length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>

        {Object.keys(localChanges).length > 0 && (
          <button
            onClick={() => setLocalChanges({})}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Discard Changes
          </button>
        )}
      </div>

      {/* Last updated info */}
      <div className="text-xs text-muted-foreground">
        Last updated: {quiz.updatedAt ? new Date(quiz.updatedAt).toLocaleString() : 'Never'}
      </div>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        open={showDialog}
        onOpenChange={closeDialog}
        conflict={conflict}
        onResolve={resolveManually}
        onCancel={cancelResolution}
      />
    </div>
  );
}

/**
 * Example: Simple Update with Error Handling
 */
export async function simpleUpdateExample(quizId: string, updates: Partial<Quiz>, userId: string) {
  try {
    const result = await updateWithConflictResolution(
      'quiz',
      quizId,
      updates as any,
      userId,
      async (data) => {
        await storage.updateQuiz(parseInt(quizId), data);
        return data;
      }
    );

    if (result.success) {
      console.log('Update successful:', result.data);
      return result.data;
    } else if (result.requiresUserInput) {
      console.warn('Manual resolution required');
      // Show UI for manual resolution
      return null;
    } else {
      throw result.error || new Error('Update failed');
    }
  } catch (error) {
    console.error('Update failed:', error);
    throw error;
  }
}

/**
 * Example: Batch Update Multiple Quizzes
 */
export async function batchUpdateExample(
  quizUpdates: Array<{ id: string; data: Partial<Quiz> }>,
  userId: string
) {
  const { batchUpdateWithConflictResolution } =
    await import('@/lib/firestore-storage-with-conflicts');

  const result = await batchUpdateWithConflictResolution(
    'quiz',
    quizUpdates.map(({ id, data }) => ({ id, data: data as any })),
    userId,
    async (id, data) => {
      await storage.updateQuiz(parseInt(id), data);
      return data;
    }
  );

  console.log(`Successful updates: ${result.successful.length}`);
  console.log(`Failed updates: ${result.failed.length}`);
  console.log(`Conflicts: ${result.conflicts.length}`);

  // Handle conflicts
  if (result.conflicts.length > 0) {
    console.warn('Some updates had conflicts:', result.conflicts);
    // Show UI for each conflict
  }

  return result;
}
