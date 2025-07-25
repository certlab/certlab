import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Zap, Settings, History, Brain, Clock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { UserStats } from "@shared/schema";

interface QuickStartModeProps {
  stats?: UserStats;
  onToggleMode: (isQuickMode: boolean) => void;
  isQuickMode: boolean;
}

interface QuickStartOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  action: () => void;
  recommended?: boolean;
}

export default function QuickStartMode({ stats, onToggleMode, isQuickMode }: QuickStartModeProps) {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const createQuizMutation = useMutation({
    mutationFn: async (quizData: any) => {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData),
      });
      if (!response.ok) throw new Error('Failed to create quiz');
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      window.location.href = `/quiz/${data.id}`;
    },
    onError: (error) => {
      console.error('Failed to create quiz:', error);
    },
    onSettled: () => {
      setIsCreating(false);
    }
  });

  const generateQuickOptions = (): QuickStartOption[] => {
    const options: QuickStartOption[] = [];
    const hasStats = stats && stats.totalQuizzes > 0;
    const isNewUser = !hasStats || stats.totalQuizzes === 0;

    // Continue Last Session
    if (hasStats) {
      options.push({
        id: 'continue-last',
        title: 'Continue Learning',
        description: 'Pick up where you left off',
        icon: <History className="w-4 h-4" />,
        badge: 'Most Recent',
        action: () => {
          setIsCreating(true);
          createQuizMutation.mutate({
            userId: user?.id,
            categoryIds: [35], // Default to CC
            subcategoryIds: [],
            questionCount: 10,
            title: 'Continue Learning Session',
            timeLimit: 900,
          });
        }
      });
    }

    // Helen's Top Recommendation
    options.push({
      id: 'helen-recommendation',
      title: 'Helen\'s Pick',
      description: 'AI-curated questions for optimal learning',
      icon: <Brain className="w-4 h-4" />,
      badge: 'AI-Recommended',
      recommended: true,
      action: () => {
        setIsCreating(true);
        const questionCount = isNewUser ? 5 : 10;
        createQuizMutation.mutate({
          userId: user?.id,
          categoryIds: [35],
          subcategoryIds: [],
          questionCount,
          title: 'Helen\'s Recommendation',
          timeLimit: questionCount * 90, // 1.5 min per question
        });
      }
    });

    // Quick Practice
    options.push({
      id: 'quick-practice',
      title: '5-Minute Practice',
      description: 'Short focused session',
      icon: <Clock className="w-4 h-4" />,
      badge: '3 Questions',
      action: () => {
        setIsCreating(true);
        createQuizMutation.mutate({
          userId: user?.id,
          categoryIds: [35],
          subcategoryIds: [],
          questionCount: 3,
          title: 'Quick Practice Session',
          timeLimit: 300,
        });
      }
    });

    // Repeat Successful Format (if has history)
    if (hasStats && stats.averageScore >= 70) {
      options.push({
        id: 'repeat-success',
        title: 'Repeat Success',
        description: 'Use your best-performing format',
        icon: <Zap className="w-4 h-4" />,
        badge: 'High Score',
        action: () => {
          setIsCreating(true);
          createQuizMutation.mutate({
            userId: user?.id,
            categoryIds: [35, 36],
            subcategoryIds: [],
            questionCount: 15,
            title: 'Successful Format Repeat',
            timeLimit: 1200,
          });
        }
      });
    }

    return options;
  };

  const quickOptions = generateQuickOptions();

  return (
    <Card>
      {isQuickMode && (
        <CardContent className="space-y-3">
          {quickOptions.map((option) => (
            <div
              key={option.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                option.recommended ? 'border-blue-200 bg-blue-50/30' : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{option.title}</h4>
                    {option.badge && (
                      <Badge 
                        variant={option.recommended ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {option.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={option.action}
                disabled={isCreating}
                variant={option.recommended ? "default" : "outline"}
                className="shrink-0"
              >
                {isCreating ? 'Starting...' : 'Start'}
              </Button>
            </div>
          ))}
          
          <div className="flex items-center justify-center pt-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onToggleMode(false)}
              className="text-xs"
            >
              <Settings className="w-3 h-3 mr-1" />
              Need more options? Switch to Full Setup
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}