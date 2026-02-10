import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BookOpen,
  Search,
  PlusCircle,
  FileQuestion,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Question, Category, Subcategory } from '@shared/schema';

// Difficulty level configuration
const DIFFICULTY_CONFIG = {
  1: { label: 'Basic', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  2: {
    label: 'Intermediate',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  3: {
    label: 'Advanced',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  4: {
    label: 'Expert',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  5: { label: 'Master', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
} as const;

export default function MyQuestionsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch personal categories
  const { data: personalCategories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['personalCategories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await storage.getPersonalCategories(user.id);
    },
    enabled: !!user?.id,
  });

  // Fetch personal questions
  const { data: personalQuestions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ['personalQuestions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await storage.getPersonalQuestions(user.id);
    },
    enabled: !!user?.id,
  });

  // Fetch personal subcategories for all categories
  const { data: allSubcategories = [], isLoading: subcategoriesLoading } = useQuery<Subcategory[]>({
    queryKey: ['personalSubcategories', user?.id, personalCategories.map((c) => c.id)],
    queryFn: async () => {
      if (!user?.id || personalCategories.length === 0) return [];
      const subcats = await Promise.all(
        personalCategories.map((cat) => storage.getPersonalSubcategories(user.id, cat.id))
      );
      return subcats.flat();
    },
    enabled: !!user?.id && personalCategories.length > 0,
  });

  const isLoading = categoriesLoading || questionsLoading || subcategoriesLoading;

  // Filter questions by search query
  const filteredQuestions = personalQuestions.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.text.toLowerCase().includes(query) ||
      q.explanation?.toLowerCase().includes(query) ||
      (Array.isArray(q.tags) && q.tags.some((tag: string) => tag.toLowerCase().includes(query)))
    );
  });

  // Group questions by category
  const questionsByCategory = filteredQuestions.reduce(
    (acc, question) => {
      const categoryId = question.categoryId;
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(question);
      return acc;
    },
    {} as Record<number, Question[]>
  );

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    return personalCategories.find((c) => c.id === categoryId)?.name || 'Unknown Category';
  };

  // Get subcategory name by ID
  const getSubcategoryName = (subcategoryId: number) => {
    return allSubcategories.find((s) => s.id === subcategoryId)?.name || 'Unknown Subcategory';
  };

  const totalQuestions = personalQuestions.length;
  const totalCategories = personalCategories.length;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Questions</h1>
        <p className="text-muted-foreground">
          View and manage your personal question bank imported from YAML files
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">Personal categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subcategories</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allSubcategories.length}</div>
            <p className="text-xs text-muted-foreground">Topics and domains</p>
          </CardContent>
        </Card>
      </div>

      {/* Import More Questions */}
      {totalQuestions === 0 && !isLoading && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Personal Questions Yet</AlertTitle>
          <AlertDescription>
            You haven't imported any personal questions yet. Import questions from YAML files to
            build your personal question bank.
            <div className="mt-3">
              <Button asChild variant="default" size="sm">
                <Link to="/app/personal-import">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Import Questions
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Actions */}
      {totalQuestions > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions, explanations, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button asChild variant="outline">
            <Link to="/app/personal-import">
              <PlusCircle className="w-4 h-4 mr-2" />
              Import More
            </Link>
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading your questions...</p>
          </div>
        </div>
      )}

      {/* Questions List */}
      {!isLoading && totalQuestions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questions by Category</CardTitle>
            <CardDescription>
              {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}{' '}
              {searchQuery && `matching "${searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {personalCategories.map((category) => {
                const categoryQuestions = questionsByCategory[category.id] || [];
                if (categoryQuestions.length === 0) return null;

                return (
                  <AccordionItem key={category.id} value={`category-${category.id}`}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5" />
                        <span className="font-semibold">{category.name}</span>
                        <Badge variant="secondary">{categoryQuestions.length} questions</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        {categoryQuestions.map((question, index) => (
                          <Card key={question.id} className="border-l-4 border-l-primary">
                            <CardHeader>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      Question #{index + 1}
                                    </Badge>
                                    <Badge
                                      variant="secondary"
                                      className={
                                        DIFFICULTY_CONFIG[
                                          question.difficultyLevel as keyof typeof DIFFICULTY_CONFIG
                                        ]?.color || ''
                                      }
                                    >
                                      {DIFFICULTY_CONFIG[
                                        question.difficultyLevel as keyof typeof DIFFICULTY_CONFIG
                                      ]?.label || 'Unknown'}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {getSubcategoryName(question.subcategoryId)}
                                    </Badge>
                                  </div>
                                  <p className="text-base font-medium">{question.text}</p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {/* Options */}
                              {question.options && Array.isArray(question.options) && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-muted-foreground">
                                    Answer Options:
                                  </p>
                                  <div className="space-y-1.5">
                                    {question.options.map((option) => {
                                      const isCorrect = option.id === question.correctAnswer;
                                      return (
                                        <div
                                          key={option.id}
                                          className={`flex items-start gap-2 p-3 rounded-md border ${
                                            isCorrect
                                              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                                              : 'bg-muted/30'
                                          }`}
                                        >
                                          {isCorrect ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                          )}
                                          <span className="text-sm flex-1">{option.text}</span>
                                          {isCorrect && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200"
                                            >
                                              Correct
                                            </Badge>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Explanation */}
                              {question.explanation != null &&
                                typeof question.explanation === 'string' && (
                                  <div className="space-y-2 pt-2 border-t">
                                    <p className="text-sm font-medium text-muted-foreground">
                                      Explanation:
                                    </p>
                                    <p className="text-sm">{question.explanation}</p>
                                  </div>
                                )}

                              {/* Tags */}
                              {question.tags &&
                                Array.isArray(question.tags) &&
                                question.tags.length > 0 && (
                                  <div className="flex items-center gap-2 pt-2">
                                    <span className="text-xs text-muted-foreground">Tags:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {question.tags.map((tag: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
