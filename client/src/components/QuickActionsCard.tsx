import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-provider";
import { apiRequest, queryClient, queryKeys } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Zap, RotateCcw, Shuffle, BarChart3 } from "lucide-react";
import type { MasteryScore, Category } from "@shared/schema";

export default function QuickActionsCard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const { user: currentUser } = useAuth();

  const { data: masteryScores = [] } = useQuery<MasteryScore[]>({
    queryKey: queryKeys.user.mastery(currentUser?.id),
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Quick quiz creation mutation
  const createQuizMutation = useMutation({
    mutationFn: async (quizData: any) => {
      const response = await apiRequest({ 
        method: "POST", 
        endpoint: "/api/quiz", 
        data: quizData 
      });
      return response.json();
    },
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.status() });
      setLocation(`/app/quiz/${quiz.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create quiz. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsCreating(false);
    }
  });

  const handleQuickAction = (action: string) => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to use quick actions.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      switch (action) {
        case 'weakest':
          // Find weakest areas for focused practice
          const weakestArea = masteryScores
            .filter(score => score.rollingAverage < 80)
            .sort((a, b) => a.rollingAverage - b.rollingAverage)[0];
          
          if (!weakestArea) {
            toast({
              title: "Great Progress!",
              description: "All areas show strong mastery. Try a random quiz instead.",
            });
            setIsCreating(false);
            return;
          }

          createQuizMutation.mutate({
            title: `Focus Practice - ${categories.find(c => c.id === weakestArea.categoryId)?.name}`,
            categoryIds: [weakestArea.categoryId],
            questionCount: 15,
            timeLimit: null,
            mode: "study"
          });
          break;

        case 'random':
          // Create a mixed quiz from random categories
          const randomCategories = categories
            .sort(() => 0.5 - Math.random())
            .slice(0, 2)
            .map(cat => cat.id);

          createQuizMutation.mutate({
            title: "Random Mixed Practice",
            categoryIds: randomCategories,
            questionCount: 20,
            timeLimit: 25,
            mode: "quiz"
          });
          break;

        case 'review':
          // Quick review session for recent mistakes
          const allCategories = categories.map(cat => cat.id);
          createQuizMutation.mutate({
            title: "Review Session",
            categoryIds: allCategories,
            questionCount: 10,
            timeLimit: null,
            mode: "study"
          });
          break;

        case 'practice-exam':
          // Full-length practice exam
          const examCategories = categories.map(cat => cat.id);
          createQuizMutation.mutate({
            title: "Practice Exam",
            categoryIds: examCategories,
            questionCount: 50,
            timeLimit: 60,
            mode: "quiz"
          });
          break;

        default:
          toast({
            title: "Unknown Action",
            description: "This action is not recognized.",
            variant: "destructive",
          });
          setIsCreating(false);
          break;
      }
    } catch (error) {
      console.error('Quick action error:', error);
      toast({
        title: "Error",
        description: "Failed to create quiz. Please try again.",
        variant: "destructive",
      });
      setIsCreating(false);
    }
  };

  const handleViewProgress = () => {
    // Scroll to progress section or navigate to detailed analytics
    const progressSection = document.getElementById('progress-section');
    if (progressSection) {
      progressSection.scrollIntoView({ behavior: 'smooth' });
      toast({
        title: "Progress Overview",
        description: "Check your detailed progress below.",
      });
    }
  };

  const quickActions = [
    {
      id: 'weakest',
      title: 'Focus Practice',
      description: 'Study your weakest areas',
      icon: Zap,
      color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      disabled: masteryScores.length === 0
    },
    {
      id: 'random',
      title: 'Random Quiz',
      description: 'Mixed practice session',
      icon: Shuffle,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      disabled: false
    },
    {
      id: 'review',
      title: 'Quick Review',
      description: '10-minute study session',
      icon: RotateCcw,
      color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      disabled: false
    },
    {
      id: 'practice-exam',
      title: 'Practice Exam',
      description: 'Full 50-question test',
      icon: BarChart3,
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      disabled: false
    }
  ];

  return (
    <Card className="h-full card-raised overflow-hidden">
      <CardHeader className="relative pb-4">
        {/* Clean background accent */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-accent/8 to-transparent rounded-full"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-foreground">
              Quick Actions
            </CardTitle>
            <p className="text-sm text-muted-foreground">Jump into learning with one click</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            className={`w-full justify-start h-auto p-4 rounded-md transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${
              action.id === 'weakest' ? 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 text-red-700 dark:text-red-300 hover:from-red-100 hover:to-red-200 dark:hover:from-red-900/70 dark:hover:to-red-800/70' :
              action.id === 'random' ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/70 dark:hover:to-blue-800/70' :
              action.id === 'review' ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 text-green-700 dark:text-green-300 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/70 dark:hover:to-green-800/70' :
              'bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 text-purple-700 dark:text-purple-300 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/70 dark:hover:to-purple-800/70'
            }`}
            onClick={() => handleQuickAction(action.id)}
            disabled={isCreating || action.disabled}
          >
            <div className="flex items-center gap-4 w-full">
            <div className="w-8 h-8 rounded-sm bg-white/50 dark:bg-black/20 flex items-center justify-center shadow-sm">
                <action.icon className="h-4 w-4" />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-sm mb-1">{action.title}</div>
                <div className="text-xs opacity-80">{action.description}</div>
              </div>
            </div>
          </Button>
        ))}

        {/* View Detailed Progress */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleViewProgress}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          View Detailed Progress
        </Button>
      </CardContent>
    </Card>
  );
}