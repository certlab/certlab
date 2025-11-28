import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateStudyNotes } from '@/lib/study-notes';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { queryKeys } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useAuth } from '@/lib/auth-provider';
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
  const [, params] = useRoute('/app/review/:id');
  const [, setLocation] = useLocation();
  const [showLectureDialog, setShowLectureDialog] = useState(false);
  const [generatedLecture, setGeneratedLecture] = useState<string>('');
  const [notesSaved, setNotesSaved] = useState(false);
  const quizId = parseInt(params?.id || '0');
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

    // Convert markdown-like content to HTML
    const htmlContent = generatedLecture
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
          <title>Study Notes - ${categoryName} - CertLab</title>
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
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <p><strong>Category:</strong> ${categoryName}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            ${quiz.score !== null ? `<p><strong>Quiz Score:</strong> ${quiz.score}%</p>` : ''}
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
              onClick={() => setLocation('/app')}
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
              onClick={() => setLocation('/app')}
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
    const baseClasses = 'p-4 rounded-lg border-2 transition-all';
    switch (status) {
      case 'correct-selected':
        return `${baseClasses} border-green-500 bg-green-50 text-green-800`;
      case 'incorrect-selected':
        return `${baseClasses} border-red-500 bg-red-50 text-red-800`;
      case 'correct':
        return `${baseClasses} border-green-500 bg-green-50 text-green-800`;
      default:
        return `${baseClasses} border-gray-200 bg-gray-50 text-gray-700`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Answers</h1>
              <p className="text-gray-600">
                {getCategoryName(quiz.categoryIds as number[])} Practice Quiz
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Overall Score</div>
              <div className="text-2xl font-bold text-primary">{score}%</div>
              <div className="text-sm text-gray-500">
                {correctAnswers}/{totalQuestions} Correct
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Quiz Completed</h3>
                <p className="text-sm text-blue-800">
                  Review all {questions.length} questions below
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => generateLectureMutation.mutate()}
                  disabled={generateLectureMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white relative"
                  size="sm"
                >
                  {generateLectureMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" variant="white" />
                      <span className="ml-2">Generating...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-graduation-cap mr-2"></i>
                      Generate Study Notes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/app/results/${quizId}`)}
                  size="sm"
                >
                  <i className="fas fa-chart-bar mr-2"></i>
                  View Results
                </Button>
                <Button variant="outline" onClick={() => setLocation('/app')} size="sm">
                  <i className="fas fa-home mr-2"></i>
                  Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* All Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => {
            const userAnswer = userAnswers.find((a) => a.questionId === question.id);
            const isCorrect = userAnswer?.answer === question.correctAnswer;

            return (
              <Card key={question.id} className="material-shadow border border-gray-100">
                <CardHeader className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-gray-900">
                      Question {index + 1}
                    </CardTitle>
                    <Badge variant={isCorrect ? 'default' : 'destructive'}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* Question Text */}
                  <div className="mb-6">
                    <p className="text-lg text-gray-900 leading-relaxed">{question.text}</p>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-3 mb-6">
                    {question.options.map((option) => {
                      const status = getOptionStatus(option.id, question, userAnswer);
                      return (
                        <div key={option.id} className={getOptionClasses(status)}>
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold">
                              {String.fromCharCode(65 + option.id)}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">{option.text}</span>
                              {status === 'correct-selected' && (
                                <span className="ml-2 text-sm">✓ Your answer (Correct)</span>
                              )}
                              {status === 'incorrect-selected' && (
                                <span className="ml-2 text-sm">✗ Your answer (Incorrect)</span>
                              )}
                              {status === 'correct' && userAnswer?.answer !== option.id && (
                                <span className="ml-2 text-sm">✓ Correct answer</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Explanation</h4>
                      <p className="text-blue-800 leading-relaxed">{question.explanation}</p>
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
            <i className="fas fa-chevron-up mr-2"></i>
            Back to Top
          </Button>
        </div>

        {/* Lecture Notes Dialog */}
        <Dialog open={showLectureDialog} onOpenChange={setShowLectureDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <i className="fas fa-graduation-cap text-purple-600"></i>
                AI-Generated Study Notes
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto">
              <div className="prose prose-sm max-w-none">
                <div
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: generatedLecture
                      .replace(/\n/g, '<br>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>'),
                  }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Generated with AI based on your quiz performance
              </p>
              <div className="flex gap-2">
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
                  <i className="fas fa-copy mr-2"></i>
                  Copy
                </Button>
                <Button variant="outline" onClick={handleExportPDF} size="sm">
                  <i className="fas fa-file-pdf mr-2"></i>
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
                      <i className="fas fa-check mr-2"></i>
                      Saved
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
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
