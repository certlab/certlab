import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Target,
  Filter,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { StudyNote, Category } from '@shared/schema';

export default function StudyNotesPage() {
  const { user: currentUser, tenantId } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: studyNotes = [], isLoading } = useQuery<StudyNote[]>({
    queryKey: queryKeys.studyNotes.all(currentUser?.id),
    queryFn: async () => {
      if (!currentUser) return [];
      return await clientStorage.getUserStudyNotes(currentUser.id, tenantId);
    },
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await clientStorage.deleteStudyNote(noteId);
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

  const getCategoryNames = (categoryIds: number[] | null): string => {
    if (!categoryIds || categoryIds.length === 0) return 'General';
    return (
      categoryIds
        .map((id) => categories.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join(', ') || 'General'
    );
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
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

  const handleExportPDF = (note: StudyNote) => {
    // Create a printable version of the note
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Popup Blocked',
        description: 'Please allow popups to export the PDF.',
        variant: 'destructive',
      });
      return;
    }

    const categoryNames = getCategoryNames(note.categoryIds);
    const dateStr = note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Unknown';

    // Convert markdown-like content to HTML
    const htmlContent = note.content
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium mt-3 mb-1">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
      .replace(/---/g, '<hr class="my-4 border-gray-300">')
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br>');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${note.title} - CertLab Study Notes</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              color: #333;
              line-height: 1.6;
            }
            h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
            h2 { color: #1e3a8a; margin-top: 24px; }
            h3 { color: #1e40af; }
            .header-info { 
              background: #f0f9ff; 
              padding: 16px; 
              border-radius: 8px; 
              margin-bottom: 24px;
              border-left: 4px solid #3b82f6;
            }
            .header-info p { margin: 4px 0; }
            strong { color: #1e40af; }
            hr { margin: 24px 0; border: none; border-top: 1px solid #e5e7eb; }
            li { margin-bottom: 4px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <p><strong>Category:</strong> ${categoryNames}</p>
            <p><strong>Generated:</strong> ${dateStr}</p>
            ${note.score !== null ? `<p><strong>Quiz Score:</strong> ${note.score}%</p>` : ''}
          </div>
          <div class="content">
            <p class="mb-2">${htmlContent}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleViewNote = (note: StudyNote) => {
    setSelectedNote(note);
    setShowViewDialog(true);
  };

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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                📚 Study Notes Library
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Review and export your generated study notes from quiz results
              </p>
            </div>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
                  : 'Complete a quiz and generate study notes to see them here.'}
              </p>
              <Button onClick={() => setLocation('/app')}>
                <Target className="h-4 w-4 mr-2" />
                Take a Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
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
                    {note.createdAt
                      ? new Date(note.createdAt).toLocaleDateString()
                      : 'Unknown date'}
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
                    <Button variant="outline" size="sm" onClick={() => handleExportPDF(note)}>
                      <Download className="h-4 w-4" />
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
        )}

        {/* Stats Summary */}
        {filteredNotes.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-6 justify-center text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{studyNotes.length}</div>
                  <div className="text-sm text-muted-foreground">Total Notes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {studyNotes.filter((n) => n.score && n.score >= 85).length}
                  </div>
                  <div className="text-sm text-muted-foreground">High Score Notes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(studyNotes.flatMap((n) => n.categoryIds || [])).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Categories Covered</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                    {selectedNote.createdAt
                      ? new Date(selectedNote.createdAt).toLocaleDateString()
                      : 'Unknown'}
                  </Badge>
                </div>

                <div className="prose prose-sm max-w-none">
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: selectedNote.content
                        .replace(/\n/g, '<br>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>'),
                    }}
                  />
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
                      description: 'Study notes copied to clipboard.',
                    });
                  }
                }}
              >
                Copy to Clipboard
              </Button>
              <Button
                variant="outline"
                onClick={() => selectedNote && handleExportPDF(selectedNote)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={() => setShowViewDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
