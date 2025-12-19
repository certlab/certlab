import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-provider';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { Category, Subcategory } from '@shared/schema';

type LearningMode = 'study' | 'quiz' | 'challenge';

export default function LearningModeSelector() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser, refreshUser } = useAuth();

  const [selectedMode, setSelectedMode] = useState<LearningMode>('study');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([]);
  const [timeLimit, setTimeLimit] = useState('30');

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: queryKeys.subcategories.all(),
    enabled: selectedCategories.length > 0,
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

      navigate(`/app/quiz/${quiz.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create session. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCategoryToggle = (categoryId: number, checked: boolean, categoryName: string) => {
    if (selectedMode === 'quiz' && checked && selectedCategories.length > 0) {
      // For quiz mode, only allow one category at a time
      setSelectedCategories([categoryId]);
      // Clear subcategories when switching categories
      setSelectedSubcategories([]);
    } else if (checked) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
      // Remove subcategories from deselected category
      const categorySubcategories = subcategories
        .filter((sub) => sub.categoryId === categoryId)
        .map((sub) => sub.id);
      setSelectedSubcategories(
        selectedSubcategories.filter((id) => !categorySubcategories.includes(id))
      );
    }
  };

  const handleSubcategoryToggle = (subcategoryId: number, checked: boolean) => {
    if (checked) {
      setSelectedSubcategories([...selectedSubcategories, subcategoryId]);
    } else {
      setSelectedSubcategories(selectedSubcategories.filter((id) => id !== subcategoryId));
    }
  };

  const handleModeChange = (mode: LearningMode) => {
    setSelectedMode(mode);
    if (mode === 'quiz' && selectedCategories.length > 1) {
      // For quiz mode, keep only the first selected category
      setSelectedCategories([selectedCategories[0]]);
      // Clear subcategories that don't belong to the kept category
      const keptCategorySubcategories = subcategories
        .filter((sub) => sub.categoryId === selectedCategories[0])
        .map((sub) => sub.id);
      setSelectedSubcategories(
        selectedSubcategories.filter((id) => keptCategorySubcategories.includes(id))
      );
    }
  };

  const handleStartSession = () => {
    if (selectedCategories.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one certification.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'Please log in to start a learning session.',
        variant: 'destructive',
      });
      return;
    }

    // Handle challenge mode differently
    if (selectedMode === 'challenge') {
      navigate('/challenges');
      return;
    }

    const selectedCertNames = categories
      .filter((c) => selectedCategories.includes(c.id))
      .map((c) => c.name)
      .join(', ');

    const quizData = {
      title:
        selectedMode === 'study'
          ? `${selectedCertNames} Study Session`
          : `${selectedCertNames} Quiz`,
      categoryIds: selectedCategories,
      subcategoryIds: selectedSubcategories.length > 0 ? selectedSubcategories : undefined,
      questionCount: selectedMode === 'study' ? 10 : 25, // Study: continuous, Quiz: fixed assessment
      timeLimit: timeLimit === '0' ? undefined : parseInt(timeLimit),
      mode: selectedMode,
    };

    createQuizMutation.mutate(quizData);
  };

  const filteredSubcategories = subcategories.filter((sub) =>
    selectedCategories.includes(sub.categoryId)
  );

  return (
    <Card className="shadow-lg border-0 overflow-hidden bg-card animate-fade-in">
      <CardHeader className="p-4 sm:p-6 lg:p-8 border-b border-border/50 gradient-mesh">
        <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-2">
          Choose Your Learning Mode
        </CardTitle>
        <p className="text-foreground/70 text-xs sm:text-sm">
          HELEN - Highly Efficient Learning Engine for Next-Gen Certification
        </p>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 lg:p-8">
        {/* Mode Selection with Vertical Tabs */}
        <div className="mb-6 sm:mb-8">
          <Label className="text-xs sm:text-sm font-bold text-foreground mb-3 sm:mb-4 block uppercase tracking-wider">
            Learning Mode
          </Label>
          <Tabs
            value={selectedMode}
            onValueChange={(value) => handleModeChange(value as LearningMode)}
            orientation="vertical"
            className="w-full flex gap-6"
          >
            <TabsList className="flex-col h-auto w-56 bg-muted/30 p-2 flex-shrink-0">
              <TabsTrigger
                value="study"
                className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground p-3 mb-2"
              >
                <div className="flex items-center gap-3">
                  <i className="fas fa-brain text-lg"></i>
                  <span className="font-semibold">Study Mode</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className="w-full justify-start data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground p-3 mb-2"
              >
                <div className="flex items-center gap-3">
                  <i className="fas fa-clipboard-check text-lg"></i>
                  <span className="font-semibold">Quiz Mode</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="challenge"
                className="w-full justify-start data-[state=active]:bg-orange-500 data-[state=active]:text-white p-3"
              >
                <div className="flex items-center gap-3">
                  <i className="fas fa-trophy text-lg"></i>
                  <span className="font-semibold">Challenge Mode</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-w-0">
              <TabsContent value="study" className="mt-0">
                <div className="border-2 border-primary rounded-xl p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-primary/10 to-primary/5 shadow-glow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-foreground text-lg">Study Mode</h3>
                    <Badge className="gradient-primary text-white border-0">
                      Continuous Learning
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
                    Practice questions with immediate feedback. No limits, adaptive learning based
                    on performance.
                  </p>
                  <ul className="text-xs text-foreground/60 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      Unlimited questions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      Immediate explanations
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      Multiple certifications
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      No mastery score impact
                    </li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="quiz" className="mt-0">
                <div className="border-2 border-secondary rounded-xl p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-secondary/10 to-secondary/5 shadow-glow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-foreground text-lg">Quiz Mode</h3>
                    <Badge className="bg-secondary text-white border-0">Graded Assessment</Badge>
                  </div>
                  <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
                    Formal assessment that counts toward your mastery score for certification
                    progress.
                  </p>
                  <ul className="text-xs text-foreground/60 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                      Fixed question count
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                      Updates mastery meter
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                      Single certification focus
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                      Progress tracking
                    </li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="challenge" className="mt-0">
                <div className="border-2 border-orange-500 rounded-xl p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-orange-500/10 to-orange-500/5 shadow-glow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-foreground text-lg">Challenge Mode</h3>
                    <Badge className="bg-orange-500 text-white border-0">Micro-Learning</Badge>
                  </div>
                  <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
                    Short 5-10 minute focused challenges with streak rewards and daily goals.
                  </p>
                  <ul className="text-xs text-foreground/60 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                      Quick 5-7 questions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                      Daily challenges
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                      Streak multipliers
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                      Bonus points
                    </li>
                  </ul>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Category Selection */}
        <div className="mb-6 sm:mb-8">
          <Label className="text-xs sm:text-sm font-bold text-foreground mb-3 sm:mb-4 block uppercase tracking-wider">
            Select Certification{selectedMode === 'quiz' ? ' (Choose One)' : 's'}
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {categories.map((category) => {
              return (
                <div
                  key={category.id}
                  className={`relative border-2 rounded-xl p-3 sm:p-4 lg:p-5 cursor-pointer transition-all duration-300 ${
                    selectedCategories.includes(category.id)
                      ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-glow'
                      : 'border-border hover:border-primary/50 hover:shadow-medium bg-card'
                  }`}
                  onClick={() =>
                    handleCategoryToggle(
                      category.id,
                      !selectedCategories.includes(category.id),
                      category.name
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        <i className={`${category.icon} text-primary text-lg`}></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{category.name}</h3>
                        <p className="text-xs text-foreground/60 mt-0.5">{category.description}</p>
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) =>
                        handleCategoryToggle(category.id, checked as boolean, category.name)
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subcategory Selection */}
        {filteredSubcategories.length > 0 && (
          <div className="mb-8">
            <Label className="text-sm font-bold text-foreground mb-4 block uppercase tracking-wider">
              Focus Areas (Optional)
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto bg-muted/30 rounded-xl p-4 border border-border/50">
              {filteredSubcategories.map((subcategory) => (
                <label
                  key={subcategory.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-background/50 rounded-lg p-3 transition-all duration-200"
                >
                  <Checkbox
                    checked={selectedSubcategories.includes(subcategory.id)}
                    onCheckedChange={(checked) =>
                      handleSubcategoryToggle(subcategory.id, checked as boolean)
                    }
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-sm text-foreground/80 font-medium">{subcategory.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Time Limit */}
        <div className="mb-8">
          <Label className="text-sm font-bold text-foreground mb-4 block uppercase tracking-wider">
            Time Limit (Optional)
          </Label>
          <Select value={timeLimit} onValueChange={setTimeLimit}>
            <SelectTrigger className="w-full border-2 hover:border-primary/50 transition-colors">
              <SelectValue placeholder="Select time limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No limit</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session Information */}
        <div
          className={`mb-8 p-6 rounded-xl border-2 ${
            selectedMode === 'study'
              ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20'
              : 'bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20'
          }`}
        >
          <div className="flex items-center space-x-4 mb-4">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedMode === 'study' ? 'bg-primary/20' : 'bg-secondary/20'
              }`}
            >
              <i
                className={`fas ${selectedMode === 'study' ? 'fa-brain' : 'fa-clipboard-check'} text-2xl ${
                  selectedMode === 'study' ? 'text-primary' : 'text-secondary'
                }`}
              ></i>
            </div>
            <div>
              <h4 className="font-bold text-foreground text-lg">
                {selectedMode === 'study' ? 'Study Session' : 'Quiz Assessment'}
              </h4>
              <p className="text-sm text-foreground/70">
                {selectedMode === 'study'
                  ? 'Practice with unlimited questions and immediate feedback'
                  : 'Formal assessment that contributes to your mastery progress'}
              </p>
            </div>
          </div>
          <div className="bg-background/50 p-4 rounded-lg border border-border/50">
            <ul className="text-sm space-y-2">
              {selectedMode === 'study' ? (
                <>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-primary text-xs"></i>
                    </span>
                    <span className="text-foreground/80">
                      Unlimited questions from selected areas
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-primary text-xs"></i>
                    </span>
                    <span className="text-foreground/80">Immediate feedback with explanations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-primary text-xs"></i>
                    </span>
                    <span className="text-foreground/80">
                      Adaptive difficulty based on performance
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-primary text-xs"></i>
                    </span>
                    <span className="text-foreground/80">
                      No impact on certification mastery scores
                    </span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-secondary text-xs"></i>
                    </span>
                    <span className="text-foreground/80">Fixed assessment with 25 questions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-secondary text-xs"></i>
                    </span>
                    <span className="text-foreground/80">Updates your mastery meter progress</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-secondary text-xs"></i>
                    </span>
                    <span className="text-foreground/80">Tracks performance per sub-area</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-secondary text-xs"></i>
                    </span>
                    <span className="text-foreground/80">
                      Contributes to certification readiness
                    </span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Start Button */}
        <Button
          onClick={handleStartSession}
          disabled={createQuizMutation.isPending || selectedCategories.length === 0}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 shadow-glow ${
            selectedMode === 'study'
              ? 'gradient-primary hover:opacity-90 text-white'
              : 'bg-secondary hover:bg-secondary/90 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {createQuizMutation.isPending ? (
            <div className="flex items-center justify-center space-x-3">
              <LoadingSpinner size="sm" variant="white" />
              <span>Starting {selectedMode === 'study' ? 'Study' : 'Quiz'} Session...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-3">
              <i
                className={`fas ${selectedMode === 'study' ? 'fa-brain' : 'fa-clipboard-check'} text-xl`}
              ></i>
              <span>Start {selectedMode === 'study' ? 'Study' : 'Quiz'} Session</span>
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
