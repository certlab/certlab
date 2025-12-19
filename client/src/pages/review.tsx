import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { generateStudyNotes } from '@/lib/study-notes';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { queryKeys } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useAuth } from '@/lib/auth-provider';
import { safeMarkdownToHtml, generateStudyNotesPdfHtml } from '@/lib/sanitize';
import type { Quiz, Category, Question as SchemaQuestion } from '@shared/schema';

interface QuizResult {
  questionId: number;
  answer: number;
  correct: boolean;
  correctAnswer: number;
  explanation: string;
}

interface QuizSubmissionResponse {
  quiz: Quiz;
  results: QuizResult[];
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}

interface Question {
  id: number;
  categoryId: number;
  subcategoryId: number;
  text: string;
  options: { id: number; text: string }[];
  correctAnswer: number;
  explanation?: string;
}

export default function Review() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showLectureDialog, setShowLectureDialog] = useState(false);
  const [generatedLecture, setGeneratedLecture] = useState<string>('');
  const [notesSaved, setNotesSaved] = useState(false);
  const quizId = parseInt(params.id || '0');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, tenantId } = useAuth();

  const { data: quiz, isLoading: quizLoading } = useQuery<Quiz>({
    queryKey: queryKeys.quiz.detail(quizId),
    enabled: !!quizId,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: queryKeys.quiz.questions(quizId),
    enabled: !!quizId,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Mutation for generating lecture notes (client-side)
  const generateLectureMutation = useMutation({
    mutationFn: async () => {
      if (!quiz || !questions || questions.length === 0) {
        throw new Error('Quiz data not available');
      }

      // Get the category name for the study notes
      const categoryIds = (quiz.categoryIds as number[]) || [];
      const categoryName =
        categoryIds
          .map((id) => categories?.find((cat) => cat.id === id)?.name)
          .filter(Boolean)
          .join(', ') || 'Mixed Quiz';

      // Generate study notes using client-side function
      const studyNotes = generateStudyNotes({
        quiz,
        questions: questions as SchemaQuestion[],
        categoryName,
      });

      return studyNotes;
    },
    onSuccess: (studyNotes: string) => {
      setGeneratedLecture(studyNotes);
      setShowLectureDialog(true);
      setNotesSaved(false); // Reset saved state for new generation
      toast({
        title: 'Study Notes Generated!',
        description: 'Your comprehensive study notes are ready to review.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Unable to generate study notes. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for saving study notes to storage
  const saveNotesMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser || !quiz) {
        throw new Error('User or quiz data not available');
      }

      const categoryIds = (quiz.categoryIds as number[]) || [];
      const categoryName =
        categoryIds
          .map((id) => categories?.find((cat) => cat.id === id)?.name)
          .filter(Boolean)
          .join(', ') || 'Mixed Quiz';

      const note = await clientStorage.createStudyNote({
        userId: currentUser.id,
        tenantId: tenantId,
        quizId: quiz.id,
        title: `${categoryName} - Study Notes (${new Date().toLocaleDateString()})`,
        content: content,
        categoryIds: categoryIds,
        score: quiz.score,
      });

      return note;
    },
    onSuccess: () => {
      setNotesSaved(true);
      queryClient.invalidateQueries({ queryKey: queryKeys.studyNotes.all(currentUser?.id) });
      toast({
        title: 'Notes Saved!',
        description: 'Your study notes have been saved to your library.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Save Failed',
        description: error.message || 'Unable to save study notes. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Function to export notes as PDF
  const handleExportPDF = () => {
    if (!generatedLecture || !quiz) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Popup Blocked',
        description: 'Please allow popups to export the PDF.',
        variant: 'destructive',
      });
      return;
    }

    const categoryIds = (quiz.categoryIds as number[]) || [];
    const categoryName =
      categoryIds
        .map((id) => categories?.find((cat) => cat.id === id)?.name)
        .filter(Boolean)
        .join(', ') || 'Mixed Quiz';

    const pdfHtml = generateStudyNotesPdfHtml({
      title: `Study Notes - ${categoryName}`,
      categoryNames: categoryName,
      dateStr: new Date().toLocaleDateString(),
      score: quiz.score,
      content: generatedLecture,
    });

    printWindow.document.write(pdfHtml);
    printWindow.document.close();
  };

  const isLoading = quizLoading || questionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex items-center justify-center min-h-[24rem]">
            <LoadingSpinner size="lg" label="Loading quiz review..." />
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || !quiz.completedAt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              Quiz Not Available for Review
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              This quiz hasn't been completed yet or doesn't exist.
            </p>
            <Button
              onClick={() => navigate('/app')}
              className="mt-4 bg-primary hover:bg-primary/90"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              No Questions Found
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Unable to load questions for this quiz.
            </p>
            <Button
              onClick={() => navigate('/app')}
              className="mt-4 bg-primary hover:bg-primary/90"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userAnswers = (quiz.answers as { questionId: number; answer: number }[]) || [];
  const totalQuestions = quiz.totalQuestions || quiz.questionCount || questions.length;
  const score = quiz.score || 0;
  const correctAnswers = quiz.correctAnswers || 0;

  const getCategoryName = (categoryIds: number[]) => {
    const names = categoryIds
      .map((id) => categories.find((cat) => cat.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'Mixed Quiz';
  };

  const getOptionStatus = (
    optionId: number,
    question: Question,
    userAnswer?: { answer: number }
  ) => {
    const isCorrect = userAnswer?.answer === question.correctAnswer;
    if (userAnswer?.answer === optionId && isCorrect) return 'correct-selected';
    if (userAnswer?.answer === optionId && !isCorrect) return 'incorrect-selected';
    if (optionId === question.correctAnswer) return 'correct';
    return 'default';
  };

  const getOptionClasses = (status: string) => {
    const baseClasses = 'p-3 sm:p-4 rounded-lg border-2 transition-all';
    switch (status) {
      case 'correct-selected':
        return `${baseClasses} border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200`;
      case 'incorrect-selected':
        return `${baseClasses} border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200`;
      case 'correct':
        return `${baseClasses} border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200`;
      default:
        return `${baseClasses} border-border bg-muted/50 text-muted-foreground`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header Card */}
        <Card className="mb-6 shadow-lg border-0 overflow-hidden bg-card">
          <div className="bg-gradient-to-r from-primary to-primary/90 p-4 sm:p-6 text-white">
            <div className="text-center mb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-clipboard-check text-xl sm:text-2xl" aria-hidden="true"></i>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold mb-1">Review Answers</h1>
              <p className="text-sm sm:text-base opacity-90">
                {getCategoryName(quiz.categoryIds as number[])}
              </p>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6">
            {/* Score Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center py-3 bg-muted/50 rounded-lg">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">{score}%</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Overall Score</div>
              </div>
              <div className="text-center py-3 bg-muted/50 rounded-lg">
                <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                  {correctAnswers}/{totalQuestions}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Correct Answers</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => generateLectureMutation.mutate()}
                disabled={generateLectureMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {generateLectureMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" variant="white" />
                    <span className="ml-2">Generating...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-graduation-cap mr-2" aria-hidden="true"></i>
                    Generate Study Notes
                  </>
                )}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/app/results/${quizId}`)}
                  className="w-full"
                >
                  <i className="fas fa-chart-bar mr-2" aria-hidden="true"></i>
                  View Results
                </Button>
                <Button variant="outline" onClick={() => navigate('/app')} className="w-full">
                  <i className="fas fa-home mr-2" aria-hidden="true"></i>
                  Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Section Header */}
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            All Questions ({questions.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Review your answers and explanations below
          </p>
        </div>

        {/* All Questions */}
        <div className="space-y-4 sm:space-y-6">
          {questions.map((question, index) => {
            const userAnswer = userAnswers.find((a) => a.questionId === question.id);
            const isCorrect = userAnswer?.answer === question.correctAnswer;

            return (
              <Card key={question.id} className="shadow-sm border">
                <CardHeader className="p-4 sm:p-6 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg font-medium text-foreground">
                      Question {index + 1}
                    </CardTitle>
                    <Badge variant={isCorrect ? 'default' : 'destructive'}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                  {/* Question Text */}
                  <div className="mb-4 sm:mb-6">
                    <p className="text-base sm:text-lg text-foreground leading-relaxed">
                      {question.text}
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    {question.options.map((option) => {
                      const status = getOptionStatus(option.id, question, userAnswer);
                      return (
                        <div key={option.id} className={getOptionClasses(status)}>
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs sm:text-sm font-bold mt-0.5 sm:mt-0">
                              {String.fromCharCode(65 + option.id)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-sm sm:text-base">
                                {option.text}
                              </span>
                              {status === 'correct-selected' && (
                                <span className="block sm:inline sm:ml-2 text-xs sm:text-sm mt-1 sm:mt-0">
                                  ✓ Your answer (Correct)
                                </span>
                              )}
                              {status === 'incorrect-selected' && (
                                <span className="block sm:inline sm:ml-2 text-xs sm:text-sm mt-1 sm:mt-0">
                                  ✗ Your answer (Incorrect)
                                </span>
                              )}
                              {status === 'correct' && userAnswer?.answer !== option.id && (
                                <span className="block sm:inline sm:ml-2 text-xs sm:text-sm mt-1 sm:mt-0">
                                  ✓ Correct answer
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4">
                      <h4 className="font-medium text-primary mb-2 text-sm sm:text-base">
                        Explanation
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Back to Top */}
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <i className="fas fa-chevron-up mr-2" aria-hidden="true"></i>
            Back to Top
          </Button>
        </div>

        {/* Lecture Notes Dialog */}
        <Dialog open={showLectureDialog} onOpenChange={setShowLectureDialog}>
          <DialogContent className="w-full h-full max-w-none max-h-none sm:max-w-4xl sm:max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <i className="fas fa-graduation-cap text-purple-600" aria-hidden="true"></i>
                AI-Generated Study Notes
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto">
              <div className="prose prose-sm max-w-none">
                <div
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: safeMarkdownToHtml(generatedLecture),
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row sm:justify-between sm:items-center">
              <p className="text-sm text-muted-foreground">
                Generated with AI based on your quiz performance
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLecture);
                    toast({
                      title: 'Copied!',
                      description: 'Study notes copied to clipboard.',
                    });
                  }}
                  size="sm"
                >
                  <i className="fas fa-copy mr-2" aria-hidden="true"></i>
                  Copy
                </Button>
                <Button variant="outline" onClick={handleExportPDF} size="sm">
                  <i className="fas fa-file-pdf mr-2" aria-hidden="true"></i>
                  Export PDF
                </Button>
                <Button
                  variant={notesSaved ? 'secondary' : 'default'}
                  onClick={() => saveNotesMutation.mutate(generatedLecture)}
                  disabled={saveNotesMutation.isPending || notesSaved}
                  size="sm"
                  className={notesSaved ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                >
                  {saveNotesMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Saving...</span>
                    </>
                  ) : notesSaved ? (
                    <>
                      <i className="fas fa-check mr-2" aria-hidden="true"></i>
                      Saved
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2" aria-hidden="true"></i>
                      Save to Library
                    </>
                  )}
                </Button>
                <Button onClick={() => setShowLectureDialog(false)} size="sm">
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
