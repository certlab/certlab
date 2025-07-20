import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { localStorage } from "@/lib/localStorage";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Category, Subcategory } from "@shared/schema";

type LearningMode = "study" | "quiz";

export default function LearningModeSelector() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = localStorage.getCurrentUser();
  
  const [selectedMode, setSelectedMode] = useState<LearningMode>("study");
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
      return response.json();
    },
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Show adaptive learning feedback if applicable
      if (quiz.adaptiveInfo && quiz.adaptiveInfo.increasePercentage > 0) {
        toast({
          title: "Adaptive Learning Activated",
          description: `Question count increased by ${quiz.adaptiveInfo.increasePercentage}% based on your performance (${quiz.adaptiveInfo.originalQuestionCount} → ${quiz.adaptiveInfo.adaptedQuestionCount} questions)`,
          variant: "default",
        });
      }
      
      setLocation(`/quiz/${quiz.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCategoryToggle = (categoryId: number, checked: boolean) => {
    if (selectedMode === "quiz" && checked && selectedCategories.length > 0) {
      // For quiz mode, only allow one category at a time
      setSelectedCategories([categoryId]);
      // Clear subcategories when switching categories
      setSelectedSubcategories([]);
    } else if (checked) {
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

  const handleModeChange = (mode: LearningMode) => {
    setSelectedMode(mode);
    if (mode === "quiz" && selectedCategories.length > 1) {
      // For quiz mode, keep only the first selected category
      setSelectedCategories([selectedCategories[0]]);
      // Clear subcategories that don't belong to the kept category
      const keptCategorySubcategories = subcategories
        .filter(sub => sub.categoryId === selectedCategories[0])
        .map(sub => sub.id);
      setSelectedSubcategories(
        selectedSubcategories.filter(id => keptCategorySubcategories.includes(id))
      );
    }
  };

  const handleStartSession = () => {
    if (selectedCategories.length === 0) {
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

    const selectedCertNames = categories
      .filter(c => selectedCategories.includes(c.id))
      .map(c => c.name)
      .join(", ");

    const quizData = {
      title: selectedMode === "study" 
        ? `${selectedCertNames} Study Session`
        : `${selectedCertNames} Quiz`,
      categoryIds: selectedCategories,
      subcategoryIds: selectedSubcategories.length > 0 ? selectedSubcategories : undefined,
      questionCount: selectedMode === "study" ? 10 : 25, // Study: continuous, Quiz: fixed assessment
      timeLimit: timeLimit === "0" ? undefined : parseInt(timeLimit),
      mode: selectedMode,
      userId: currentUser.id,
    };

    createQuizMutation.mutate(quizData);
  };

  const filteredSubcategories = subcategories.filter(sub => 
    selectedCategories.includes(sub.categoryId)
  );

  return (
    <Card className="material-shadow border border-gray-100 overflow-hidden">
      <CardHeader className="p-6 border-b border-gray-100">
        <CardTitle className="text-xl font-medium text-gray-900 mb-2">
          Choose Your Learning Mode
        </CardTitle>
        <p className="text-gray-600 text-sm">
          HELEN - Highly Efficient Learning Engine for Next-Gen Certification
        </p>
      </CardHeader>

      <CardContent className="p-6">
        {/* Mode Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Learning Mode
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedMode === "study"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => handleModeChange("study")}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Study Mode</h3>
                <Badge variant={selectedMode === "study" ? "default" : "secondary"}>
                  Continuous Learning
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Practice questions with immediate feedback. No limits, adaptive learning based on performance.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Unlimited questions</li>
                <li>• Immediate explanations</li>
                <li>• Multiple certifications</li>
                <li>• No mastery score impact</li>
              </ul>
            </div>

            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedMode === "quiz"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-green-300"
              }`}
              onClick={() => handleModeChange("quiz")}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Quiz Mode</h3>
                <Badge variant={selectedMode === "quiz" ? "default" : "secondary"}>
                  Graded Assessment
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Formal assessment that counts toward your mastery score for certification progress.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Fixed question count</li>
                <li>• Updates mastery meter</li>
                <li>• Single certification focus</li>
                <li>• Progress tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-foreground mb-3 block">
            Select Certification{selectedMode === "quiz" ? " (Choose One)" : "s"}
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all material-shadow-hover ${
                  selectedCategories.includes(category.id)
                    ? "border-primary bg-primary bg-opacity-5"
                    : "border-border hover:border-primary"
                }`}
                onClick={() => handleCategoryToggle(category.id, !selectedCategories.includes(category.id))}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <i className={`${category.icon} text-primary`}></i>
                    <div>
                      <h3 className="font-medium text-foreground">{category.name}</h3>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <Checkbox
                    checked={selectedCategories.includes(category.id)}
                    onChange={(checked) => handleCategoryToggle(category.id, checked)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subcategory Selection */}
        {filteredSubcategories.length > 0 && (
          <div className="mb-6">
            <Label className="text-sm font-medium text-foreground mb-3 block">
              Focus Areas (Optional)
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto bg-muted rounded-lg p-3">
              {filteredSubcategories.map((subcategory) => (
                <label
                  key={subcategory.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-background rounded p-2 transition-colors"
                >
                  <Checkbox
                    checked={selectedSubcategories.includes(subcategory.id)}
                    onCheckedChange={(checked) => handleSubcategoryToggle(subcategory.id, checked as boolean)}
                  />
                  <span className="text-sm text-foreground">{subcategory.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Time Limit */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-foreground mb-3 block">
            Time Limit (Optional)
          </Label>
          <Select value={timeLimit} onValueChange={setTimeLimit}>
            <SelectTrigger className="w-full">
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
        <div className={`mb-6 p-4 rounded-lg border ${
          selectedMode === "study" 
            ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
            : "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
        }`}>
          <div className="flex items-center space-x-3 mb-3">
            <i className={`fas ${selectedMode === "study" ? "fa-brain text-blue-600" : "fa-clipboard-check text-green-600"}`}></i>
            <div>
              <h4 className="font-medium text-foreground">
                {selectedMode === "study" ? "Study Session" : "Quiz Assessment"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {selectedMode === "study" 
                  ? "Practice with unlimited questions and immediate feedback"
                  : "Formal assessment that contributes to your mastery progress"
                }
              </p>
            </div>
          </div>
          <div className="bg-background p-3 rounded border border-border">
            <ul className="text-sm text-foreground space-y-1">
              {selectedMode === "study" ? (
                <>
                  <li><i className="fas fa-check text-green-500 mr-2"></i>Unlimited questions from selected areas</li>
                  <li><i className="fas fa-check text-green-500 mr-2"></i>Immediate feedback with explanations</li>
                  <li><i className="fas fa-check text-green-500 mr-2"></i>Adaptive difficulty based on performance</li>
                  <li><i className="fas fa-check text-green-500 mr-2"></i>No impact on certification mastery scores</li>
                </>
              ) : (
                <>
                  <li><i className="fas fa-check text-green-500 mr-2"></i>Fixed assessment with 25 questions</li>
                  <li><i className="fas fa-check text-green-500 mr-2"></i>Updates your mastery meter progress</li>
                  <li><i className="fas fa-check text-green-500 mr-2"></i>Tracks performance per sub-area</li>
                  <li><i className="fas fa-check text-green-500 mr-2"></i>Contributes to certification readiness</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Start Button */}
        <Button
          onClick={handleStartSession}
          disabled={createQuizMutation.isPending || selectedCategories.length === 0}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-colors material-shadow-hover ${
            selectedMode === "study"
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {createQuizMutation.isPending ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Starting {selectedMode === "study" ? "Study" : "Quiz"} Session...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <i className={`fas ${selectedMode === "study" ? "fa-brain" : "fa-clipboard-check"}`}></i>
              <span>Start {selectedMode === "study" ? "Study" : "Quiz"} Session</span>
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}