import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { localStorage } from "@/lib/localStorage";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserStats, Category, MasteryScore } from "@shared/schema";

export default function DashboardHero() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const currentUser = localStorage.getCurrentUser();

  const { data: stats } = useQuery<UserStats>({
    queryKey: ['/api/user', currentUser?.id, 'stats'],
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: masteryScores = [] } = useQuery<MasteryScore[]>({
    queryKey: ['/api/user', currentUser?.id, 'mastery'],
    enabled: !!currentUser,
  });

  // Quick quiz creation mutation
  const createQuickQuizMutation = useMutation({
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
      setIsCreatingQuiz(false);
    }
  });

  const handleQuickQuiz = (categoryId: number, mode: "study" | "quiz") => {
    setIsCreatingQuiz(true);
    createQuickQuizMutation.mutate({
      title: `Quick ${mode === "quiz" ? "Assessment" : "Study"} - ${categories.find(c => c.id === categoryId)?.name}`,
      categoryIds: [categoryId],
      questionCount: mode === "quiz" ? 20 : 10,
      timeLimit: mode === "quiz" ? 30 : null,
      mode: mode
    });
  };

  // Calculate overall mastery progress
  const calculateOverallMastery = () => {
    if (masteryScores.length === 0) return 0;
    const total = masteryScores.reduce((sum, score) => sum + score.rollingAverage, 0);
    return Math.round(total / masteryScores.length);
  };

  // Get HELEN AI insights based on user data
  const getAIInsights = () => {
    const overallMastery = calculateOverallMastery();
    const recentQuizzes = stats?.totalQuizzes || 0;
    const averageScore = stats?.averageScore || 0;
    const streak = stats?.currentStreak || 0;

    if (recentQuizzes === 0) {
      return {
        message: "Welcome to your certification journey! Let's start with your first assessment to understand your current knowledge level.",
        type: "welcome",
        action: "Take your first quiz to get personalized study recommendations."
      };
    }

    if (overallMastery >= 85) {
      return {
        message: "Excellent progress! You're approaching certification readiness. Focus on maintaining consistency across all domains.",
        type: "excellent",
        action: "Take practice exams to simulate the real certification experience."
      };
    }

    if (overallMastery >= 70) {
      return {
        message: "Great momentum! You're building solid foundational knowledge. Keep focusing on your weaker areas to reach mastery.",
        type: "good",
        action: "Target quiz mode sessions in domains with lower mastery scores."
      };
    }

    if (streak >= 7) {
      return {
        message: "Amazing dedication! Your consistent daily practice is paying off. This habit will accelerate your certification success.",
        type: "streak",
        action: "Maintain this momentum - consistency is key to retention."
      };
    }

    if (averageScore < 60) {
      return {
        message: "Every expert was once a beginner. Focus on study mode first to build understanding, then test with quiz mode.",
        type: "encouragement",
        action: "Start with study mode sessions to learn concepts before assessments."
      };
    }

    return {
      message: "You're making steady progress! Regular practice and review will help solidify your knowledge for certification success.",
      type: "progress",
      action: "Continue balanced practice with both study and quiz modes."
    };
  };

  const insights = getAIInsights();
  const overallMastery = calculateOverallMastery();

  if (!stats) {
    return (
      <div className="mb-8">
        <Card className="material-shadow border border-gray-100">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <Card className="material-shadow border border-gray-100 overflow-hidden">
        {/* HELEN AI Insights Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 p-6">
          <div className="flex items-start space-x-4">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 100 100" 
                fill="none"
                className="friendly-human-avatar"
                style={{
                  animation: 'gentle-float 4s ease-in-out infinite'
                }}
              >
                {/* Human Head */}
                <ellipse cx="50" cy="45" rx="22" ry="25" fill="#fdbcb4" opacity="0.95">
                  <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
                </ellipse>
                
                {/* Feminine Hair - Longer, styled */}
                <g fill="#8B4513" opacity="0.9">
                  {/* Main hair volume */}
                  <path d="M25 28 Q30 10 50 15 Q70 10 75 28 Q75 35 70 40 Q65 45 60 48 Q55 50 50 48 Q45 50 40 48 Q35 45 30 40 Q25 35 25 28" />
                  
                  {/* Side bangs */}
                  <path d="M28 30 Q25 25 30 22 Q35 20 40 25 Q38 28 35 30">
                    <animate attributeName="d" values="M28 30 Q25 25 30 22 Q35 20 40 25 Q38 28 35 30;M28 31 Q26 24 31 21 Q36 19 41 24 Q39 27 36 29;M28 30 Q25 25 30 22 Q35 20 40 25 Q38 28 35 30" dur="3s" repeatCount="indefinite" />
                  </path>
                  <path d="M72 30 Q75 25 70 22 Q65 20 60 25 Q62 28 65 30">
                    <animate attributeName="d" values="M72 30 Q75 25 70 22 Q65 20 60 25 Q62 28 65 30;M72 31 Q74 24 69 21 Q64 19 59 24 Q61 27 64 29;M72 30 Q75 25 70 22 Q65 20 60 25 Q62 28 65 30" dur="3s" repeatCount="indefinite" />
                  </path>
                  
                  {/* Hair flowing behind */}
                  <ellipse cx="25" cy="35" rx="8" ry="15" transform="rotate(-15 25 35)">
                    <animateTransform attributeName="transform" type="rotate" values="-15 25 35;-12 25 35;-18 25 35;-15 25 35" dur="4s" repeatCount="indefinite" />
                  </ellipse>
                  <ellipse cx="75" cy="35" rx="8" ry="15" transform="rotate(15 75 35)">
                    <animateTransform attributeName="transform" type="rotate" values="15 75 35;12 75 35;18 75 35;15 75 35" dur="4s" repeatCount="indefinite" />
                  </ellipse>
                  
                  {/* Hair highlights */}
                  <path d="M35 25 Q45 22 50 25 Q55 22 65 25" stroke="#A0522D" strokeWidth="1" fill="none" opacity="0.6">
                    <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
                  </path>
                </g>
                
                {/* Left Eye */}
                <ellipse cx="42" cy="40" rx="3.5" ry="4" fill="white">
                  <animate attributeName="ry" values="4;0.5;4" dur="3s" repeatCount="indefinite" />
                </ellipse>
                <circle cx="43" cy="40" r="2" fill="#333">
                  <animate attributeName="r" values="2;1.5;2" dur="3s" repeatCount="indefinite" />
                </circle>
                {/* Left eyelashes */}
                <g stroke="#333" strokeWidth="0.8" fill="none" opacity="0.7">
                  <path d="M38 37 Q39 35 40 37" />
                  <path d="M40 36 Q41 34 42 36" />
                  <path d="M44 36 Q45 34 46 36" />
                  <path d="M46 37 Q47 35 48 37" />
                </g>
                
                {/* Right Eye */}
                <ellipse cx="58" cy="40" rx="3.5" ry="4" fill="white">
                  <animate attributeName="ry" values="4;0.5;4" dur="3s" repeatCount="indefinite" />
                </ellipse>
                <circle cx="57" cy="40" r="2" fill="#333">
                  <animate attributeName="r" values="2;1.5;2" dur="3s" repeatCount="indefinite" />
                </circle>
                {/* Right eyelashes */}
                <g stroke="#333" strokeWidth="0.8" fill="none" opacity="0.7">
                  <path d="M52 37 Q53 35 54 37" />
                  <path d="M54 36 Q55 34 56 36" />
                  <path d="M58 36 Q59 34 60 36" />
                  <path d="M60 37 Q61 35 62 37" />
                </g>
                
                {/* Feminine Eyebrows - More arched */}
                <path d="M37 34 Q42 31 47 33" stroke="#8B4513" strokeWidth="1.8" fill="none">
                  <animate attributeName="d" values="M37 34 Q42 31 47 33;M37 33 Q42 30 47 32;M37 34 Q42 31 47 33" dur="2s" repeatCount="indefinite" />
                </path>
                <path d="M53 33 Q58 31 63 34" stroke="#8B4513" strokeWidth="1.8" fill="none">
                  <animate attributeName="d" values="M53 33 Q58 31 63 34;M53 32 Q58 30 63 33;M53 33 Q58 31 63 34" dur="2s" repeatCount="indefinite" />
                </path>
                
                {/* Nose */}
                <ellipse cx="50" cy="47" rx="1.5" ry="2" fill="#f4a49a" opacity="0.8" />
                
                {/* Feminine Lips - Fuller, more defined */}
                <ellipse cx="50" cy="55" rx="7" ry="3" fill="#e8577a" opacity="0.8">
                  <animate attributeName="opacity" values="0.7;0.9;0.7" dur="3s" repeatCount="indefinite" />
                </ellipse>
                <path 
                  d="M43 55 Q50 62 57 55" 
                  stroke="#c91456" 
                  strokeWidth="1.5" 
                  fill="none" 
                  strokeLinecap="round"
                  opacity="0.9"
                >
                  <animate attributeName="d" values="M43 55 Q50 62 57 55;M43 56 Q50 61 57 56;M43 55 Q50 62 57 55" dur="4s" repeatCount="indefinite" />
                </path>
                {/* Lip gloss highlight */}
                <ellipse cx="50" cy="53" rx="4" ry="1.5" fill="white" opacity="0.3">
                  <animate attributeName="opacity" values="0.2;0.4;0.2" dur="2s" repeatCount="indefinite" />
                </ellipse>
                
                {/* Neck */}
                <rect x="46" y="68" width="8" height="8" fill="#fdbcb4" opacity="0.9" />
                
                {/* Feminine Blouse/Top */}
                <path d="M42 76 L46 76 L50 80 L54 76 L58 76 L58 85 L42 85 Z" fill="#6a5acd" opacity="0.8">
                  <animate attributeName="opacity" values="0.7;0.9;0.7" dur="3s" repeatCount="indefinite" />
                </path>
                {/* Blouse details */}
                <circle cx="50" cy="77" r="1" fill="white" opacity="0.8" />
                <circle cx="50" cy="81" r="0.8" fill="white" opacity="0.7" />
                
                {/* Thinking bubbles */}
                <g opacity="0.4">
                  <circle cx="75" cy="25" r="2" fill="white">
                    <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite" begin="0s" />
                    <animate attributeName="cy" values="25;20;25" dur="2s" repeatCount="indefinite" begin="0s" />
                  </circle>
                  <circle cx="80" cy="20" r="3" fill="white">
                    <animate attributeName="opacity" values="0;0.8;0" dur="2s" repeatCount="indefinite" begin="0.7s" />
                    <animate attributeName="cy" values="20;15;20" dur="2s" repeatCount="indefinite" begin="0.7s" />
                  </circle>
                  <circle cx="85" cy="15" r="4" fill="white">
                    <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="1.4s" />
                    <animate attributeName="cy" values="15;10;15" dur="2s" repeatCount="indefinite" begin="1.4s" />
                  </circle>
                </g>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">HELEN AI Assistant</h3>
                <Badge variant="secondary" className="text-xs">
                  {insights.type === "excellent" ? "Expert Level" :
                   insights.type === "good" ? "Advanced" :
                   insights.type === "streak" ? "Consistent" :
                   insights.type === "welcome" ? "Getting Started" :
                   "Improving"}
                </Badge>
              </div>
              <p className="text-gray-700 mb-2">{insights.message}</p>
              <p className="text-sm text-blue-700 font-medium">{insights.action}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                {categories.slice(0, 3).map((category) => (
                  <div key={category.id} className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickQuiz(category.id, "study")}
                      disabled={isCreatingQuiz}
                      className="flex-1 text-xs"
                    >
                      <i className="fas fa-brain mr-1"></i>
                      Study {category.name}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleQuickQuiz(category.id, "quiz")}
                      disabled={isCreatingQuiz}
                      className="flex-1 text-xs bg-primary hover:bg-blue-700"
                    >
                      <i className="fas fa-clipboard-check mr-1"></i>
                      Quiz {category.name}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Metrics */}
            <div className="lg:col-span-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Your Progress</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalQuizzes}</div>
                  <div className="text-xs text-blue-700">Total Sessions</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.averageScore}%</div>
                  <div className="text-xs text-green-700">Average Score</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{overallMastery}%</div>
                  <div className="text-xs text-purple-700">Overall Mastery</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.currentStreak || 0}</div>
                  <div className="text-xs text-orange-700">Day Streak</div>
                </div>
              </div>

              {/* Motivation Message */}
              <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-lightbulb text-yellow-600"></i>
                  <span className="text-sm font-medium text-gray-900">Today's Focus</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  {masteryScores.length > 0 ? (
                    `Work on ${masteryScores
                      .sort((a, b) => a.rollingAverage - b.rollingAverage)
                      .slice(0, 2)
                      .map(score => categories.find(c => c.id === score.categoryId)?.name)
                      .filter(Boolean)
                      .join(" and ")} to boost your weakest areas.`
                  ) : (
                    "Complete your first assessment to get personalized recommendations."
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}