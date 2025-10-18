import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionQuizSizes } from "@/hooks/useSubscriptionQuizSizes";
import { isCategoryAccessible, getRequiredPlan } from "@shared/categoryAccess";
import { Lock, Crown, Star, Sparkles } from "lucide-react";
import type { Category, Subcategory } from "@shared/schema";
import { PremiumFeatureBadge } from "@/components/SubscriptionBadge";

export default function QuizCreator() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const quizSizes = useSubscriptionQuizSizes();
  
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([]);
  const [timeLimit, setTimeLimit] = useState("30");

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['/api/subcategories'],
    enabled: selectedCategories.length > 0,
  });

  const createQuizMutation = useMutation({
    mutationFn: async (quizData: any) => {
      const response = await apiRequest({ method: "POST", endpoint: "/api/quiz", data: quizData });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw errorData;
      }
      
      return response.json();
    },
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
      
      // Show adaptive learning feedback if applicable
      if (quiz.adaptiveInfo && quiz.adaptiveInfo.increasePercentage > 0) {
        toast({
          title: "Adaptive Learning Activated",
          description: `Question count increased by ${quiz.adaptiveInfo.increasePercentage}% based on your performance (${quiz.adaptiveInfo.originalQuestionCount} → ${quiz.adaptiveInfo.adaptedQuestionCount} questions)`,
          variant: "default",
        });
      }
      
      setLocation(`/app/quiz/${quiz.id}`);
    },
    onError: (error: any) => {
      // Handle insufficient credits error
      if (error?.error === "Insufficient credits") {
        toast({
          title: "Insufficient Credits",
          description: error.message || "You don't have enough credits to create a quiz.",
          variant: "destructive",
          action: (
            <Button 
              size="sm" 
              onClick={() => setLocation('/app/credits')}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Buy Credits
            </Button>
          ),
        });
        return;
      }
      
      // Generic error handler
      toast({
        title: "Error",
        description: error?.message || "Failed to create quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCategoryToggle = (categoryId: number, checked: boolean, categoryName: string) => {
    // Get user's subscription access levels
    const subscriptionAccess = quizSizes.subscription?.limits?.categoriesAccess || ['basic'];
    
    // Check if category is accessible
    if (!isCategoryAccessible(categoryName, subscriptionAccess)) {
      // Show upgrade prompt for locked categories
      toast({
        title: "Certification Locked",
        description: `${categoryName} certification requires ${getRequiredPlan(categoryName)} plan. Upgrade to access advanced certifications!`,
        variant: "default",
        action: (
          <Button 
            size="sm" 
            onClick={() => setLocation('/app/subscription/plans')}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <Crown className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        ),
      });
      return;
    }
    
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
      // Remove subcategories from deselected category
      const categorySubcategories = subcategories
        .filter(sub => sub.categoryId === categoryId)
        .map(sub => sub.id);
      setSelectedSubcategories(
        selectedSubcategories.filter(id => !categorySubcategories.includes(id))
      );
    }
  };

  const handleSubcategoryToggle = (subcategoryId: number, checked: boolean) => {
    if (checked) {
      setSelectedSubcategories([...selectedSubcategories, subcategoryId]);
    } else {
      setSelectedSubcategories(selectedSubcategories.filter(id => id !== subcategoryId));
    }
  };



  const handleStartQuiz = () => {
    if (selectedCategories.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one category.",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Error",
        description: "Please log in to create a quiz.",
        variant: "destructive",
      });
      return;
    }

    // Check if user can create more quizzes today
    if (!quizSizes.canCreateQuiz) {
      toast({
        title: "Daily Limit Reached",
        description: `You've reached your daily quiz limit. ${quizSizes.subscription?.plan === 'free' ? 'Upgrade to Pro for unlimited quizzes!' : 'Try again tomorrow.'}`,
        variant: "destructive",
      });
      return;
    }

    const quizData = {
      title: `${categories.filter(c => selectedCategories.includes(c.id)).map(c => c.name).join(", ")} Learning Session`,
      categoryIds: selectedCategories,
      subcategoryIds: selectedSubcategories.length > 0 ? selectedSubcategories : undefined,
      questionCount: quizSizes.studyMode, // Use dynamic study mode size based on subscription
      timeLimit: timeLimit === "0" ? undefined : parseInt(timeLimit),
    };

    createQuizMutation.mutate(quizData);
  };

  const filteredSubcategories = subcategories.filter(sub => 
    selectedCategories.includes(sub.categoryId)
  );

  return (
    <Card className="material-shadow border border-gray-100 overflow-hidden">
      <CardHeader className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-medium text-gray-900 mb-2 flex items-center gap-2">
              Create New Quiz
              {quizSizes.subscription?.plan === 'pro' && (
                <PremiumFeatureBadge requiredPlan="pro" feature="Pro features active" />
              )}
              {quizSizes.subscription?.plan === 'enterprise' && (
                <PremiumFeatureBadge requiredPlan="enterprise" feature="Enterprise features active" />
              )}
            </CardTitle>
            <p className="text-gray-600 text-sm">
              HELEN - Highly Efficient Learning Engine for Next-Gen Certification
            </p>
          </div>
          {quizSizes.subscription?.plan === 'free' && (
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {quizSizes.remainingQuizzes} of {quizSizes.subscription?.limits?.quizzesPerDay} quizzes left today
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Category Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Select Certification Categories
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((category) => {
              const subscriptionAccess = quizSizes.subscription?.limits?.categoriesAccess || ['basic'];
              const isAccessible = isCategoryAccessible(category.name, subscriptionAccess);
              const requiredPlan = !isAccessible ? getRequiredPlan(category.name) : null;
              
              return (
                <div
                  key={category.id}
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all material-shadow-hover ${
                    isAccessible 
                      ? 'border-gray-200 hover:border-primary hover:bg-primary hover:bg-opacity-5' 
                      : 'border-gray-300 bg-gray-50 opacity-75'
                  }`}
                  onClick={() => handleCategoryToggle(category.id, !selectedCategories.includes(category.id), category.name)}
                >
                  {!isAccessible && (
                    <Badge 
                      className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1"
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      {requiredPlan} Plan
                    </Badge>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <i className={`${category.icon} ${isAccessible ? 'text-primary' : 'text-gray-400'}`}></i>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${isAccessible ? 'text-gray-900' : 'text-gray-500'}`}>
                            {category.name}
                          </h3>
                          {!isAccessible && <Lock className="w-4 h-4 text-gray-400" />}
                        </div>
                        <p className="text-xs text-gray-500">{category.description}</p>
                      </div>
                    </div>
                    {isAccessible ? (
                      <Checkbox
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={(checked) => handleCategoryToggle(category.id, checked as boolean, category.name)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="p-2">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subcategory Selection */}
        {filteredSubcategories.length > 0 && (
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Select Subcategories (Optional)
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
              {filteredSubcategories.map((subcategory) => (
                <label
                  key={subcategory.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-white rounded p-2 transition-colors"
                >
                  <Checkbox
                    checked={selectedSubcategories.includes(subcategory.id)}
                    onCheckedChange={(checked) => handleSubcategoryToggle(subcategory.id, checked as boolean)}
                  />
                  <span className="text-sm text-gray-700">{subcategory.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Learning Session Information */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3 mb-3">
            <i className="fas fa-brain text-blue-600"></i>
            <div>
              <h4 className="font-medium text-gray-900">Continuous Learning Session</h4>
              <p className="text-sm text-gray-600">
                Start learning with immediate feedback on your selected areas
              </p>
            </div>
          </div>
          <div className="bg-white p-3 rounded border border-blue-100">
            <ul className="text-sm text-gray-700 space-y-1">
              <li><i className="fas fa-check text-green-500 mr-2"></i>Questions from your selected certifications</li>
              <li><i className="fas fa-check text-green-500 mr-2"></i>Immediate feedback with explanations</li>
              <li><i className="fas fa-check text-green-500 mr-2"></i>Progress tracking across all areas</li>
              <li><i className="fas fa-check text-green-500 mr-2"></i>Mastery score updates in real-time</li>
              <li>
                <i className="fas fa-chart-line text-blue-500 mr-2"></i>
                <span className="font-medium">
                  {quizSizes.isLoading 
                    ? "Loading quiz settings..." 
                    : `${quizSizes.studyMode} questions per session`
                  }
                </span>
                {quizSizes.subscription?.plan && (
                  <span className="text-xs text-gray-500 ml-1">
                    ({quizSizes.subscription.plan.charAt(0).toUpperCase() + quizSizes.subscription.plan.slice(1)} plan)
                  </span>
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* Enhanced Subscription Status Indicator */}
        {quizSizes.remainingQuizzes !== null && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            quizSizes.canCreateQuiz 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
              : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300'
          }`}>
            <div className="flex flex-col gap-3">
              {/* Main Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <i className={`fas ${
                    quizSizes.canCreateQuiz 
                      ? 'fa-check-circle text-green-600' 
                      : 'fa-times-circle text-red-600'
                  } text-xl`}></i>
                  <div>
                    <span className={`font-semibold ${
                      quizSizes.canCreateQuiz 
                        ? 'text-green-700' 
                        : 'text-red-700'
                    }`}>
                      {quizSizes.canCreateQuiz 
                        ? `${quizSizes.remainingQuizzes} of ${quizSizes.subscription?.limits?.quizzesPerDay || 5} quizzes remaining today`
                        : 'Daily quiz limit reached'
                      }
                    </span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      <i className="far fa-clock mr-1"></i>
                      Resets at midnight ({new Date().toLocaleDateString('en-US', { timeZoneName: 'short' }).split(',')[1]?.trim() || 'local time'})
                    </p>
                  </div>
                </div>
                {/* Progress Bar for remaining quizzes */}
                {quizSizes.canCreateQuiz && (
                  <div className="w-32">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(quizSizes.remainingQuizzes / (quizSizes.subscription?.limits?.quizzesPerDay || 5)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Upgrade Prompt for Free Users */}
              {!quizSizes.canCreateQuiz && quizSizes.subscription?.plan === 'free' && (
                <div className="flex items-center justify-between bg-white/70 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-crown text-purple-600"></i>
                    <span className="text-sm font-medium text-gray-700">
                      Upgrade to Pro for unlimited quizzes
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-purple-600 text-white hover:bg-purple-700"
                    onClick={() => setLocation('/app/subscription/plans')}
                  >
                    Upgrade Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}



        {/* Start Learning Button */}
        <Button
          onClick={handleStartQuiz}
          disabled={createQuizMutation.isPending || selectedCategories.length === 0}
          className="w-full bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors material-shadow-hover"
        >
          {createQuizMutation.isPending ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Starting Learning Session...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <i className="fas fa-brain"></i>
              <span>Start Learning Session</span>
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
