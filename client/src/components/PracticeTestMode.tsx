import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clock, FileText, Trophy, AlertCircle, CheckCircle } from "lucide-react";
import type { Category } from "@shared/schema";

interface PracticeTest {
  id: string;
  name: string;
  description: string;
  categoryIds: number[];
  questionCount: number;
  timeLimit: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  passingScore: number;
  attempts: number;
  bestScore?: number;
  lastAttempt?: string;
}

export default function PracticeTestMode() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const { user: currentUser } = useAuth();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Mock practice tests - in real implementation, this would come from API
  const practiceTests: PracticeTest[] = [
    {
      id: "cissp-full",
      name: "CISSP Full Practice Exam",
      description: "Complete 125-question practice exam simulating the real CISSP test",
      categoryIds: [1],
      questionCount: 125,
      timeLimit: 180,
      difficulty: "Mixed",
      passingScore: 70,
      attempts: 2,
      bestScore: 78,
      lastAttempt: "3 days ago"
    },
    {
      id: "cloud-plus-practice",
      name: "CompTIA Cloud+ Practice Test",
      description: "90-question practice exam covering all Cloud+ domains",
      categoryIds: [6],
      questionCount: 90,
      timeLimit: 90,
      difficulty: "Medium",
      passingScore: 75,
      attempts: 1,
      bestScore: 82,
      lastAttempt: "1 week ago"
    },
    {
      id: "security-fundamentals",
      name: "Security Fundamentals Assessment",
      description: "50-question mixed assessment covering core security concepts",
      categoryIds: [1, 2],
      questionCount: 50,
      timeLimit: 60,
      difficulty: "Easy",
      passingScore: 65,
      attempts: 0
    },
    {
      id: "cism-domain-focus",
      name: "CISM Domain-Focused Test",
      description: "75-question exam focusing on CISM key domains",
      categoryIds: [4],
      questionCount: 75,
      timeLimit: 120,
      difficulty: "Hard",
      passingScore: 72,
      attempts: 1,
      bestScore: 68,
      lastAttempt: "5 days ago"
    }
  ];

  const createPracticeTestMutation = useMutation({
    mutationFn: async (testData: any) => {
      const response = await apiRequest({ 
        method: "POST", 
        endpoint: "/api/quiz", 
        data: testData 
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
        description: "Failed to start practice test. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsCreating(false);
    }
  });

  const handleStartTest = (test: PracticeTest) => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to take practice tests.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    createPracticeTestMutation.mutate({
      title: `${test.name} - Practice Test`,
      categoryIds: test.categoryIds,
      questionCount: test.questionCount,
      timeLimit: test.timeLimit,
      userId: currentUser.id,
      mode: "quiz",
      isPracticeTest: true
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "Medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "Hard": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      case "Mixed": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  const getScoreColor = (score: number, passingScore: number) => {
    if (score >= passingScore) return "text-green-600";
    if (score >= passingScore - 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getCategoryNames = (categoryIds: number[]) => {
    return categoryIds
      .map(id => categories.find(cat => cat.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <Card className="relative z-10 bg-card overflow-hidden force-stacking">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Practice Test Mode
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Take full-length practice exams that simulate real certification tests
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Start */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
          <h3 className="font-medium text-sm mb-2">Quick Practice Test</h3>
          <div className="flex gap-2">
            <Select value={selectedTest} onValueChange={setSelectedTest}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose a certification" />
              </SelectTrigger>
              <SelectContent className="z-50">
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              disabled={!selectedTest || isCreating}
              onClick={() => {
                const test: PracticeTest = {
                  id: 'quick-test',
                  name: `Quick ${categories.find(c => c.id.toString() === selectedTest)?.name} Test`,
                  description: 'Quick practice test',
                  categoryIds: [parseInt(selectedTest)],
                  questionCount: 25,
                  timeLimit: 30,
                  difficulty: 'Mixed',
                  passingScore: 70,
                  attempts: 0
                };
                handleStartTest(test);
              }}
            >
              {isCreating ? "Starting..." : "Start"}
            </Button>
          </div>
        </div>

        {/* Practice Tests */}
        <div className="space-y-4">
          <h3 className="font-medium">Available Practice Tests</h3>
          <div className="grid gap-4">
            {practiceTests.map((test) => (
              <Card key={test.id} className="border-muted">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Test Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{test.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {test.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getCategoryNames(test.categoryIds)}
                        </p>
                      </div>
                      <Badge className={`text-xs ${getDifficultyColor(test.difficulty)}`}>
                        {test.difficulty}
                      </Badge>
                    </div>

                    {/* Test Stats */}
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div className="text-center">
                        <div className="font-medium">{test.questionCount}</div>
                        <div className="text-muted-foreground">Questions</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{test.timeLimit}m</div>
                        <div className="text-muted-foreground">Time Limit</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{test.passingScore}%</div>
                        <div className="text-muted-foreground">Pass Score</div>
                      </div>
                    </div>

                    {/* Progress & Results */}
                    {test.attempts > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Best Score: 
                            <span className={`ml-1 font-medium ${getScoreColor(test.bestScore!, test.passingScore)}`}>
                              {test.bestScore}%
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            {test.attempts} attempt{test.attempts > 1 ? 's' : ''}
                          </span>
                        </div>
                        <Progress 
                          value={(test.bestScore! / test.passingScore) * 100} 
                          className="h-1" 
                        />
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {test.bestScore! >= test.passingScore ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-yellow-500" />
                          )}
                          <span>Last attempt: {test.lastAttempt}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleStartTest(test)}
                      disabled={isCreating}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {test.attempts > 0 ? "Retake Test" : "Start Test"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Practice Test Tips */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Practice Test Tips
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Simulate real exam conditions - find a quiet environment</li>
            <li>• Time yourself strictly - don't pause during the test</li>
            <li>• Review explanations after completing the full test</li>
            <li>• Focus on areas where you score below 70%</li>
            <li>• Take multiple attempts to track improvement</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}