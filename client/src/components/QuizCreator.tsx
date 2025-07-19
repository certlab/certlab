import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { localStorage } from "@/lib/localStorage";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Category, Subcategory } from "@shared/schema";

export default function QuizCreator() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = localStorage.getCurrentUser();
  
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([]);
  const [questionCount, setQuestionCount] = useState("20");
  const [timeLimit, setTimeLimit] = useState("30");
  const [isAdaptive, setIsAdaptive] = useState(false);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['/api/subcategories'],
    enabled: selectedCategories.length > 0,
  });

  const createQuizMutation = useMutation({
    mutationFn: async (quizData: any) => {
      const endpoint = isAdaptive ? "/api/quiz/adaptive" : "/api/quiz";
      const response = await apiRequest({ method: "POST", endpoint, data: quizData });
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
        description: "Failed to create quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCategoryToggle = (categoryId: number, checked: boolean) => {
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

    const quizData = {
      title: `${categories.filter(c => selectedCategories.includes(c.id)).map(c => c.name).join(", ")} Quiz`,
      categoryIds: selectedCategories,
      subcategoryIds: selectedSubcategories.length > 0 ? selectedSubcategories : undefined,
      questionCount: parseInt(questionCount),
      timeLimit: timeLimit === "0" ? undefined : parseInt(timeLimit),
      userId: currentUser.id,
      isAdaptive: isAdaptive,
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
          Create New Quiz
        </CardTitle>
        <p className="text-gray-600 text-sm">
          Select categories and start practicing for your security certifications
        </p>
      </CardHeader>

      <CardContent className="p-6">
        {/* Category Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Select Certification Categories
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary hover:bg-primary hover:bg-opacity-5 cursor-pointer transition-all material-shadow-hover"
                onClick={() => handleCategoryToggle(category.id, !selectedCategories.includes(category.id))}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <i className={`${category.icon} text-primary`}></i>
                    <div>
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                      <p className="text-xs text-gray-500">{category.description}</p>
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

        {/* Quiz Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Number of Questions
            </Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="20">20 Questions</SelectItem>
                <SelectItem value="30">30 Questions</SelectItem>
                <SelectItem value="50">50 Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Time Limit
            </Label>
            <Select value={timeLimit} onValueChange={setTimeLimit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="0">No time limit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Adaptive Learning Toggle */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <i className="fas fa-brain text-blue-600"></i>
              <div>
                <h4 className="font-medium text-gray-900">Adaptive Learning</h4>
                <p className="text-sm text-gray-600">
                  Automatically increases question count when you get answers wrong
                </p>
              </div>
            </div>
            <Checkbox
              checked={isAdaptive}
              onCheckedChange={setIsAdaptive}
            />
          </div>
          {isAdaptive && (
            <div className="mt-3 p-3 bg-white rounded border border-blue-100">
              <p className="text-xs text-gray-700">
                <i className="fas fa-info-circle text-blue-500 mr-2"></i>
                When enabled, the system analyzes your performance and may add up to 100% more questions to areas where you're struggling.
              </p>
            </div>
          )}
        </div>

        {/* Start Quiz Button */}
        <Button
          onClick={handleStartQuiz}
          disabled={createQuizMutation.isPending || selectedCategories.length === 0}
          className="w-full bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors material-shadow-hover"
        >
          {createQuizMutation.isPending ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Creating Quiz...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <i className="fas fa-play"></i>
              <span>Start Quiz</span>
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
