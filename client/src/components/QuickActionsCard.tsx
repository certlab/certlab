import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
    queryKey: ['/api/user', currentUser?.id, 'mastery'],
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
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
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setLocation(`/quiz/${quiz.id}`);
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

  const handleQuickAction = async (action: string) => {
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
            userId: currentUser.id,
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
            userId: currentUser.id,
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
            userId: currentUser.id,
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
            userId: currentUser.id,
            mode: "quiz"
          });
          break;
      }
    } catch (error) {
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
      color: 'bg-red-50 dark:bg-red-900/20 text-red-600',
      disabled: masteryScores.length === 0
    },
    {
      id: 'random',
      title: 'Random Quiz',
      description: 'Mixed practice session',
      icon: Shuffle,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
      disabled: false
    },
    {
      id: 'review',
      title: 'Quick Review',
      description: '10-minute study session',
      icon: RotateCcw,
      color: 'bg-green-50 dark:bg-green-900/20 text-green-600',
      disabled: false
    },
    {
      id: 'practice-exam',
      title: 'Practice Exam',
      description: 'Full 50-question test',
      icon: BarChart3,
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
      disabled: false
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            className={`w-full justify-start h-auto p-3 ${action.color}`}
            onClick={() => handleQuickAction(action.id)}
            disabled={isCreating || action.disabled}
          >
            <div className="flex items-center gap-3 w-full">
              <action.icon className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs opacity-70">{action.description}</div>
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