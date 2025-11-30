import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  HelpCircle,
  Search,
  PlusCircle,
  Trash2,
  Edit,
  Filter,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys, invalidateStaticData } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { Question, Category, Subcategory, QuestionOption } from '@shared/schema';

const ITEMS_PER_PAGE = 10;

interface QuestionFormData {
  text: string;
  categoryId: number;
  subcategoryId: number;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficultyLevel: number;
  tags: string;
}

const defaultFormData: QuestionFormData = {
  text: '',
  categoryId: 0,
  subcategoryId: 0,
  options: ['', '', '', ''],
  correctAnswer: 0,
  explanation: '',
  difficultyLevel: 1,
  tags: '',
};

export default function QuestionBankPage() {
  const { user: currentUser, tenantId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(defaultFormData);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for questions
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: ['/api', 'question-bank', tenantId],
    queryFn: async () => {
      return await clientStorage.getQuestionsByTenant(tenantId);
    },
    enabled: !!currentUser,
  });

  // Query for categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Query for subcategories
  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: queryKeys.subcategories.all(),
  });

  // Create question mutation
  const createQuestionMutation = useMutation({
    mutationFn: async (data: QuestionFormData) => {
      const options: QuestionOption[] = data.options
        .filter((opt) => opt.trim() !== '')
        .map((text, index) => ({ id: index, text: text.trim() }));

      const tags = data.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      return await clientStorage.createQuestion({
        tenantId,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        text: data.text,
        options,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation || null,
        difficultyLevel: data.difficultyLevel,
        tags: tags.length > 0 ? tags : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api', 'question-bank', tenantId] });
      invalidateStaticData();
      setShowAddDialog(false);
      setFormData(defaultFormData);
      toast({
        title: 'Question Created',
        description: 'Your question has been added to the question bank.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create question.',
        variant: 'destructive',
      });
    },
  });

  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: QuestionFormData }) => {
      const options: QuestionOption[] = data.options
        .filter((opt) => opt.trim() !== '')
        .map((text, index) => ({ id: index, text: text.trim() }));

      const tags = data.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      return await clientStorage.updateQuestion(id, {
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        text: data.text,
        options,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation || null,
        difficultyLevel: data.difficultyLevel,
        tags: tags.length > 0 ? tags : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api', 'question-bank', tenantId] });
      invalidateStaticData();
      setShowEditDialog(false);
      setSelectedQuestion(null);
      setFormData(defaultFormData);
      toast({
        title: 'Question Updated',
        description: 'Your question has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update question.',
        variant: 'destructive',
      });
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      await clientStorage.deleteQuestion(questionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api', 'question-bank', tenantId] });
      invalidateStaticData();
      toast({
        title: 'Question Deleted',
        description: 'The question has been removed from your question bank.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete the question. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Filter questions
  const filteredQuestions = questions.filter((question) => {
    const matchesSearch =
      searchQuery === '' ||
      question.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (question.explanation?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesCategory =
      categoryFilter === 'all' || question.categoryId === parseInt(categoryFilter);

    const matchesDifficulty =
      difficultyFilter === 'all' || question.difficultyLevel === parseInt(difficultyFilter);

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Helper functions
  const getCategoryName = (categoryId: number): string => {
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  const getSubcategoryName = (subcategoryId: number): string => {
    return subcategories.find((s) => s.id === subcategoryId)?.name || 'Unknown';
  };

  const getDifficultyBadge = (level: number | null) => {
    const levelNum = level ?? 1;
    const colors: Record<number, string> = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800',
    };
    const labels: Record<number, string> = {
      1: 'Basic',
      2: 'Intermediate',
      3: 'Advanced',
      4: 'Expert',
      5: 'Master',
    };
    return <Badge className={colors[levelNum] || colors[1]}>{labels[levelNum] || 'Basic'}</Badge>;
  };

  const handleAddQuestion = () => {
    setFormData(defaultFormData);
    setShowAddDialog(true);
  };

  const handleEditQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setFormData({
      text: question.text,
      categoryId: question.categoryId,
      subcategoryId: question.subcategoryId,
      options: [
        question.options?.[0]?.text || '',
        question.options?.[1]?.text || '',
        question.options?.[2]?.text || '',
        question.options?.[3]?.text || '',
      ],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      difficultyLevel: question.difficultyLevel || 1,
      tags: Array.isArray(question.tags) ? question.tags.join(', ') : '',
    });
    setShowEditDialog(true);
  };

  const handleViewQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setShowViewDialog(true);
  };

  const handleFormSubmit = (isEdit: boolean) => {
    // Validation
    if (!formData.text.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Question text is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.categoryId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category.',
        variant: 'destructive',
      });
      return;
    }

    const validOptions = formData.options.filter((opt) => opt.trim() !== '');
    if (validOptions.length < 2) {
      toast({
        title: 'Validation Error',
        description: 'At least 2 answer options are required.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.correctAnswer >= validOptions.length) {
      toast({
        title: 'Validation Error',
        description: 'Please select a valid correct answer.',
        variant: 'destructive',
      });
      return;
    }

    if (isEdit && selectedQuestion) {
      updateQuestionMutation.mutate({ id: selectedQuestion.id, data: formData });
    } else {
      createQuestionMutation.mutate(formData);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  // Get filtered subcategories based on selected category
  const filteredSubcategories = subcategories.filter(
    (sub) => sub.categoryId === formData.categoryId
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="shadow-md border-0 bg-card">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please log in to manage your question bank
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const QuestionForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div>
        <Label htmlFor="text">Question Text *</Label>
        <Textarea
          id="text"
          placeholder="Enter your question..."
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="categoryId">Category *</Label>
          <Select
            value={formData.categoryId ? formData.categoryId.toString() : ''}
            onValueChange={(value) =>
              setFormData({ ...formData, categoryId: parseInt(value), subcategoryId: 0 })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="subcategoryId">Subcategory</Label>
          <Select
            value={formData.subcategoryId ? formData.subcategoryId.toString() : ''}
            onValueChange={(value) => setFormData({ ...formData, subcategoryId: parseInt(value) })}
            disabled={!formData.categoryId}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select subcategory" />
            </SelectTrigger>
            <SelectContent>
              {filteredSubcategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id.toString()}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Answer Options * (at least 2 required)</Label>
        <div className="space-y-2 mt-1">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctAnswer"
                checked={formData.correctAnswer === index}
                onChange={() => setFormData({ ...formData, correctAnswer: index })}
                className="h-4 w-4"
              />
              <Input
                placeholder={`Option ${index + 1}`}
                value={formData.options[index]}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                className="flex-1"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Select the radio button next to the correct answer
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="difficultyLevel">Difficulty Level</Label>
          <Select
            value={formData.difficultyLevel.toString()}
            onValueChange={(value) =>
              setFormData({ ...formData, difficultyLevel: parseInt(value) })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Level 1 - Basic</SelectItem>
              <SelectItem value="2">Level 2 - Intermediate</SelectItem>
              <SelectItem value="3">Level 3 - Advanced</SelectItem>
              <SelectItem value="4">Level 4 - Expert</SelectItem>
              <SelectItem value="5">Level 5 - Master</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            placeholder="security, encryption, access"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="explanation">Explanation (optional)</Label>
        <Textarea
          id="explanation"
          placeholder="Explain why this is the correct answer..."
          value={formData.explanation}
          onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
          rows={2}
          className="mt-1"
        />
      </div>

      <DialogFooter className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => {
            if (isEdit) {
              setShowEditDialog(false);
            } else {
              setShowAddDialog(false);
            }
            setFormData(defaultFormData);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => handleFormSubmit(isEdit)}
          disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
        >
          {createQuestionMutation.isPending || updateQuestionMutation.isPending
            ? 'Saving...'
            : isEdit
              ? 'Update Question'
              : 'Create Question'}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HelpCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">📚 Question Bank</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Manage your certification practice questions
                </p>
              </div>
            </div>
            <Button onClick={handleAddQuestion}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                  <p className="text-2xl font-bold">{questions.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">
                    {new Set(questions.map((q) => q.categoryId)).size}
                  </p>
                </div>
                <Filter className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Filtered Results</p>
                  <p className="text-2xl font-bold">{filteredQuestions.length}</p>
                </div>
                <Search className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
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
                    <SelectValue placeholder="Category" />
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
              <div className="w-full sm:w-48">
                <Select
                  value={difficultyFilter}
                  onValueChange={(value) => handleFilterChange(setDifficultyFilter, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="1">Level 1 - Basic</SelectItem>
                    <SelectItem value="2">Level 2 - Intermediate</SelectItem>
                    <SelectItem value="3">Level 3 - Advanced</SelectItem>
                    <SelectItem value="4">Level 4 - Expert</SelectItem>
                    <SelectItem value="5">Level 5 - Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table */}
        {isLoadingQuestions ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" label="Loading questions..." />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Questions Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || categoryFilter !== 'all' || difficultyFilter !== 'all'
                  ? 'No questions match your search criteria.'
                  : 'Start building your question bank by adding your first question.'}
              </p>
              <Button onClick={handleAddQuestion}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Your First Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
                <CardDescription>
                  Showing {paginatedQuestions.length} of {filteredQuestions.length} questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Question</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedQuestions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell>
                          <div className="max-w-md truncate" title={question.text}>
                            {question.text}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryName(question.categoryId)}</Badge>
                        </TableCell>
                        <TableCell>{getDifficultyBadge(question.difficultyLevel)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(question.tags) &&
                              question.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            {Array.isArray(question.tags) && question.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{question.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewQuestion(question)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditQuestion(question)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this question? This action
                                    cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteQuestionMutation.mutate(question.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Add Question Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                Add New Question
              </DialogTitle>
              <DialogDescription>Create a new question for your question bank</DialogDescription>
            </DialogHeader>
            <QuestionForm isEdit={false} />
          </DialogContent>
        </Dialog>

        {/* Edit Question Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                Edit Question
              </DialogTitle>
              <DialogDescription>Update the question details</DialogDescription>
            </DialogHeader>
            <QuestionForm isEdit={true} />
          </DialogContent>
        </Dialog>

        {/* View Question Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                Question Details
              </DialogTitle>
            </DialogHeader>
            {selectedQuestion && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Question</Label>
                  <p className="mt-1">{selectedQuestion.text}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="mt-1">{getCategoryName(selectedQuestion.categoryId)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Subcategory</Label>
                    <p className="mt-1">{getSubcategoryName(selectedQuestion.subcategoryId)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Answer Options</Label>
                  <div className="mt-2 space-y-2">
                    {selectedQuestion.options?.map((option, index) => (
                      <div
                        key={option.id}
                        className={`p-2 rounded border ${
                          selectedQuestion.correctAnswer === index
                            ? 'bg-green-50 border-green-300'
                            : 'bg-muted'
                        }`}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                        {option.text}
                        {selectedQuestion.correctAnswer === index && (
                          <Badge className="ml-2 bg-green-600">Correct</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Difficulty</Label>
                    <div className="mt-1">
                      {getDifficultyBadge(selectedQuestion.difficultyLevel)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tags</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Array.isArray(selectedQuestion.tags) && selectedQuestion.tags.length > 0 ? (
                        selectedQuestion.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No tags</span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedQuestion.explanation && (
                  <div>
                    <Label className="text-muted-foreground">Explanation</Label>
                    <p className="mt-1 text-sm">{selectedQuestion.explanation}</p>
                  </div>
                )}

                <DialogFooter className="pt-4 border-t">
                  <Button variant="outline" onClick={() => handleEditQuestion(selectedQuestion)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={() => setShowViewDialog(false)}>Close</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
