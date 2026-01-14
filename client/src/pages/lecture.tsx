import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Edit2, Trash2, Lock } from 'lucide-react';
import { ContentSkeleton } from '@/components/ui/content-skeleton';
import { queryKeys } from '@/lib/queryClient';
import { MetadataDisplay } from '@/components/MetadataDisplay';
import { ContentRenderer } from '@/components/ContentRenderer';
import { AttachmentManager } from '@/components/AttachmentManager';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import { canEdit, canDelete, logPermissionCheck } from '@/lib/permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function LecturePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    data: lecture,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.lecture.detail(id),
    queryFn: async () => {
      if (!id) throw new Error('Lecture ID is required');
      return await storage.getLecture(parseInt(id, 10));
    },
    enabled: !!id,
  });

  // Delete lecture mutation
  const deleteMutation = useMutation({
    mutationFn: async (lectureId: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      return await storage.deleteLecture(lectureId, user.id);
    },
    onSuccess: () => {
      toast({
        title: 'Lecture Deleted',
        description: 'The lecture has been deleted successfully.',
      });
      // Invalidate lectures query
      queryClient.invalidateQueries({ queryKey: queryKeys.user.lectures(user?.id) });
      // Navigate back to dashboard
      navigate('/app/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Deletion Failed',
        description: error?.message || 'Failed to delete lecture. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleDeleteClick = () => {
    if (!lecture || !user || !lecture.id) return;

    // Check delete permission
    const hasPermission = canDelete(lecture, user);
    logPermissionCheck('delete', 'lecture', lecture.id, user.id, hasPermission);

    if (!hasPermission) {
      toast({
        title: 'Permission Denied',
        description:
          'You can view this lecture but cannot delete it. Only the creator can delete their own content.',
        variant: 'destructive',
      });
      return;
    }

    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (lecture?.id) {
      deleteMutation.mutate(lecture.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <ContentSkeleton lines={6} showHeader={true} />
        </div>
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <BookOpen className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Study Guide Not Found</h2>
              <p className="text-gray-600 mb-4">
                The study guide you're looking for could not be found or may have been removed.
              </p>
              <Button onClick={() => navigate('/app/dashboard')}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{lecture.title}</h1>
                <p className="text-gray-600">
                  Generated on {new Date(lecture.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {/* Display metadata */}
            <MetadataDisplay
              tags={lecture.tags}
              difficultyLevel={lecture.difficultyLevel}
              authorName={lecture.authorName}
              createdAt={lecture.createdAt}
              updatedAt={lecture.updatedAt}
            />
          </div>
        </div>

        {/* Study Guide Content with Multiple Content Type Support */}
        <ContentRenderer lecture={lecture} />

        {/* Attachments Section */}
        {lecture.id && (
          <div className="mt-6">
            <AttachmentManager
              resourceType="lecture"
              resourceId={lecture.id}
              readonly={!canEdit(lecture, user)}
            />
          </div>
        )}

        {/* Permission Check and Actions */}
        {!canEdit(lecture, user) && (
          <Alert className="mt-6">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You can view this lecture but cannot edit or delete it. Only the creator can modify
              this content.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={() => window.print()} className="flex-1">
            Print Study Guide
          </Button>
          {canEdit(lecture, user) && (
            <>
              <Button
                variant="outline"
                className="flex-1"
                disabled
                title="Lecture editing feature is coming soon"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Lecture (Coming Soon)
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                className="flex-1"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lecture
              </Button>
            </>
          )}
          <Button onClick={() => window.history.back()} className="flex-1">
            Return to Dashboard
          </Button>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Lecture</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{lecture?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Alert variant="destructive">
                <AlertDescription>
                  This lecture will be permanently deleted. This action cannot be undone.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Lecture'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
