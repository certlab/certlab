import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys, queryClient } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Brain } from 'lucide-react';
import type { UserStats, Category, MasteryScore } from '@shared/schema';

export default function DashboardHero() {
  const { user: currentUser, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: stats } = useQuery<UserStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const handleQuickQuiz = async (mode: string) => {
    if (!currentUser?.id) {
      toast({
        title: 'Login Required',
        description: 'Please log in to start a quiz.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (categories.length === 0) {
        toast({
          title: 'No Categories Available',
          description:
            'Unable to start a quiz because no categories are available. Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      const categoryIds = categories.slice(0, 2).map((c) => c.id);
      const questionCount = 15;
      const tokenCost = clientStorage.calculateQuizTokenCost(questionCount);

      // Check and consume tokens
      const tokenResult = await clientStorage.consumeTokens(currentUser.id, tokenCost);

      if (!tokenResult.success) {
        toast({
          title: 'Insufficient Tokens',
          description: `You need ${tokenCost} tokens but only have ${tokenResult.newBalance}.`,
          variant: 'destructive',
        });
        return;
      }

      // Create the quiz
      const quiz = await clientStorage.createQuiz({
        userId: currentUser.id,
        categoryIds,
        questionCount,
        title: `${mode} Session - ${new Date().toLocaleDateString()}`,
      });

      // Refresh user state in auth provider to keep it in sync
      await refreshUser();

      queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.tokenBalance(currentUser?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });

      toast({
        title: 'Quiz Created',
        description: `Used ${tokenCost} tokens. New balance: ${tokenResult.newBalance}`,
      });

      if (quiz?.id) {
        setLocation(`/app/quiz/${quiz.id}`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create quiz session',
        variant: 'destructive',
      });
    }
  };

  if (!stats) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Enhanced Welcome Hero with Clean Background */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-background to-secondary/3 p-8 mb-8 shadow-lg">
        {/* Clean background accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-xl"></div>

        {/* Helen's AI Learning Dashboard */}
        <div className="relative z-10 space-y-8">
          {/* Helen's Primary Conversation */}
          <div className="flex items-start gap-6">
            {/* Helen's Main Chat */}
            <div className="flex-1 relative">
              {/* Chat Bubble Tail */}
              <div className="absolute left-0 top-6 w-0 h-0 border-t-12 border-t-transparent border-b-12 border-b-transparent border-r-16 border-r-card -translate-x-4"></div>

              {/* Chat Content */}
              <div className="card-breathing rounded-xl bg-gradient-to-br from-card to-purple-50/30 dark:to-purple-950/30 shadow-xl">
                <div className="flex items-center gap-3 section-rhythm">
                  <h3 className="font-bold text-purple-700 dark:text-purple-300 text-2xl">Helen</h3>
                  <Badge
                    variant="secondary"
                    className="text-sm bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 px-3 py-1"
                  >
                    AI Learning Assistant
                  </Badge>
                </div>
                <p className="text-foreground text-comfortable text-2xl font-semibold">
                  Welcome back, {currentUser?.firstName || 'Student'}!
                </p>
                <p className="text-muted-foreground text-relaxed text-lg section-rhythm">
                  I've been analyzing your learning patterns and progress data. Based on your recent
                  performance, I've identified optimal study opportunities that align with your
                  certification goals. Let me guide your next learning session for maximum
                  effectiveness.
                </p>

                {/* AI Recommendations */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    onClick={() => handleQuickQuiz('AI Recommended')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg text-base px-6 py-3"
                  >
                    <Brain className="w-5 h-5 mr-3" />
                    Start AI-Guided Session
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleQuickQuiz('Quick Practice')}
                    className="bg-white/80 hover:bg-purple-50 dark:bg-gray-800/80 dark:hover:bg-purple-950/50 text-base px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <BookOpen className="w-5 h-5 mr-3" />
                    Practice Mode
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
