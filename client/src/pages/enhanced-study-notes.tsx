import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Search,
  Download,
  Trash2,
  Eye,
  Calendar,
  Plus,
  Edit,
  Filter,
  FileText,
  Code,
  SquareFunction,
  FileCode,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RichTextEditor } from '@/components/RichTextEditor';
import type { StudyNote, Category } from '@shared/schema';

/**
 * Utility Functions
 */

/**
 * Format a date or return a fallback string
 */
function formatDate(date: Date | string | null | undefined, fallback = 'Unknown'): string {
  if (!date) return fallback;
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return fallback;
  }
}

/**
 * Sanitize a filename by replacing non-alphanumeric characters
 */
function getSanitizedFilename(title: string, extension: string): string {
  return `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
}

/**
 * Strip HTML tags from content to get plain text
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate word count from content, stripping HTML tags if present
 */
function calculateWordCount(content: string): number {
  const plainText = stripHtmlTags(content);
  return plainText.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Detect if content contains code blocks
 * Checks for markdown code blocks (```) or HTML code tags
 */
function hasCodeContent(content: string): boolean {
  return content.includes('```') || content.includes('<code>') || content.includes('<pre>');
}

/**
 * Detect if content contains LaTeX formulas
 * Uses more robust patterns to avoid false positives with dollar signs in text
 */
function hasFormulaContent(content: string): boolean {
  // Check for LaTeX delimiters: $...$ or $$...$$, but not standalone $ signs
  const inlineLatex = /\$[^$\s][^$]*[^$\s]\$/g;
  const blockLatex = /\$\$[\s\S]+?\$\$/g;
  const latexCommands = /\\[()[\]]/g;

  return inlineLatex.test(content) || blockLatex.test(content) || latexCommands.test(content);
}

/**
 * Detect if content contains Mermaid diagrams
 */
function hasDiagramContent(content: string): boolean {
  return content.includes('```mermaid');
}

export default function EnhancedStudyNotesPage() {
  const { user: currentUser, tenantId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null);

  // New note form state
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteRichContent, setNewNoteRichContent] = useState<Record<string, unknown> | null>(
    null
  );
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const [newNoteCategories, setNewNoteCategories] = useState<number[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pagination hook with URL sync
  const { currentPage, pageSize, setCurrentPage, setPageSize, resetPagination } = usePagination({
    initialPageSize: 10,
    syncWithUrl: true,
  });

  const { data: studyNotes = [], isLoading } = useQuery<StudyNote[]>({
    queryKey: queryKeys.studyNotes.all(currentUser?.id),
    queryFn: async () => {
      if (!currentUser) return [];
      return await storage.getUserStudyNotes(currentUser.id, tenantId);
    },
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: {
      title: string;
      content: string;
      richContent?: Record<string, unknown>;
      tags?: string[];
      categoryIds?: number[];
    }) => {
      if (!currentUser) throw new Error('User not authenticated');

      const hasCode = hasCodeContent(noteData.content);
      const hasFormulas = hasFormulaContent(noteData.content);
      const hasDiagrams = hasDiagramContent(noteData.content);
      const wordCount = calculateWordCount(noteData.content);

      const newNote: Partial<StudyNote> = {
        userId: currentUser.id,
        tenantId,
        title: noteData.title,
        content: noteData.content,
        richContent: noteData.richContent as never,
        contentType: noteData.richContent ? 'rich' : 'markdown',
        tags: noteData.tags as never,
        categoryIds: noteData.categoryIds as never,
        hasCode,
        hasFormulas,
        hasDiagrams,
        wordCount,
        score: null,
        quizId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return await storage.createStudyNote(newNote as never);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studyNotes.all(currentUser?.id) });
      toast({
        title: 'Note Created',
        description: 'Your study note has been created successfully.',
      });
      resetCreateForm();
      setShowCreateDialog(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create the study note. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (noteData: {
      id: number;
      title: string;
      content: string;
      richContent?: Record<string, unknown>;
      tags?: string[];
      categoryIds?: number[];
    }) => {
      const hasCode = hasCodeContent(noteData.content);
      const hasFormulas = hasFormulaContent(noteData.content);
      const hasDiagrams = hasDiagramContent(noteData.content);
      const wordCount = calculateWordCount(noteData.content);

      const updatedNote = {
        ...editingNote,
        title: noteData.title,
        content: noteData.content,
        richContent: noteData.richContent as never,
        contentType: noteData.richContent ? 'rich' : 'markdown',
        tags: noteData.tags as never,
        categoryIds: noteData.categoryIds as never,
        hasCode,
        hasFormulas,
        hasDiagrams,
        wordCount,
        updatedAt: new Date(),
      };

      return await storage.updateStudyNote(noteData.id, updatedNote as never);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studyNotes.all(currentUser?.id) });
      toast({
        title: 'Note Updated',
        description: 'Your study note has been updated successfully.',
      });
      setShowEditDialog(false);
      setEditingNote(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update the study note. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await storage.deleteStudyNote(noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studyNotes.all(currentUser?.id) });
      toast({
        title: 'Note Deleted',
        description: 'The study note has been deleted successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete the study note. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetCreateForm = () => {
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteRichContent(null);
    setNewNoteTags([]);
    setNewNoteCategories([]);
  };

  const getScoreBgColor = (score: number | null): string => {
    if (score === null) return 'bg-muted';
    if (score >= 85) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const filteredNotes = studyNotes.filter((note) => {
    const matchesSearch =
      searchQuery === '' ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' ||
      (note.categoryIds && note.categoryIds.includes(parseInt(categoryFilter)));

    return matchesSearch && matchesCategory;
  });

  // Paginate filtered results
  const totalPages = Math.ceil(filteredNotes.length / pageSize);
  const paginatedNotes = filteredNotes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    resetPagination();
  };

  const handleExportMarkdown = (note: StudyNote) => {
    const markdown = `# ${note.title}\n\n${note.content}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getSanitizedFilename(note.title, 'md');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHTML = (note: StudyNote) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${note.title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 0.5rem; }
    code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; font-family: monospace; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <div>${note.content}</div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getSanitizedFilename(note.title, 'html');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewNote = (note: StudyNote) => {
    setSelectedNote(note);
    setShowViewDialog(true);
  };

  const handleEditNote = (note: StudyNote) => {
    setEditingNote(note);
    setShowEditDialog(true);
  };

  const handleCreateNote = () => {
    if (!newNoteTitle.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your study note.',
        variant: 'destructive',
      });
      return;
    }

    if (!newNoteContent.trim()) {
      toast({
        title: 'Content Required',
        description: 'Please add some content to your study note.',
        variant: 'destructive',
      });
      return;
    }

    createNoteMutation.mutate({
      title: newNoteTitle,
      content: newNoteContent,
      richContent: newNoteRichContent || undefined,
      tags: newNoteTags,
      categoryIds: newNoteCategories,
    });
  };

  const handleUpdateNote = () => {
    if (!editingNote) return;

    updateNoteMutation.mutate({
      id: editingNote.id,
      title: editingNote.title,
      content: editingNote.content,
      richContent: (editingNote.richContent as Record<string, unknown>) || undefined,
      tags: (editingNote.tags as string[]) || [],
      categoryIds: (editingNote.categoryIds as number[]) || [],
    });
  };

  // Calculate statistics
  const totalNotes = studyNotes.length;
  const notesWithCode = studyNotes.filter((n) => n.hasCode).length;
  const notesWithFormulas = studyNotes.filter((n) => n.hasFormulas).length;
  const notesWithDiagrams = studyNotes.filter((n) => n.hasDiagrams).length;
  const avgWordCount =
    totalNotes > 0
      ? Math.round(studyNotes.reduce((sum, n) => sum + (n.wordCount || 0), 0) / totalNotes)
      : 0;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="shadow-md border-0 bg-card">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please log in to view your study notes
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  📚 Enhanced Study Notes
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Create rich study notes with code, formulas, and diagrams
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => handleFilterChange(setCategoryFilter, value)}
                >
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" label="Loading study notes..." />
          </div>
        ) : filteredNotes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Study Notes Yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || categoryFilter !== 'all'
                  ? 'No notes match your search criteria.'
                  : 'Create your first study note with rich formatting, code, and diagrams.'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedNotes.map((note) => (
                <Card key={note.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base line-clamp-2">{note.title}</CardTitle>
                      {note.score !== null && (
                        <Badge className={getScoreBgColor(note.score)}>{note.score}%</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3" />
                      {formatDate(note.createdAt, 'Unknown date')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {note.categoryIds?.map((catId) => {
                          const cat = categories.find((c) => c.id === catId);
                          return cat ? (
                            <Badge key={catId} variant="outline" className="text-xs">
                              {cat.name}
                            </Badge>
                          ) : null;
                        })}
                        {(!note.categoryIds || note.categoryIds.length === 0) && (
                          <Badge variant="outline" className="text-xs">
                            General
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Feature indicators */}
                    <div className="flex gap-2 mb-3">
                      {note.hasCode && (
                        <Badge variant="secondary" className="text-xs">
                          <Code className="h-3 w-3 mr-1" />
                          Code
                        </Badge>
                      )}
                      {note.hasFormulas && (
                        <Badge variant="secondary" className="text-xs">
                          <SquareFunction className="h-3 w-3 mr-1" />
                          Math
                        </Badge>
                      )}
                      {note.hasDiagrams && (
                        <Badge variant="secondary" className="text-xs">
                          <FileCode className="h-3 w-3 mr-1" />
                          Diagrams
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {note.content.substring(0, 150)}...
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewNote(note)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditNote(note)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Study Note?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{note.title}"? This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Pagination */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredNotes.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              showPageSizeSelector={true}
              showJumpToPage={true}
              showFirstLastButtons={true}
            />
          </>
        )}

        {/* Stats Summary */}
        {filteredNotes.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-6 justify-center text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{totalNotes}</div>
                  <div className="text-sm text-muted-foreground">Total Notes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{avgWordCount}</div>
                  <div className="text-sm text-muted-foreground">Avg Words/Note</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{notesWithCode}</div>
                  <div className="text-sm text-muted-foreground">With Code</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{notesWithFormulas}</div>
                  <div className="text-sm text-muted-foreground">With Formulas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{notesWithDiagrams}</div>
                  <div className="text-sm text-muted-foreground">With Diagrams</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Note Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-600" />
                Create New Study Note
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  placeholder="Enter note title..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Content</label>
                <RichTextEditor
                  content={newNoteContent}
                  onChange={(html) => setNewNoteContent(html)}
                  onJsonChange={(json) => setNewNoteRichContent(json)}
                />
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  resetCreateForm();
                  setShowCreateDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateNote} disabled={createNoteMutation.isPending}>
                {createNoteMutation.isPending ? 'Creating...' : 'Create Note'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Note Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-purple-600" />
                Edit Study Note
              </DialogTitle>
            </DialogHeader>

            {editingNote && (
              <div className="flex-1 overflow-auto space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input
                    placeholder="Enter note title..."
                    value={editingNote.title}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Content</label>
                  <RichTextEditor
                    content={editingNote.content}
                    onChange={(html) => setEditingNote({ ...editingNote, content: html })}
                    onJsonChange={(json) =>
                      setEditingNote({ ...editingNote, richContent: json as never })
                    }
                  />
                </div>
              </div>
            )}

            <DialogFooter className="border-t pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingNote(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateNote} disabled={updateNoteMutation.isPending}>
                {updateNoteMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Note Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                {selectedNote?.title}
              </DialogTitle>
            </DialogHeader>

            {selectedNote && (
              <div className="flex-1 overflow-auto">
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedNote.categoryIds?.map((catId) => {
                    const cat = categories.find((c) => c.id === catId);
                    return cat ? (
                      <Badge key={catId} variant="outline">
                        {cat.name}
                      </Badge>
                    ) : null;
                  })}
                  {selectedNote.score !== null && (
                    <Badge className={getScoreBgColor(selectedNote.score)}>
                      Score: {selectedNote.score}%
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(selectedNote.createdAt)}
                  </Badge>
                  {selectedNote.wordCount && (
                    <Badge variant="secondary">{selectedNote.wordCount} words</Badge>
                  )}
                </div>

                <div className="prose prose-sm max-w-none">
                  <RichTextEditor content={selectedNote.content} editable={false} />
                </div>
              </div>
            )}

            <DialogFooter className="border-t pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedNote) {
                    navigator.clipboard.writeText(selectedNote.content);
                    toast({
                      title: 'Copied!',
                      description: 'Study note content copied to clipboard.',
                    });
                  }
                }}
              >
                Copy Content
              </Button>
              <Button
                variant="outline"
                onClick={() => selectedNote && handleExportMarkdown(selectedNote)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Markdown
              </Button>
              <Button
                variant="outline"
                onClick={() => selectedNote && handleExportHTML(selectedNote)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export HTML
              </Button>
              <Button onClick={() => setShowViewDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
