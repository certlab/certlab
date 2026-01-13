import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DetailedResultsAnalysis from '@/components/DetailedResultsAnalysis';
import { getScoreColor } from '@/lib/questions';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useAuth } from '@/lib/auth-provider';
import { generateVerificationId, printCertificate } from '@/lib/certificate-generator';
import { useToast } from '@/hooks/use-toast';
import { Award } from 'lucide-react';
import type { Quiz, Category, Certificate } from '@shared/schema';

export default function Results() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const quizId = params?.id ? parseInt(params.id) : 0;
  const { user: currentUser, tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quiz, isLoading } = useQuery<Quiz>({
    queryKey: queryKeys.quiz.detail(quizId),
    enabled: !!quizId,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const { data: existingCertificate } = useQuery<Certificate | null>({
    queryKey: ['certificate', 'quiz', quizId],
    queryFn: async () => {
      if (!currentUser || !quiz?.completedAt || !quizId) return null;
      // Check if certificate already exists for this quiz
      const certs = await storage.getUserCertificates(currentUser.id, tenantId || 1);
      return (
        certs.find((c: Certificate) => c.resourceId === quizId && c.resourceType === 'quiz') || null
      );
    },
    enabled: !!currentUser && !!quiz?.completedAt && !!quizId,
  });

  const generateCertificateMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || !quiz) throw new Error('Missing required data');

      const verificationId = generateVerificationId();
      const userName =
        `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() || currentUser.email;

      // Validate score requirement
      const quizScore = quiz.score || 0;
      if (quizScore < 70) {
        throw new Error('Certificate requires a score of 70% or higher');
      }

      const certificate: Omit<Certificate, 'id' | 'createdAt'> = {
        userId: currentUser.id,
        tenantId: tenantId || 1,
        userName,
        resourceType: 'quiz',
        resourceId: quiz.id!,
        resourceTitle: quiz.title,
        score: quizScore,
        completedAt: quiz.completedAt!,
        verificationId,
        issuedBy: 'CertLab',
        organizationName: undefined,
        logoUrl: undefined,
        signatureUrl: undefined,
        templateId: undefined,
      };

      return await storage.createCertificate(certificate);
    },
    onSuccess: (certificate) => {
      queryClient.invalidateQueries({ queryKey: ['certificate', 'quiz', quizId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all(currentUser.id) });
      toast({
        title: 'Certificate Generated',
        description: 'Your certificate of completion has been created successfully!',
      });
      // Auto-download the certificate
      printCertificate({ certificate }).catch((error) => {
        console.error('Failed to print certificate:', error);
        toast({
          title: 'Download Failed',
          description:
            'Your certificate was created, but the automatic download failed. You can manually download it from your certificates page.',
          variant: 'destructive',
        });
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to generate certificate. Please try again.',
        variant: 'destructive',
      });
      console.error('Certificate generation error:', error);
    },
  });

  const handleDownloadCertificate = async () => {
    if (existingCertificate) {
      try {
        await printCertificate({ certificate: existingCertificate });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to download certificate. Please try again.',
          variant: 'destructive',
        });
      }
    } else {
      generateCertificateMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex items-center justify-center min-h-[24rem]">
            <LoadingSpinner size="lg" label="Loading quiz results..." />
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              Results Not Found
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              The quiz you're looking for doesn't exist.
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

  if (!quiz.completedAt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              Quiz Not Completed
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              This quiz hasn't been completed yet.
            </p>
            <div className="flex gap-4 justify-center mt-4">
              <Button
                onClick={() => navigate(`/app/quiz/${quizId}`)}
                className="bg-primary hover:bg-primary/90"
              >
                Continue Quiz
              </Button>
              <Button variant="outline" onClick={() => navigate('/app')}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const score = quiz.score || 0;
  const correctAnswers = quiz.correctAnswers || 0;
  // Use totalQuestions from quiz, fallback to questionCount if totalQuestions is null
  const totalQuestions = quiz.totalQuestions || quiz.questionCount || 0;

  const formatDuration = (startTime: string | Date, endTime: string | Date) => {
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime instanceof Date ? endTime : new Date(endTime);
    const diffSeconds = Math.round((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCategoryName = (categoryIds: number[]) => {
    const names = categoryIds
      .map((id) => categories.find((cat) => cat.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'Mixed Quiz';
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Card className="shadow-lg border-0 overflow-hidden bg-card">
          {/* Results Header */}
          <div
            className={`p-4 sm:p-6 border-b border-border text-white ${
              quiz.mode === 'quiz'
                ? 'bg-gradient-to-r from-secondary to-secondary/90'
                : 'bg-gradient-to-r from-primary to-primary/90'
            }`}
          >
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-white/20 rounded-full flex items-center justify-center">
                <i
                  className={`fas text-xl sm:text-2xl ${
                    quiz.mode === 'quiz' ? 'fa-clipboard-check' : 'fa-brain'
                  }`}
                ></i>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
                {quiz.mode === 'quiz' ? 'Assessment Completed!' : 'Study Session Completed!'}
              </h2>
              <p className="text-sm sm:text-base opacity-90">
                {getCategoryName(quiz.categoryIds as number[])} -{' '}
                {quiz.mode === 'quiz' ? 'Quiz Mode' : 'Study Mode'}
              </p>
              {quiz.mode === 'quiz' && (
                <div className="mt-2 text-xs sm:text-sm opacity-75">
                  <i className="fas fa-chart-line mr-1"></i>
                  Your mastery progress has been updated
                </div>
              )}
            </div>
          </div>

          {/* Score Summary */}
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="text-center py-3 sm:py-0">
                <div
                  className={`text-3xl sm:text-4xl font-bold mb-1 sm:mb-2 ${getScoreColor(score)}`}
                >
                  {score}%
                </div>
                <div className="text-sm sm:text-base text-muted-foreground">Overall Score</div>
              </div>
              <div className="text-center py-3 sm:py-0 border-y sm:border-0 border-border">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-1 sm:mb-2">
                  {correctAnswers}/{totalQuestions}
                </div>
                <div className="text-sm sm:text-base text-muted-foreground">Correct Answers</div>
              </div>
              <div className="text-center py-3 sm:py-0">
                <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1 sm:mb-2">
                  {formatDuration(quiz.startedAt!, quiz.completedAt)}
                </div>
                <div className="text-sm sm:text-base text-muted-foreground">Time Taken</div>
              </div>
            </div>

            {/* Performance Feedback with Premium Indicators */}
            <div className="mb-6 sm:mb-8">
              <div
                className={`rounded-lg p-3 sm:p-4 border-2 ${
                  score >= 90
                    ? 'border-success/20 bg-success/5'
                    : score >= 80
                      ? 'border-primary/20 bg-primary/5'
                      : score >= 70
                        ? 'border-accent/20 bg-accent/5'
                        : 'border-destructive/20 bg-destructive/5'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <i
                    className={`fas ${
                      score >= 90
                        ? 'fa-star'
                        : score >= 80
                          ? 'fa-thumbs-up'
                          : score >= 70
                            ? 'fa-check-circle'
                            : 'fa-exclamation-triangle'
                    } ${getScoreColor(score)}`}
                  ></i>
                  <h3 className={`font-semibold text-base sm:text-lg ${getScoreColor(score)}`}>
                    {score >= 90
                      ? 'Excellent Work!'
                      : score >= 80
                        ? 'Great Job!'
                        : score >= 70
                          ? 'Good Effort!'
                          : 'Keep Practicing!'}
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {quiz.mode === 'quiz'
                    ? score >= 90
                      ? 'Outstanding! Your mastery score has significantly improved.'
                      : score >= 80
                        ? 'Great work! This assessment will boost your certification readiness.'
                        : score >= 70
                          ? 'Good progress! Continue taking quizzes to improve your mastery.'
                          : 'Keep practicing! Focus on your weak areas and retake quizzes to improve.'
                    : score >= 90
                      ? "Excellent! You're ready to test this knowledge in quiz mode."
                      : score >= 80
                        ? 'Well done! Consider taking a quiz assessment on this topic.'
                        : score >= 70
                          ? 'Good work! Study the missed concepts and try quiz mode when ready.'
                          : 'More study needed. Review the explanations and practice more before quiz mode.'}
                </p>
              </div>
            </div>

            {/* Category Performance */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                Performance by Category
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {(quiz.categoryIds as number[]).map((categoryId) => {
                  const category = categories.find((c) => c.id === categoryId);
                  if (!category) return null;

                  // For demo purposes, using overall score
                  const categoryScore = score;

                  return (
                    <div key={categoryId} className="bg-muted/50 rounded-lg p-3 sm:p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-foreground text-sm sm:text-base">
                          {category.name}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {categoryScore}%
                        </span>
                      </div>
                      <Progress value={categoryScore} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Enhanced Results with Tabs */}
            <Tabs defaultValue="summary" className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Quick Summary</TabsTrigger>
                <TabsTrigger value="analysis" className="flex items-center gap-1">
                  Detailed Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-6">
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    {quiz.mode === 'quiz'
                      ? 'Your performance has been recorded and contributes to your certification mastery progress.'
                      : 'Great study session! Review the explanations and consider taking a quiz when ready.'}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="mt-6">
                <DetailedResultsAnalysis quizId={quizId} />
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {quiz.mode === 'quiz' && quiz.score && quiz.score >= 70 && (
                <Button
                  onClick={handleDownloadCertificate}
                  disabled={generateCertificateMutation.isPending}
                  className="flex-1 bg-amber-600 text-white hover:bg-amber-700"
                  size="sm"
                  aria-label={
                    existingCertificate
                      ? 'Download your completion certificate'
                      : 'Generate and download your completion certificate'
                  }
                >
                  <Award className="h-4 w-4 mr-2" />
                  {existingCertificate ? 'Download Certificate' : 'Generate Certificate'}
                </Button>
              )}
              <Button
                onClick={() => navigate('/app')}
                className="flex-1 bg-primary text-white hover:bg-primary/90"
                size="sm"
              >
                <i className="fas fa-home mr-2"></i>
                Return to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/app/review/${quizId}`)}
                className="flex-1"
              >
                <i className="fas fa-eye mr-2"></i>
                Review Answers
              </Button>
              <Button variant="outline" onClick={() => navigate('/app')} className="flex-1">
                <i className="fas fa-redo mr-2"></i>
                Take Another Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
