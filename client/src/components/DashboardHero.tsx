import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Trophy } from "lucide-react";
import type { UserStats, Category, MasteryScore } from "@shared/schema";

export default function DashboardHero() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const { user: currentUser } = useAuth();

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
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to create a quiz.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingQuiz(true);
    createQuickQuizMutation.mutate({
      title: `Quick ${mode === "quiz" ? "Assessment" : "Study"} - ${categories.find(c => c.id === categoryId)?.name}`,
      categoryIds: [categoryId],
      questionCount: mode === "quiz" ? 20 : 10,
      timeLimit: mode === "quiz" ? 30 : null,
      userId: currentUser.id,
      mode: mode
    });
  };

  // Calculate overall mastery progress
  const calculateOverallMastery = () => {
    if (masteryScores.length === 0) return 0;
    const total = masteryScores.reduce((sum, score) => sum + score.rollingAverage, 0);
    return Math.round(total / masteryScores.length);
  };

  // Get Helen AI insights based on user data
  const getAIInsights = () => {
    const overallMastery = calculateOverallMastery();
    const recentQuizzes = stats?.totalQuizzes || 0;
    const averageScore = stats?.averageScore || 0;
    const streak = stats?.currentStreak || 0;

    if (recentQuizzes === 0) {
      return {
        message: "Welcome to Cert Lab! I'm Helen, your AI learning assistant. Let's start with your first assessment to create a personalized study plan.",
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
        action: "Focus study sessions on domains with lower mastery scores."
      };
    }

    if (streak >= 7) {
      return {
        message: "Amazing dedication! Your consistent daily practice is paying off. This habit will accelerate your certification success.",
        type: "streak",
        action: "Keep up your daily study routine - consistency is key to retention."
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
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
        {/* Helen AI Insights Header */}
        <div className="section-header mb-6">
          <h2 className="text-xl font-semibold text-foreground">Helen AI Assistant</h2>
          <p className="text-sm text-muted-foreground">Your personalized AI learning companion and study guidance</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 text-center sm:text-left mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 gradient-primary rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden avatar-container group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 shadow-glow">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 120 120" 
                fill="none"
                className="instructor-avatar transition-all duration-300 group-hover:scale-110"
                style={{
                  animation: 'gentle-float 4s ease-in-out infinite'
                }}
              >
                {/* Professional Female Instructor Avatar */}
                
                {/* Face - Natural oval shape */}
                <ellipse cx="60" cy="50" rx="18" ry="22" fill="#f5c2a6" stroke="#e6a584" strokeWidth="0.5" />
                
                {/* Professional hairstyle - shoulder length */}
                <path d="M42 35 Q45 20 60 25 Q75 20 78 35 Q78 45 75 55 Q70 65 60 68 Q50 65 45 55 Q42 45 42 35" 
                      fill="#8B4513" />
                      
                {/* Side part */}
                <path d="M58 25 Q62 28 65 32" stroke="#A0522D" strokeWidth="1.5" fill="none" />
                
                {/* Eyes - realistic proportions with micro-interactions */}
                <ellipse cx="53" cy="45" rx="3" ry="2" fill="white" className="group-hover:animate-pulse" />
                <ellipse cx="67" cy="45" rx="3" ry="2" fill="white" className="group-hover:animate-pulse" />
                
                {/* Interactive pupils */}
                <circle cx="53" cy="45" r="1.8" fill="#4a4a4a" className="transition-all duration-300 group-hover:r-2">
                  <animateTransform 
                    attributeName="transform" 
                    type="translate" 
                    values="0,0; 0.5,-0.3; -0.3,0.4; 0,0" 
                    dur="6s" 
                    repeatCount="indefinite" 
                  />
                </circle>
                <circle cx="67" cy="45" r="1.8" fill="#4a4a4a" className="transition-all duration-300 group-hover:r-2">
                  <animateTransform 
                    attributeName="transform" 
                    type="translate" 
                    values="0,0; 0.5,-0.3; -0.3,0.4; 0,0" 
                    dur="6s" 
                    repeatCount="indefinite" 
                  />
                </circle>
                
                {/* Eye highlights with shimmer effect */}
                <circle cx="53.5" cy="44.5" r="0.5" fill="white">
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="67.5" cy="44.5" r="0.5" fill="white">
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
                </circle>
                
                {/* Interactive eyebrows */}
                <path d="M48 41 Q53 39 58 41" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" className="transition-all duration-200">
                  <animate attributeName="d" values="M48 41 Q53 39 58 41;M48 40 Q53 38 58 40;M48 41 Q53 39 58 41" dur="3s" repeatCount="indefinite" />
                </path>
                <path d="M62 41 Q67 39 72 41" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" className="transition-all duration-200">
                  <animate attributeName="d" values="M62 41 Q67 39 72 41;M62 40 Q67 38 72 40;M62 41 Q67 39 72 41" dur="3s" repeatCount="indefinite" />
                </path>
                
                {/* Nose - subtle and natural */}
                <path d="M60 48 L59 52 L61 52 Z" fill="#e6a584" />
                
                {/* Interactive friendly smile */}
                <path d="M55 58 Q60 62 65 58" stroke="#c85a5a" strokeWidth="2" strokeLinecap="round" fill="none" className="transition-all duration-300">
                  <animate attributeName="d" values="M55 58 Q60 62 65 58;M55 59 Q60 63 65 59;M55 58 Q60 62 65 58" dur="4s" repeatCount="indefinite" />
                  <animate attributeName="stroke" values="#c85a5a;#d66b6b;#c85a5a" dur="2s" repeatCount="indefinite" />
                </path>
                
                {/* Professional attire */}
                <rect x="45" y="75" width="30" height="25" fill="#2c5aa0" rx="2" />
                
                {/* Collar */}
                <path d="M57 75 L60 72 L63 75" fill="#ffffff" stroke="#2c5aa0" strokeWidth="0.5" />
                
                {/* Simple necklace */}
                <circle cx="60" cy="70" r="2" fill="none" stroke="#cccccc" strokeWidth="0.8" />
                
                {/* Enhanced blinking with micro-interactions */}
                <g className="transition-opacity duration-300 group-hover:opacity-90">
                  <animate attributeName="opacity" values="1;1;0.3;1;1" dur="4s" repeatCount="indefinite" />
                  <rect x="50" y="44" width="6" height="2" fill="#f5c2a6" />
                  <rect x="64" y="44" width="6" height="2" fill="#f5c2a6" />
                </g>
                
                {/* Interactive thinking particles */}
                <g className="opacity-60 group-hover:opacity-90 transition-opacity duration-500">
                  <circle cx="85" cy="25" r="1.5" fill="rgba(255,255,255,0.9)">
                    <animate attributeName="opacity" values="0;0.8;0" dur="3s" repeatCount="indefinite" begin="0s" />
                    <animate attributeName="cy" values="30;20;15" dur="3s" repeatCount="indefinite" begin="0s" />
                    <animate attributeName="r" values="1;2;0.5" dur="3s" repeatCount="indefinite" begin="0s" />
                  </circle>
                  <circle cx="90" cy="20" r="2" fill="rgba(255,255,255,0.8)">
                    <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" begin="1s" />
                    <animate attributeName="cy" values="25;15;10" dur="3s" repeatCount="indefinite" begin="1s" />
                    <animate attributeName="r" values="1.5;2.5;1" dur="3s" repeatCount="indefinite" begin="1s" />
                  </circle>
                  <circle cx="95" cy="15" r="2.5" fill="rgba(255,255,255,0.7)">
                    <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" begin="2s" />
                    <animate attributeName="cy" values="20;10;5" dur="3s" repeatCount="indefinite" begin="2s" />
                    <animate attributeName="r" values="2;3;1.5" dur="3s" repeatCount="indefinite" begin="2s" />
                  </circle>
                </g>
                
                {/* Hover interaction feedback */}
                <circle cx="60" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" opacity="0" className="group-hover:opacity-100 transition-opacity duration-500">
                  <animate attributeName="r" values="35;37;35" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-2 sm:space-y-0 sm:space-x-2 mb-3">
                <Badge 
                  variant={insights.type === "excellent" ? "default" : "secondary"} 
                  className={`text-xs font-medium ${
                    insights.type === "excellent" ? "bg-gradient-primary text-white border-0" :
                    insights.type === "good" ? "bg-secondary/20 text-secondary border-secondary/30" :
                    insights.type === "streak" ? "bg-accent/20 text-accent border-accent/30" :
                    insights.type === "welcome" ? "bg-primary/20 text-primary border-primary/30" :
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {insights.type === "excellent" ? "Expert Level" :
                   insights.type === "good" ? "Advanced" :
                   insights.type === "streak" ? "Consistent" :
                   insights.type === "welcome" ? "Getting Started" :
                   "Improving"}
                </Badge>
              </div>
              <p className="text-foreground/80 mb-3 leading-relaxed">{insights.message}</p>
              <p className="text-sm text-primary font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                {insights.action}
              </p>
            </div>
          </div>
        
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <h4 className="text-xs sm:text-sm font-bold text-foreground mb-3 sm:mb-4 uppercase tracking-wider">Quick Actions</h4>
              <div className="space-y-3">
                {categories.slice(0, 3).map((category) => (
                  <div key={category.id} className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickQuiz(category.id, "study")}
                      disabled={isCreatingQuiz}
                      className="flex-1 text-xs font-medium hover:bg-accent/10 hover:border-accent transition-all"
                    >
                      <BookOpen className="w-3 h-3 mr-1.5" />
                      Study {category.name}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleQuickQuiz(category.id, "quiz")}
                      disabled={isCreatingQuiz}
                      className="flex-1 text-xs font-medium gradient-primary hover:opacity-90 transition-opacity shadow-glow"
                    >
                      <Trophy className="w-3 h-3 mr-1.5" />
                      Quiz {category.name}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Metrics */}
            <div className="lg:col-span-2">
              <h4 className="text-xs sm:text-sm font-bold text-foreground mb-3 sm:mb-4 uppercase tracking-wider">Your Progress</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 card-hover">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{stats.totalQuizzes}</div>
                  <div className="text-xs font-medium text-primary/80 mt-1">Total Sessions</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl border border-secondary/20 card-hover">
                  <div className="text-2xl sm:text-3xl font-bold text-secondary">{stats.averageScore}%</div>
                  <div className="text-xs font-medium text-secondary/80 mt-1">Average Score</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 card-hover">
                  <div className="text-2xl sm:text-3xl font-bold text-accent">{overallMastery}%</div>
                  <div className="text-xs font-medium text-accent/80 mt-1">Overall Mastery</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-muted to-muted/50 rounded-xl border border-border card-hover">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">{stats.currentStreak || 0}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">Day Streak</div>
                </div>
              </div>

              {/* Motivation Message */}
              <div className="mt-5 p-4 bg-gradient-to-r from-accent/5 to-primary/5 rounded-xl border border-accent/20">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-lg">💡</span>
                  </div>
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider">Today's Focus</span>
                </div>
                <p className="text-sm text-foreground/70 leading-relaxed">
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
        </div>
    </div>
  );
}