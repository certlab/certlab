import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-provider';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useToast } from '@/hooks/use-toast';
import { Play, RotateCcw, TrendingUp, Clock, Target, BookOpen, Award } from 'lucide-react';
import type { Quiz, UserStats, Category } from '@shared/schema';

export default function ContextualQuickActions() {
  const [location, setLocation] = useLocation();
  const { user: currentUser, refreshUser } = useAuth();
  const { toast } = useToast();

  const { data: stats } = useQuery<UserStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  const { data: recentQuizzes = [] } = useQuery<Quiz[]>({
    queryKey: queryKeys.user.quizzes(currentUser?.id),
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const createQuizMutation = useMutation({
    mutationFn: async (quizData: any) => {
      if (!currentUser?.id) throw new Error('Not authenticated');

      const tokenCost = clientStorage.calculateQuizTokenCost(quizData.questionCount);

      // Check and consume tokens
      const tokenResult = await clientStorage.consumeTokens(currentUser.id, tokenCost);

      if (!tokenResult.success) {
        throw new Error(
          `Insufficient tokens. You need ${tokenCost} tokens but only have ${tokenResult.newBalance}.`
        );
      }

      // Create the quiz
      const quiz = await clientStorage.createQuiz({
        userId: currentUser.id,
        ...quizData,
      });

      return { quiz, tokenResult, tokenCost };
    },
    onSuccess: async ({ quiz, tokenResult, tokenCost }) => {
      // Refresh user state in auth provider to keep it in sync
      await refreshUser();

      queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.tokenBalance(currentUser?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });

      toast({
        title: 'Quiz Created',
        description: `Used ${tokenCost} tokens. New balance: ${tokenResult.newBalance}`,
      });

      setLocation(`/app/quiz/${quiz.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create learning session.',
        variant: 'destructive',
      });
    },
  });

  // Get contextual actions based on current page
  const getContextualActions = () => {
    const actions = [];
    const currentPath = location;

    // Use all available categories
    const accessibleCategoryIds = categories.map((cat) => cat.id);

    // Universal quick actions
    actions.push({
      key: 'quick-session',
      label: 'Quick Session',
      description: '15 questions, mixed topics',
      icon: <Play className="w-4 h-4" />,
      variant: 'default' as const,
      onClick: () => {
        if (accessibleCategoryIds.length === 0) {
          toast({
            title: 'No Categories Available',
            description: 'Please contact support to add certification categories.',
            variant: 'default',
          });
          return;
        }

        if (currentUser?.id) {
          createQuizMutation.mutate({
            categoryIds: [accessibleCategoryIds[0]], // Use first category
            questionCount: 15,
            title: `Quick Session - ${new Date().toLocaleDateString()}`,
          });
        }
      },
    });

    // Page-specific contextual actions
    if (currentPath === '/app/dashboard') {
      actions.push({
        key: 'review-weak',
        label: 'Review Weak Areas',
        description: 'Focus on areas needing improvement',
        icon: <Target className="w-4 h-4" />,
        variant: 'outline' as const,
        badge: (stats?.totalQuizzes || 0) > 0 ? 'Smart' : undefined,
        onClick: () => {
          if (currentUser?.id) {
            // Create a quiz focused on review/weak areas
            createQuizMutation.mutate({
              categoryIds: accessibleCategoryIds.length > 0 ? [accessibleCategoryIds[0]] : [],
              questionCount: 20,
              title: `Review Session - ${new Date().toLocaleDateString()}`,
              mode: 'study', // Study mode for reviewing weak areas
            });
          }
        },
      });

      actions.push({
        key: 'achievements',
        label: 'View Progress',
        description: 'Check badges and milestones',
        icon: <Award className="w-4 h-4" />,
        variant: 'ghost' as const,
        onClick: () => setLocation('/app/achievements'),
      });
    }

    if (currentPath.startsWith('/app/quiz')) {
      actions.push({
        key: 'timed-practice',
        label: 'Timed Practice',
        description: 'Exam-style time pressure',
        icon: <Clock className="w-4 h-4" />,
        variant: 'outline' as const,
        badge: 'Challenge',
        onClick: () => {
          if (currentUser?.id) {
            createQuizMutation.mutate({
              categoryIds: accessibleCategoryIds.length > 0 ? [accessibleCategoryIds[0]] : [],
              questionCount: 20,
              timeLimit: 30,
              title: `Timed Practice - ${new Date().toLocaleDateString()}`,
            });
          }
        },
      });
    }

    if (currentPath === '/app/achievements') {
      actions.push({
        key: 'unlock-badges',
        label: 'Earn More Badges',
        description: 'Start learning to unlock achievements',
        icon: <BookOpen className="w-4 h-4" />,
        variant: 'outline' as const,
        onClick: () => {
          if (currentUser?.id) {
            // Create a quiz for badge earning
            createQuizMutation.mutate({
              categoryIds: accessibleCategoryIds.length > 0 ? [accessibleCategoryIds[0]] : [],
              questionCount: 15,
              title: `Badge Quest - ${new Date().toLocaleDateString()}`,
            });
          }
        },
      });

      if (recentQuizzes.length > 0) {
        actions.push({
          key: 'repeat-success',
          label: 'Repeat Best Performance',
          description: 'Use your most successful format',
          icon: <RotateCcw className="w-4 h-4" />,
          variant: 'ghost' as const,
          onClick: () => {
            const bestQuiz = recentQuizzes
              .filter((quiz) => quiz.completedAt && (quiz.score || 0) >= 70)
              .sort((a, b) => (b.score || 0) - (a.score || 0))[0];

            if (bestQuiz && currentUser?.id) {
              createQuizMutation.mutate({
                categoryIds: bestQuiz.categoryIds,
                questionCount: bestQuiz.questionCount || 15,
                title: `Repeat Success - ${new Date().toLocaleDateString()}`,
              });
            }
          },
        });
      }
    }

    return actions.slice(0, 3); // Limit to 3 actions to avoid clutter
  };

  const actions = getContextualActions();

  if (actions.length === 0) {
    return null;
  }

  return (
    <Card className="card-enhanced">
      <CardHeader className="card-spacious pb-3">
        <CardTitle className="text-base font-semibold text-comfortable flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="card-breathing pt-0">
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={action.variant}
              size="sm"
              onClick={action.onClick}
              disabled={createQuizMutation.isPending}
              className="flex-1 min-w-0 sm:flex-none"
            >
              <span className="flex items-center gap-2 min-w-0">
                {action.icon}
                <span className="truncate">{action.label}</span>
                {action.badge && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 ml-1">
                    {action.badge}
                  </Badge>
                )}
              </span>
            </Button>
          ))}
        </div>

        {/* Contextual description */}
        <div className="mt-3 text-xs text-muted-foreground">
          {actions[0]?.description && (
            <p className="text-relaxed">
              <strong>{actions[0].label}:</strong> {actions[0].description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
