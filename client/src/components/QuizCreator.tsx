import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '@/lib/auth-provider';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useToast } from '@/hooks/use-toast';
import { InsufficientTokensDialog } from '@/components/InsufficientTokensDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Sparkles } from 'lucide-react';
import type { Category, Subcategory } from '@shared/schema';

export default function QuizCreator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([]);
  const [timeLimit, setTimeLimit] = useState('30');
  const [showInsufficientTokensDialog, setShowInsufficientTokensDialog] = useState(false);

  interface QuizCreationData {
    title: string;
    categoryIds: number[];
    subcategoryIds?: number[];
    questionCount: number;
    timeLimit?: number;
  }

  const [pendingQuizData, setPendingQuizData] = useState<QuizCreationData | null>(null);
  const [requiredTokens, setRequiredTokens] = useState(0);
  const [currentTokenBalance, setCurrentTokenBalance] = useState(0);

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
        // Get current balance and show dialog
        const balance = await clientStorage.getUserTokenBalance(currentUser.id);
        setCurrentTokenBalance(balance);
        setRequiredTokens(tokenCost);
        setPendingQuizData(quizData);
        setShowInsufficientTokensDialog(true);
        throw new Error('INSUFFICIENT_TOKENS'); // Special error to handle differently
      }

      // Create the quiz
      const quiz = await clientStorage.createQuiz({
        userId: currentUser.id,
        ...quizData,
      });

      return { quiz, tokenResult, tokenCost };
    },
    onSuccess: async ({ quiz, tokenResult, tokenCost }) => {
      // Optimistically update the token balance cache to prevent race condition
      queryClient.setQueryData(queryKeys.user.tokenBalance(currentUser?.id), {
        balance: tokenResult.newBalance,
      });

      // Invalidate user queries to sync the user object
      // Note: We do NOT invalidate tokenBalance query here to avoid race condition
      // where the refetch might return stale Firestore data before update propagates
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });

      toast({
        title: 'Quiz Created',
        description: `Used ${tokenCost} tokens. New balance: ${tokenResult.newBalance}`,
      });

      navigate(`/app/quiz/${quiz.id}`);
    },
    onError: (error: any) => {
      // Don't show error toast for insufficient tokens - dialog handles it
      if (error?.message === 'INSUFFICIENT_TOKENS') {
        return;
      }

      toast({
        title: 'Error',
        description: error?.message || 'Failed to create quiz. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCategoryToggle = (categoryId: number, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
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

  const handleStartQuiz = () => {
    if (selectedCategories.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one category.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'Please log in to create a quiz.',
        variant: 'destructive',
      });
      return;
    }

    const quizData = {
      title: `${categories
        .filter((c) => selectedCategories.includes(c.id))
        .map((c) => c.name)
        .join(', ')} Learning Session`,
      categoryIds: selectedCategories,
      subcategoryIds: selectedSubcategories.length > 0 ? selectedSubcategories : undefined,
      questionCount: 15,
      timeLimit: timeLimit === '0' ? undefined : parseInt(timeLimit),
    };

    createQuizMutation.mutate(quizData);
  };

  const handleTokensAdded = () => {
    // Retry the quiz creation after tokens are added
    if (pendingQuizData) {
      createQuizMutation.mutate(pendingQuizData);
      setPendingQuizData(null);
    }
  };

  const filteredSubcategories = subcategories.filter((sub) =>
    selectedCategories.includes(sub.categoryId)
  );

  return (
    <Card className="material-shadow border border-gray-100 overflow-hidden">
      <CardHeader className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-medium text-foreground mb-2 flex items-center gap-2">
              Create New Quiz
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              HELEN - Highly Efficient Learning Engine for Next-Gen Certification
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Select Certification Categories
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="relative border rounded-lg p-4 cursor-pointer transition-all material-shadow-hover border-gray-200 hover:border-primary hover:bg-primary hover:bg-opacity-5"
                onClick={() =>
                  handleCategoryToggle(category.id, !selectedCategories.includes(category.id))
                }
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
                    onCheckedChange={(checked) =>
                      handleCategoryToggle(category.id, checked as boolean)
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

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
                    onCheckedChange={(checked) =>
                      handleSubcategoryToggle(subcategory.id, checked as boolean)
                    }
                  />
                  <span className="text-sm text-gray-700">{subcategory.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Time Limit (minutes)
          </Label>
          <Select value={timeLimit} onValueChange={setTimeLimit}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select time limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No Time Limit</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">60 minutes</SelectItem>
              <SelectItem value="90">90 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-3 mb-3">
            <i className="fas fa-brain text-blue-600 dark:text-blue-400"></i>
            <div>
              <h4 className="font-medium text-foreground">Continuous Learning Session</h4>
              <p className="text-sm text-muted-foreground">
                Start learning with immediate feedback on your selected areas
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-blue-100 dark:border-blue-800">
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>
                <i className="fas fa-check text-green-500 dark:text-green-400 mr-2"></i>Questions
                from your selected certifications
              </li>
              <li>
                <i className="fas fa-check text-green-500 dark:text-green-400 mr-2"></i>Immediate
                feedback with explanations
              </li>
              <li>
                <i className="fas fa-check text-green-500 dark:text-green-400 mr-2"></i>Progress
                tracking across all areas
              </li>
              <li>
                <i className="fas fa-check text-green-500 dark:text-green-400 mr-2"></i>Mastery
                score updates in real-time
              </li>
              <li>
                <i className="fas fa-chart-line text-blue-500 dark:text-blue-400 mr-2"></i>
                <span className="font-medium">15 questions per session</span>
              </li>
            </ul>
          </div>
        </div>

        <Button
          onClick={handleStartQuiz}
          disabled={createQuizMutation.isPending || selectedCategories.length === 0}
          className="w-full bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors material-shadow-hover"
        >
          {createQuizMutation.isPending ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner size="sm" variant="white" />
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

      <InsufficientTokensDialog
        open={showInsufficientTokensDialog}
        onOpenChange={setShowInsufficientTokensDialog}
        requiredTokens={requiredTokens}
        currentBalance={currentTokenBalance}
        onTokensAdded={handleTokensAdded}
      />
    </Card>
  );
}
