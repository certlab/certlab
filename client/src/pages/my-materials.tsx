import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BookOpen,
  FileText,
  Video,
  Code,
  FileCode,
  Eye,
  Trash2,
  Clock,
  Calendar,
} from 'lucide-react';
import { SearchAndFilter, type SearchAndFilterState } from '@/components/SearchAndFilter';
import { Pagination } from '@/components/Pagination';
import { MATERIAL_FILTER_CONFIG } from '@/lib/filter-config';
import {
  filterAndSortItems,
  paginateItems,
  calculateTotalPages,
  extractUniqueTags,
  extractUniqueAuthors,
  getFilterStats,
} from '@/lib/filter-utils';
import { queryKeys } from '@/lib/queryClient';
import type { Lecture } from '@shared/schema';
import { canDelete, logPermissionCheck } from '@/lib/permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

const getContentTypeIcon = (contentType: string) => {
  switch (contentType) {
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'pdf':
      return <FileText className="h-4 w-4" />;
    case 'code':
      return <Code className="h-4 w-4" />;
    case 'interactive':
      return <FileCode className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
  }
};

const getContentTypeLabel = (contentType: string) => {
  switch (contentType) {
    case 'video':
      return 'Video';
    case 'pdf':
      return 'PDF';
    case 'code':
      return 'Code';
    case 'interactive':
      return 'Interactive';
    default:
      return 'Text';
  }
};

export default function MyMaterials() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<SearchAndFilterState | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

  // Fetch user's lectures/materials
  const {
    data: lectures = [],
    isLoading,
    isError,
  } = useQuery<Lecture[]>({
    queryKey: queryKeys.user.lectures(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      return await storage.getUserLectures(user.id);
    },
    enabled: !!user?.id,
  });

  // Extract available filter options
  const availableTags = useMemo(() => extractUniqueTags(lectures), [lectures]);
  const availableAuthors = useMemo(() => extractUniqueAuthors(lectures), [lectures]);

  // Apply filters and sorting
  const filteredAndSortedLectures = useMemo(() => {
    if (!filters) return lectures;
    return filterAndSortItems(lectures, filters, 'lecture');
  }, [lectures, filters]);

  // Paginate results
  const paginatedLectures = useMemo(() => {
    return paginateItems(filteredAndSortedLectures, currentPage, pageSize);
  }, [filteredAndSortedLectures, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return calculateTotalPages(filteredAndSortedLectures.length, pageSize);
  }, [filteredAndSortedLectures.length, pageSize]);

  const filterStats = useMemo(() => {
    return getFilterStats(lectures, filteredAndSortedLectures);
  }, [lectures, filteredAndSortedLectures]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: SearchAndFilterState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle page size changes
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  // Delete lecture mutation
  const deleteMutation = useMutation({
    mutationFn: async (lectureId: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      return await storage.deleteLecture(lectureId, user.id);
    },
    onSuccess: () => {
      toast({
        title: 'Material Deleted',
        description: 'The study material has been deleted successfully.',
      });
      // Invalidate and refetch lectures
      queryClient.invalidateQueries({ queryKey: queryKeys.user.lectures(user?.id) });
      // Close dialog
      setDeleteDialogOpen(false);
      setSelectedLecture(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Deletion Failed',
        description: error?.message || 'Failed to delete material. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleDeleteClick = (lecture: Lecture) => {
    if (!lecture || !user || !lecture.id) return;

    // Check delete permission
    const hasPermission = canDelete(lecture, user);
    logPermissionCheck('delete', 'lecture', lecture.id, user.id, hasPermission);

    if (!hasPermission) {
      toast({
        title: 'Permission Denied',
        description:
          'You can view this material but cannot delete it. Only the creator can delete their own content.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedLecture(lecture);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedLecture?.id) {
      deleteMutation.mutate(selectedLecture.id);
    }
  };

  const handleView = (lecture: Lecture) => {
    if (lecture.id) {
      navigate(`/app/lecture/${lecture.id}`);
    }
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
            <div className="text-muted-foreground">Loading your study materials...</div>
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
                Failed to load study materials. Please try refreshing the page.
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
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-foreground">Study Materials</h1>
            <p className="text-muted-foreground">
              Browse and manage your study materials, lectures, and learning resources
            </p>
          </div>

          {/* Search and Filter */}
          <SearchAndFilter
            onFilterChange={handleFilterChange}
            availableTags={availableTags}
            availableAuthors={availableAuthors}
            {...MATERIAL_FILTER_CONFIG}
          />

          {/* Results Summary */}
          {filterStats.filtered < filterStats.total && (
            <div className="mt-3 text-sm text-muted-foreground">
              Showing {filterStats.filtered} of {filterStats.total} materials (
              {filterStats.percentage}%)
            </div>
          )}
        </div>

        {/* Materials List */}
        {filteredAndSortedLectures.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {filters && (filters.searchText || filters.tags.length > 0)
                    ? 'No materials found'
                    : 'No study materials yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {filters && (filters.searchText || filters.tags.length > 0)
                    ? 'Try adjusting your search terms or filters'
                    : 'Study materials will appear here as you complete quizzes and generate learning content'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedLectures.map((lecture) => (
                <Card
                  key={lecture.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleView(lecture)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getContentTypeIcon(lecture.contentType || 'text')}
                        <Badge variant="secondary" className="text-xs">
                          {getContentTypeLabel(lecture.contentType || 'text')}
                        </Badge>
                      </div>
                      {lecture.isRead && (
                        <Badge variant="outline" className="text-xs">
                          Read
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2">{lecture.title}</CardTitle>
                    {lecture.description && (
                      <CardDescription className="line-clamp-2">
                        {lecture.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Tags */}
                      {lecture.tags && lecture.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {lecture.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {lecture.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{lecture.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {lecture.difficultyLevel && (
                            <Badge variant="outline" className="text-xs">
                              Level {lecture.difficultyLevel}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            {lecture.createdAt ? formatDate(lecture.createdAt) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {lecture.authorName && (
                        <div className="text-sm text-muted-foreground">by {lecture.authorName}</div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(lecture);
                          }}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {canDelete(lecture, user) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(lecture);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {filteredAndSortedLectures.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredAndSortedLectures.length}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                className="mt-6"
              />
            )}
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Study Material</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedLecture?.title}"? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            {selectedLecture && (
              <div className="py-4">
                <Alert variant="destructive">
                  <AlertDescription>
                    This study material will be permanently deleted. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedLecture(null);
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
                    Delete Material
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
