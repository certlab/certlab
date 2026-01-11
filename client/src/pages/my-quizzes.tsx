import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit2, Copy, Search, FileText, Clock, BookOpen, Lock, Trash2 } from 'lucide-react';
import type { QuizTemplate } from '@shared/schema';
import { canEdit, canDelete, logPermissionCheck } from '@/lib/permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MyQuizzes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuizTemplate | null>(null);

  // Fetch user's quiz templates
  const {
    data: templates = [],
    isLoading,
    isError,
  } = useQuery<QuizTemplate[]>({
    queryKey: ['userQuizTemplates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await storage.getUserQuizTemplates(user.id);
    },
    enabled: !!user?.id,
  });

  // Filter templates by search query
  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.title.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Duplicate quiz mutation
  const duplicateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      return await storage.duplicateQuizTemplate(templateId, user.id);
    },
    onSuccess: (newTemplate) => {
      toast({
        title: 'Quiz Duplicated',
        description: 'Your quiz has been duplicated successfully. Redirecting to editor...',
      });
      // Invalidate and refetch templates
      queryClient.invalidateQueries({ queryKey: ['userQuizTemplates', user?.id] });
      // Close dialog
      setDuplicateDialogOpen(false);
      setSelectedTemplate(null);
      // Redirect to quiz editor with new template
      setTimeout(() => {
        navigate(`/app/quiz-builder?template=${newTemplate.id}`);
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: 'Duplication Failed',
        description: error?.message || 'Failed to duplicate quiz. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete quiz mutation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      return await storage.deleteQuizTemplate(templateId, user.id);
    },
    onSuccess: () => {
      toast({
        title: 'Quiz Deleted',
        description: 'Your quiz has been deleted successfully.',
      });
      // Invalidate and refetch templates
      queryClient.invalidateQueries({ queryKey: ['userQuizTemplates', user?.id] });
      // Close dialog
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Deletion Failed',
        description: error?.message || 'Failed to delete quiz. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleDuplicateClick = (template: QuizTemplate) => {
    setSelectedTemplate(template);
    setDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = () => {
    if (selectedTemplate && selectedTemplate.id) {
      duplicateMutation.mutate(selectedTemplate.id);
    }
  };

  const handleDeleteClick = (template: QuizTemplate) => {
    if (!template.id || !user) return;

    // Check delete permission
    const hasPermission = canDelete(template, user);
    logPermissionCheck('delete', 'quiz', template.id, user.id, hasPermission);

    if (!hasPermission) {
      toast({
        title: 'Permission Denied',
        description:
          'You can view this quiz but cannot delete it. Only the creator can delete their own content.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedTemplate && selectedTemplate.id) {
      deleteMutation.mutate(selectedTemplate.id);
    }
  };

  const handleEdit = (template: QuizTemplate) => {
    if (!template.id || !user) return;

    // Check edit permission
    const hasPermission = canEdit(template, user);
    logPermissionCheck('edit', 'quiz', template.id, user.id, hasPermission);

    if (!hasPermission) {
      toast({
        title: 'Permission Denied',
        description:
          'You can view this quiz but cannot edit it. Only the creator can make changes.',
        variant: 'destructive',
      });
      return;
    }

    navigate(`/app/quiz-builder?template=${template.id}`);
  };

  const handleCreateNew = () => {
    navigate('/app/quiz-builder');
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading your quizzes...</div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                Failed to load quizzes. Please try refreshing the page.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Quizzes</h1>
              <p className="text-muted-foreground">
                Manage your custom quiz templates and create new ones
              </p>
            </div>
            <Button onClick={handleCreateNew} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create New Quiz
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search quizzes by title, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates List */}
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'No quizzes found' : 'No quizzes yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : 'Create your first custom quiz to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {filteredTemplates.length} Quiz{filteredTemplates.length !== 1 ? 'zes' : ''}
              </CardTitle>
              <CardDescription>
                Your custom quiz templates - edit, duplicate, or create new ones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{template.title}</div>
                            {template.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {template.description}
                              </div>
                            )}
                            {template.tags && template.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {template.tags.slice(0, 3).map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {template.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{template.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.isDraft ? 'secondary' : 'default'}>
                            {template.isDraft ? 'Draft' : 'Published'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {template.questionCount || template.customQuestions?.length || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Level {template.difficultyLevel || 1}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(template.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {canEdit(template, user) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(template)}
                                  title="Edit quiz"
                                  disabled={!template.id}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(template)}
                                  title="Delete quiz"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateClick(template)}
                              title="Duplicate quiz"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {!canEdit(template, user) && (
                              <Alert className="py-2">
                                <Lock className="h-4 w-4" />
                                <AlertDescription className="text-xs ml-2">
                                  View only
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Duplicate Confirmation Dialog */}
        <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicate Quiz</DialogTitle>
              <DialogDescription>
                Are you sure you want to duplicate "{selectedTemplate?.title}"? A copy will be
                created as a draft with all questions and settings preserved.
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="py-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Questions:</span>
                  <span className="font-medium">
                    {selectedTemplate.questionCount ||
                      selectedTemplate.customQuestions?.length ||
                      0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Difficulty:</span>
                  <span className="font-medium">Level {selectedTemplate.difficultyLevel || 1}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time Limit:</span>
                  <span className="font-medium">
                    {selectedTemplate.timeLimit ? `${selectedTemplate.timeLimit} minutes` : 'None'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Passing Score:</span>
                  <span className="font-medium">{selectedTemplate.passingScore}%</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDuplicateDialogOpen(false);
                  setSelectedTemplate(null);
                }}
                disabled={duplicateMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmDuplicate} disabled={duplicateMutation.isPending}>
                {duplicateMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Duplicating...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Quiz
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Quiz</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedTemplate?.title}"? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="py-4">
                <Alert variant="destructive">
                  <AlertDescription>
                    This quiz and all its questions will be permanently deleted. This action cannot
                    be undone.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedTemplate(null);
                }}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Quiz
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
