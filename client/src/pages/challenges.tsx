import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Challenge, ChallengeAttempt } from "@shared/schema";

export default function ChallengesPage() {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Fetch user's available challenges
  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: [`/api/user/${currentUser?.id}/challenges`],
    enabled: !!currentUser,
  });

  // Fetch user's challenge attempts
  const { data: attempts = [] } = useQuery<ChallengeAttempt[]>({
    queryKey: [`/api/user/${currentUser?.id}/challenge-attempts`],
    enabled: !!currentUser,
  });

  // Mutation to generate daily challenges
  const generateDailyChallengesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest({
        endpoint: `/api/user/${currentUser?.id}/generate-daily-challenges`,
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${currentUser?.id}/challenges`] });
      toast({
        title: "Daily Challenges Generated!",
        description: "New challenges are ready based on your learning areas.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate daily challenges. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to start a challenge
  const startChallengeMutation = useMutation<ChallengeAttempt, Error, number>({
    mutationFn: async (challengeId: number) => {
      // Using deprecated apiRequest - this returns a mock response
      // TODO: Replace with clientStorage.createChallengeAttempt when implementing challenges
      await apiRequest({
        endpoint: `/api/challenge/${challengeId}/start`,
        method: "POST",
        data: { userId: currentUser?.id },
      });
      // Return a mock ChallengeAttempt since the API is deprecated
      return {
        id: 0,
        tenantId: 1,
        userId: currentUser?.id ?? '',
        quizId: null,
        challengeId,
        startedAt: new Date(),
        completedAt: null,
        score: null,
        answers: null,
        pointsEarned: 0,
        timeSpent: null,
        isCompleted: false,
        isPassed: false,
      } as ChallengeAttempt;
    },
    onSuccess: (attempt: ChallengeAttempt) => {
      // Redirect to quiz interface with challenge mode
      setLocation(`/app/quiz/${attempt.quizId || 'challenge'}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start challenge. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartChallenge = (challengeId: number) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Please log in to start challenges.",
        variant: "destructive",
      });
      return;
    }
    startChallengeMutation.mutate(challengeId);
  };

  const handleGenerateDailyChallenges = () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Please log in to generate challenges.",
        variant: "destructive",
      });
      return;
    }
    generateDailyChallengesMutation.mutate();
  };

  // Helper functions
  const getDailyStreak = () => {
    const today = new Date().toDateString();
    const todayAttempts = attempts.filter(attempt => 
      attempt.completedAt && new Date(attempt.completedAt).toDateString() === today
    );
    return todayAttempts.filter(attempt => attempt.isPassed).length;
  };

  const getTotalPoints = () => {
    return attempts.reduce((total, attempt) => total + (attempt.pointsEarned || 0), 0);
  };

  const getCompletionRate = () => {
    if (attempts.length === 0) return 0;
    return Math.round((attempts.filter(a => a.isPassed).length / attempts.length) * 100);
  };

  const categorizeChallenge = (challenge: Challenge) => {
    switch (challenge.type) {
      case 'daily': return { color: 'bg-blue-500', icon: 'fa-calendar-day', label: 'Daily' };
      case 'quick': return { color: 'bg-green-500', icon: 'fa-bolt', label: 'Quick' };
      case 'streak': return { color: 'bg-orange-500', icon: 'fa-fire', label: 'Streak' };
      case 'focus': return { color: 'bg-purple-500', icon: 'fa-target', label: 'Focus' };
      default: return { color: 'bg-gray-500', icon: 'fa-question', label: 'Challenge' };
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
              <p className="text-muted-foreground mb-6">
                Please sign in to access your learning challenges.
              </p>
              <Button onClick={() => setLocation("/login")}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Challenge Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Learning Challenges</h1>
          <p className="text-muted-foreground">
            Quick, focused learning sessions to boost your skills and earn rewards
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Streak</p>
                  <p className="text-2xl font-bold text-orange-500">{getDailyStreak()}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <i className="fas fa-fire text-orange-500 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                  <p className="text-2xl font-bold text-blue-500">{getTotalPoints()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <i className="fas fa-star text-blue-500 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-500">{getCompletionRate()}%</p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                  <i className="fas fa-chart-line text-green-500 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Challenges Done</p>
                  <p className="text-2xl font-bold text-purple-500">{attempts.filter(a => a.isCompleted).length}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <i className="fas fa-trophy text-purple-500 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Challenge Tabs */}
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Available Challenges</TabsTrigger>
            <TabsTrigger value="history">Challenge History</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
            {/* Generate Daily Challenges Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Ready to Challenge Yourself?</h2>
              <Button 
                onClick={handleGenerateDailyChallenges}
                disabled={generateDailyChallengesMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {generateDailyChallengesMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus mr-2"></i>
                    Generate Daily Challenges
                  </>
                )}
              </Button>
            </div>

            {/* Available Challenges */}
            {challenges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges.map((challenge) => {
                  const category = categorizeChallenge(challenge);
                  return (
                    <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 ${category.color} rounded-full flex items-center justify-center`}>
                              <i className={`fas ${category.icon} text-white`}></i>
                            </div>
                            <div>
                              <CardTitle className="text-lg">{challenge.title}</CardTitle>
                              <Badge variant="secondary" className="mt-1">
                                {category.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {challenge.description}
                        </p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>Questions:</span>
                            <span className="font-medium">{challenge.questionsCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Time Limit:</span>
                            <span className="font-medium">{challenge.timeLimit} min</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Target Score:</span>
                            <span className="font-medium">{challenge.targetScore}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Reward:</span>
                            <span className="font-medium text-blue-500">
                              {challenge.pointsReward} pts
                              {(challenge.streakMultiplier || 1) > 1 && (
                                <span className="text-orange-500 ml-1">
                                  (×{challenge.streakMultiplier})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <Button 
                          onClick={() => handleStartChallenge(challenge.id)}
                          disabled={startChallengeMutation.isPending}
                          className="w-full"
                        >
                          {startChallengeMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Starting...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-play mr-2"></i>
                              Start Challenge
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-trophy text-muted-foreground text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Challenges Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first set of daily challenges to get started!
                  </p>
                  <Button onClick={handleGenerateDailyChallenges}>
                    <i className="fas fa-plus mr-2"></i>
                    Generate Daily Challenges
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <h2 className="text-xl font-semibold">Your Challenge History</h2>
            
            {attempts.length > 0 ? (
              <div className="space-y-4">
                {attempts.slice(0, 10).map((attempt) => (
                  <Card key={attempt.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            attempt.isPassed ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            <i className={`fas ${attempt.isPassed ? 'fa-check' : 'fa-times'} text-white`}></i>
                          </div>
                          <div>
                            <h4 className="font-medium">Challenge #{attempt.challengeId}</h4>
                            <p className="text-sm text-muted-foreground">
                              {attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : 'In Progress'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {attempt.score || 0}%
                          </p>
                          <p className="text-sm text-blue-500">
                            +{attempt.pointsEarned || 0} pts
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-history text-muted-foreground text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Challenge History</h3>
                  <p className="text-muted-foreground">
                    Complete your first challenge to see your progress here!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}