import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-provider";
import { apiRequest, queryClient, queryKeys } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  Target, 
  Settings,
  Brain,
  ClipboardCheck,
  Trophy,
  CheckCircle,
  Timer,
  Users,
  BookOpen
} from "lucide-react";
import type { Category, Subcategory } from "@shared/schema";

type LearningMode = "study" | "quiz" | "challenge";

interface SessionConfig {
  mode: LearningMode;
  categories: number[];
  subcategories: number[];
  timeLimit: number;
  questionCount: number;
  difficulty?: string;
}

export default function LearningModeWizard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    mode: "study",
    categories: [],
    subcategories: [],
    timeLimit: 30,
    questionCount: 10,
    difficulty: "mixed"
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: queryKeys.subcategories.all(),
    enabled: sessionConfig.categories.length > 0,
  });

  const createQuizMutation = useMutation({
    mutationFn: async (quizData: any) => {
      const response = await apiRequest({ method: "POST", endpoint: "/api/quiz", data: quizData });
      return response.json();
    },
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.status() });
      
      if (quiz.adaptiveInfo && quiz.adaptiveInfo.increasePercentage > 0) {
        toast({
          title: "Adaptive Learning Activated",
          description: `Question count increased by ${quiz.adaptiveInfo.increasePercentage}% based on your performance`,
          variant: "default",
        });
      }
      
      setLocation(`/app/quiz/${quiz.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleModeSelect = (mode: LearningMode) => {
    setSessionConfig(prev => ({ 
      ...prev, 
      mode,
      questionCount: mode === "challenge" ? 7 : mode === "study" ? 10 : 25
    }));
    setCurrentStep(2);
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSessionConfig(prev => {
      const isSelected = prev.categories.includes(categoryId);
      if (isSelected) {
        return {
          ...prev,
          categories: prev.categories.filter(id => id !== categoryId),
          subcategories: prev.subcategories.filter(subId => {
            const sub = subcategories.find(s => s.id === subId);
            return sub?.categoryId !== categoryId;
          })
        };
      } else {
        if (prev.mode === "quiz" && prev.categories.length > 0) {
          return { ...prev, categories: [categoryId], subcategories: [] };
        }
        return { ...prev, categories: [...prev.categories, categoryId] };
      }
    });
  };

  const handleSubcategoryToggle = (subcategoryId: number) => {
    setSessionConfig(prev => {
      const isSelected = prev.subcategories.includes(subcategoryId);
      if (isSelected) {
        return { ...prev, subcategories: prev.subcategories.filter(id => id !== subcategoryId) };
      } else {
        return { ...prev, subcategories: [...prev.subcategories, subcategoryId] };
      }
    });
  };

  const handleStartSession = () => {
    if (sessionConfig.categories.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one certification.",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Error",
        description: "Please log in to start a learning session.",
        variant: "destructive",
      });
      return;
    }

    if (sessionConfig.mode === "challenge") {
      setLocation("/challenges");
      return;
    }

    const selectedCertNames = categories
      .filter(c => sessionConfig.categories.includes(c.id))
      .map(c => c.name)
      .join(", ");

    const quizData = {
      title: sessionConfig.mode === "study" 
        ? `${selectedCertNames} Study Session`
        : `${selectedCertNames} Quiz`,
      categoryIds: sessionConfig.categories,
      subcategoryIds: sessionConfig.subcategories.length > 0 ? sessionConfig.subcategories : undefined,
      questionCount: sessionConfig.questionCount,
      timeLimit: sessionConfig.timeLimit === 0 ? undefined : sessionConfig.timeLimit,
      mode: sessionConfig.mode,
    };

    createQuizMutation.mutate(quizData);
  };

  const getModeIcon = (mode: LearningMode) => {
    switch (mode) {
      case "study": return <Brain className="w-6 h-6" />;
      case "quiz": return <ClipboardCheck className="w-6 h-6" />;
      case "challenge": return <Trophy className="w-6 h-6" />;
    }
  };

  const getModeColor = (mode: LearningMode) => {
    switch (mode) {
      case "study": return "border-primary bg-primary/5";
      case "quiz": return "border-secondary bg-secondary/5";
      case "challenge": return "border-orange-500 bg-orange-500/5";
    }
  };

  const filteredSubcategories = subcategories.filter(sub => 
    sessionConfig.categories.includes(sub.categoryId)
  );

  const progressPercentage = ((currentStep - 1) / 3) * 100;

  return (
    <Card className="shadow-lg border-primary/20 overflow-hidden bg-gradient-to-br from-card to-primary/3 animate-fade-in interactive-scale">
      <CardHeader className="relative p-4 sm:p-6 lg:p-8 border-b border-border/50">
        {/* Clean background accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/6 to-transparent rounded-full"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-1">
                Start Learning Session
              </CardTitle>
              <p className="text-muted-foreground text-xs sm:text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Choose your mode, topics, and session preferences
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-2 font-medium">Step {currentStep} of 3</div>
            <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 lg:p-8">
        {/* Step 1: Mode Selection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Choose Your Learning Mode</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(["study", "quiz", "challenge"] as LearningMode[]).map((mode) => (
                <Card 
                  key={mode}
                  className={`group cursor-pointer transition-all duration-500 hover:shadow-glow hover:-translate-y-2 border-2 ${
                    sessionConfig.mode === mode 
                      ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-glow" 
                      : "border-border/50 hover:border-primary/50 bg-card/60"
                  }`}
                  onClick={() => handleModeSelect(mode)}
                >
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className={`p-4 rounded-2xl transition-all duration-300 ${
                        sessionConfig.mode === mode
                          ? "bg-gradient-to-br from-primary to-primary/70 text-white shadow-lg scale-110"
                          : "bg-gradient-to-br from-muted to-muted/70 text-muted-foreground group-hover:from-primary/20 group-hover:to-primary/10 group-hover:text-primary"
                      }`}>
                        {getModeIcon(mode)}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-foreground capitalize mb-2">{mode} Mode</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {mode === "study" && "Continuous learning with immediate feedback and explanations"}
                        {mode === "quiz" && "Formal assessment for comprehensive mastery tracking"}
                        {mode === "challenge" && "Quick 5-7 question micro-learning challenges"}
                      </p>
                    </div>
                    <Badge 
                      variant={mode === "study" ? "default" : mode === "quiz" ? "secondary" : "destructive"}
                      className="text-xs font-medium px-3 py-1"
                    >
                      {mode === "study" && "💡 Unlimited Questions"}
                      {mode === "quiz" && "📊 Graded Assessment"}
                      {mode === "challenge" && "⚡ Micro-Learning"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Category Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Select Certification{sessionConfig.mode === "quiz" ? " (Choose One)" : "s"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className={`cursor-pointer transition-all duration-300 ${
                    sessionConfig.categories.includes(category.id)
                      ? "border-primary bg-primary/5 shadow-medium"
                      : "hover:border-primary/50 hover:shadow-medium"
                  }`}
                  onClick={() => handleCategoryToggle(category.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <i className={`${category.icon} text-primary text-lg`}></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{category.name}</h4>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </div>
                      </div>
                      <Checkbox
                        checked={sessionConfig.categories.includes(category.id)}
                        onCheckedChange={() => handleCategoryToggle(category.id)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {sessionConfig.categories.length > 0 && (
              <Button onClick={() => setCurrentStep(3)} className="w-full">
                Continue to Settings
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Session Configuration */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Configure Session</h3>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Time Limit */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Time Limit
                </Label>
                <Select
                  value={sessionConfig.timeLimit.toString()}
                  onValueChange={(value) => setSessionConfig(prev => ({ ...prev, timeLimit: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Limit</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Question Count */}
              {sessionConfig.mode !== "challenge" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Question Count
                  </Label>
                  <Select
                    value={sessionConfig.questionCount.toString()}
                    onValueChange={(value) => setSessionConfig(prev => ({ ...prev, questionCount: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionConfig.mode === "study" ? (
                        <>
                          <SelectItem value="10">10 questions</SelectItem>
                          <SelectItem value="20">20 questions</SelectItem>
                          <SelectItem value="50">50 questions</SelectItem>
                          <SelectItem value="100">100 questions</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="15">15 questions</SelectItem>
                          <SelectItem value="25">25 questions</SelectItem>
                          <SelectItem value="50">50 questions</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Focus Areas */}
            {filteredSubcategories.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Focus Areas (Optional)
                </Label>
                <div className="max-h-32 overflow-y-auto bg-muted/30 rounded-lg p-4 border">
                  {filteredSubcategories.map((subcategory) => (
                    <div key={subcategory.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`sub-${subcategory.id}`}
                        checked={sessionConfig.subcategories.includes(subcategory.id)}
                        onCheckedChange={() => handleSubcategoryToggle(subcategory.id)}
                      />
                      <label
                        htmlFor={`sub-${subcategory.id}`}
                        className="text-sm text-foreground cursor-pointer flex-1"
                      >
                        {subcategory.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Summary */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-foreground">Session Summary</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Mode: <span className="font-medium capitalize">{sessionConfig.mode}</span></div>
                <div>Certifications: <span className="font-medium">{sessionConfig.categories.length}</span></div>
                <div>Questions: <span className="font-medium">{sessionConfig.questionCount}</span></div>
                <div>Time: <span className="font-medium">{sessionConfig.timeLimit === 0 ? "No limit" : `${sessionConfig.timeLimit} min`}</span></div>
              </div>
            </div>

            <Button 
              onClick={handleStartSession} 
              className="w-full"
              disabled={createQuizMutation.isPending}
            >
              {createQuizMutation.isPending ? "Creating Session..." : "Start Learning Session"}
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}