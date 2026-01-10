import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import type { QuizVersion } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw, Clock, User, FileEdit, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

interface QuizVersionHistoryProps {
  quizId: number;
  collectionName?: 'quizzes' | 'quizTemplates';
  onRestore?: () => void;
}

export function QuizVersionHistory({
  quizId,
  collectionName = 'quizTemplates',
  onRestore,
}: QuizVersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<QuizVersion | null>(null);
  const [versionToRestore, setVersionToRestore] = useState<QuizVersion | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch version history
  const {
    data: versions = [],
    isLoading,
    isError,
  } = useQuery<QuizVersion[]>({
    queryKey: ['quizVersions', quizId, collectionName],
    queryFn: async () => {
      return await storage.getQuizVersions(quizId, collectionName);
    },
    enabled: isOpen,
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      return await storage.restoreQuizVersion(quizId, versionId, collectionName);
    },
    onSuccess: () => {
      toast({
        title: 'Version Restored',
        description: 'The quiz has been restored to the selected version.',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['quizVersions', quizId, collectionName] });
      queryClient.invalidateQueries({ queryKey: ['quizTemplate', quizId] });
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });

      setIsOpen(false);
      setSelectedVersion(null);

      // Notify parent component
      if (onRestore) {
        onRestore();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Restore Failed',
        description: error?.message || 'Failed to restore quiz version',
        variant: 'destructive',
      });
    },
  });

  const handleRestoreClick = (version: QuizVersion) => {
    setVersionToRestore(version);
  };

  const confirmRestore = () => {
    if (versionToRestore) {
      restoreMutation.mutate(versionToRestore.id);
      setVersionToRestore(null);
    }
  };

  const formatDate = (date: Date) => {
    try {
      return format(new Date(date), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            Version History
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Quiz Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of this quiz. Each edit creates a new version.
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load version history. Please try again.</AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && versions.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No version history available yet. Versions are created automatically when you save
                changes.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && versions.length > 0 && (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedVersion?.id === version.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedVersion(version)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? 'default' : 'secondary'}>
                            Version {version.versionNumber}
                          </Badge>
                          {index === 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Current
                            </Badge>
                          )}
                        </div>

                        <h4 className="font-semibold text-sm">{version.title}</h4>

                        {version.changeDescription && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <FileEdit className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{version.changeDescription}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDate(version.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            <span>
                              {version.authorName ||
                                (version.createdBy && version.createdBy.length > 0
                                  ? version.createdBy.length > 8
                                    ? `User: ${version.createdBy.substring(0, 8)}...`
                                    : `User: ${version.createdBy}`
                                  : 'Unknown user')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{version.questionCount} questions</span>
                          <span>•</span>
                          <span>
                            {version.isPublished
                              ? 'Published'
                              : version.isDraft
                                ? 'Draft'
                                : 'Unknown'}
                          </span>
                          {version.timeLimit && (
                            <>
                              <span>•</span>
                              <span>{version.timeLimit} min limit</span>
                            </>
                          )}
                        </div>
                      </div>

                      {index !== 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreClick(version);
                          }}
                          disabled={restoreMutation.isPending}
                        >
                          {restoreMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!versionToRestore} onOpenChange={() => setVersionToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Quiz Version?</AlertDialogTitle>
            <AlertDialogDescription>
              {versionToRestore && (
                <>
                  Are you sure you want to restore to version {versionToRestore.versionNumber}?
                  <br />
                  <br />
                  This will create a new version with the restored content. The current version will
                  be preserved in the history.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Restore Version</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
