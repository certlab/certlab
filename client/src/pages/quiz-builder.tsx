import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { setUserDocument } from '@/lib/firestore-service';
import { queryKeys } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Eye,
  Settings,
  FileQuestion,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react';
import type { Category, Subcategory, Question, QuestionOption } from '@shared/schema';

interface CustomQuestion {
  id: string;
  text: string;
  options: QuestionOption[];
  correctAnswer: number;
  explanation: string;
  difficultyLevel: number;
  type: 'multiple_choice' | 'true_false';
  tags: string[];
}

interface QuizTemplate {
  id?: number;
  userId: string;
  tenantId: number;
  title: string;
  description: string;
  instructions: string;
  categoryIds: number[];
  subcategoryIds: number[];
  customQuestions: CustomQuestion[];
  questionCount: number;
  timeLimit: number | null;
  passingScore: number;
  maxAttempts: number | null;
  difficultyLevel: number;
  isPublished: boolean;
  isDraft: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function QuizBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get template ID from query params if editing
  const searchParams = new URLSearchParams(location.search);
  const templateId = searchParams.get('template');

  // Quiz Configuration State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState(
    'Welcome! Read each question carefully and select the best answer.'
  );
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([]);
  const [timeLimit, setTimeLimit] = useState<string>('30');
  const [passingScore, setPassingScore] = useState<string>('70');
  const [maxAttempts, setMaxAttempts] = useState<string>('0');
  const [difficultyLevel, setDifficultyLevel] = useState<string>('1');
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);

  // Question Editor State
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false'>(
    'multiple_choice'
  );
  const [questionOptions, setQuestionOptions] = useState<QuestionOption[]>([
    { id: 0, text: '' },
    { id: 1, text: '' },
    { id: 2, text: '' },
    { id: 3, text: '' },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [questionDifficulty, setQuestionDifficulty] = useState<string>('1');
  const [questionTags, setQuestionTags] = useState<string>('');

  // UI State
  const [activeTab, setActiveTab] = useState('config');
  const [currentPreviewQuestion, setCurrentPreviewQuestion] = useState(0);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Fetch subcategories
  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: queryKeys.subcategories.all(),
    enabled: selectedCategories.length > 0,
  });

  // Filter subcategories by selected categories
  const filteredSubcategories = subcategories.filter((sub) =>
    selectedCategories.includes(sub.categoryId)
  );

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      if (!user?.id) throw new Error('Not authenticated');

      const template: QuizTemplate = {
        userId: user.id,
        tenantId: user.tenantId || 1,
        title: title || 'Untitled Quiz',
        description,
        instructions,
        categoryIds: selectedCategories,
        subcategoryIds: selectedSubcategories,
        customQuestions,
        questionCount: customQuestions.length,
        timeLimit: timeLimit === '0' ? null : parseInt(timeLimit, 10),
        passingScore: parseInt(passingScore, 10),
        maxAttempts: maxAttempts === '0' ? null : parseInt(maxAttempts, 10),
        difficultyLevel: parseInt(difficultyLevel, 10),
        isPublished: !isDraft,
        isDraft,
      };

      // Store in Firestore as a user document
      const id = Date.now();
      await setUserDocument(user.id, 'quizTemplates', id.toString(), {
        ...template,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id, template };
    },
    onSuccess: ({ id, template }) => {
      toast({
        title: template.isDraft ? 'Draft Saved' : 'Quiz Published',
        description: template.isDraft
          ? 'Your quiz has been saved as a draft.'
          : 'Your quiz is now available for taking!',
      });

      if (!template.isDraft) {
        navigate('/app/dashboard');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save quiz template',
        variant: 'destructive',
      });
    },
  });

  // Create quiz instance from template
  const createQuizFromTemplate = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (customQuestions.length === 0) throw new Error('Please add at least one question');

      // Create a quiz instance that users can take
      const quiz = await storage.createQuiz({
        userId: user.id,
        tenantId: user.tenantId || 1,
        title: title || 'Untitled Quiz',
        categoryIds: selectedCategories,
        subcategoryIds: selectedSubcategories,
        questionCount: customQuestions.length,
        timeLimit: timeLimit === '0' ? undefined : parseInt(timeLimit),
        mode: 'quiz',
      });

      return quiz;
    },
    onSuccess: (quiz) => {
      toast({
        title: 'Quiz Created',
        description: 'Your quiz is ready to take!',
      });
      navigate(`/app/quiz/${quiz.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create quiz',
        variant: 'destructive',
      });
    },
  });

  // Handle category toggle
  const handleCategoryToggle = (categoryId: number, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
      // Remove subcategories of this category
      const categorySubcategoryIds = subcategories
        .filter((sub) => sub.categoryId === categoryId)
        .map((sub) => sub.id);
      setSelectedSubcategories(
        selectedSubcategories.filter((id) => !categorySubcategoryIds.includes(id))
      );
    }
  };

  // Handle subcategory toggle
  const handleSubcategoryToggle = (subcategoryId: number, checked: boolean) => {
    if (checked) {
      setSelectedSubcategories([...selectedSubcategories, subcategoryId]);
    } else {
      setSelectedSubcategories(selectedSubcategories.filter((id) => id !== subcategoryId));
    }
  };

  // Add/Update question
  const saveQuestion = () => {
    if (!questionText.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a question',
        variant: 'destructive',
      });
      return;
    }

    // Validate options based on question type
    const validOptions =
      questionType === 'true_false'
        ? [
            { id: 0, text: 'True' },
            { id: 1, text: 'False' },
          ]
        : questionOptions.filter((opt) => opt.text.trim() !== '');

    if (validOptions.length < 2) {
      toast({
        title: 'Validation Error',
        description: 'Please provide at least 2 options',
        variant: 'destructive',
      });
      return;
    }

    // Validate that the correct answer exists in valid options
    const correctAnswerExists = validOptions.some((opt) => opt.id === correctAnswer);
    if (!correctAnswerExists) {
      toast({
        title: 'Validation Error',
        description: 'Please select a valid correct answer',
        variant: 'destructive',
      });
      return;
    }

    const question: CustomQuestion = {
      id: editingQuestion?.id || crypto.randomUUID(),
      text: questionText,
      type: questionType,
      options: validOptions,
      correctAnswer,
      explanation,
      difficultyLevel: parseInt(questionDifficulty, 10),
      tags: questionTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t),
    };

    if (editingQuestion) {
      setCustomQuestions(customQuestions.map((q) => (q.id === editingQuestion.id ? question : q)));
    } else {
      setCustomQuestions([...customQuestions, question]);
    }

    // Reset form
    resetQuestionForm();
    setActiveTab('questions');
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setQuestionType('multiple_choice');
    setQuestionOptions([
      { id: 0, text: '' },
      { id: 1, text: '' },
      { id: 2, text: '' },
      { id: 3, text: '' },
    ]);
    setCorrectAnswer(0);
    setExplanation('');
    setQuestionDifficulty('1');
    setQuestionTags('');
  };

  const editQuestion = (question: CustomQuestion) => {
    setEditingQuestion(question);
    setQuestionText(question.text);
    setQuestionType(question.type);
    setQuestionOptions(question.options);
    setCorrectAnswer(question.correctAnswer);
    setExplanation(question.explanation);
    setQuestionDifficulty(question.difficultyLevel.toString());
    setQuestionTags(question.tags.join(', '));
    setActiveTab('editor');
  };

  const deleteQuestion = (questionId: string) => {
    const questionIndex = customQuestions.findIndex((q) => q.id === questionId);
    setCustomQuestions(customQuestions.filter((q) => q.id !== questionId));

    // Adjust preview index if needed to keep it within bounds
    if (questionIndex <= currentPreviewQuestion && currentPreviewQuestion > 0) {
      setCurrentPreviewQuestion(currentPreviewQuestion - 1);
    } else if (customQuestions.length - 1 === 0) {
      setCurrentPreviewQuestion(0);
    }

    toast({
      title: 'Question Deleted',
      description: 'The question has been removed from the quiz',
    });
  };

  const addOption = () => {
    const newId = questionOptions.length;
    setQuestionOptions([...questionOptions, { id: newId, text: '' }]);
  };

  const updateOption = (id: number, text: string) => {
    setQuestionOptions(questionOptions.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const removeOption = (id: number) => {
    if (questionOptions.length <= 2) {
      toast({
        title: 'Cannot Remove',
        description: 'A question must have at least 2 options',
        variant: 'destructive',
      });
      return;
    }

    // If removing the correct answer, reset it to the first remaining option
    if (correctAnswer === id) {
      const remainingOptions = questionOptions.filter((opt) => opt.id !== id);
      if (remainingOptions.length > 0) {
        setCorrectAnswer(remainingOptions[0].id);
      }
    }

    setQuestionOptions(questionOptions.filter((opt) => opt.id !== id));
  };

  // Validate before saving
  const validateQuiz = (): boolean => {
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a quiz title',
        variant: 'destructive',
      });
      return false;
    }

    if (selectedCategories.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one category',
        variant: 'destructive',
      });
      return false;
    }

    if (customQuestions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one question',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSaveDraft = () => {
    if (validateQuiz()) {
      saveTemplateMutation.mutate(true);
    }
  };

  const handlePublish = () => {
    if (validateQuiz()) {
      saveTemplateMutation.mutate(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Quiz Builder</h1>
              <p className="text-muted-foreground">Create custom quizzes with your own questions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saveTemplateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={handlePublish}
              disabled={saveTemplateMutation.isPending || customQuestions.length === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Publish Quiz
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="questions">
              <FileQuestion className="h-4 w-4 mr-2" />
              Questions ({customQuestions.length})
            </TabsTrigger>
            <TabsTrigger value="editor">
              <Edit2 className="h-4 w-4 mr-2" />
              Question Editor
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Define the title, description, and instructions for your quiz
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter quiz title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of what this quiz covers"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Instructions for quiz takers"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categories & Topics</CardTitle>
                <CardDescription>
                  Select the categories and subcategories this quiz covers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-3 block">Categories *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                      >
                        <Checkbox
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={(checked) =>
                            handleCategoryToggle(category.id, checked as boolean)
                          }
                        />
                        <div>
                          <div className="font-medium">{category.name}</div>
                          {category.description && (
                            <div className="text-xs text-muted-foreground">
                              {category.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {filteredSubcategories.length > 0 && (
                  <div>
                    <Label className="mb-3 block">Subcategories (Optional)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {filteredSubcategories.map((subcategory) => (
                        <label
                          key={subcategory.id}
                          className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-accent text-sm"
                        >
                          <Checkbox
                            checked={selectedSubcategories.includes(subcategory.id)}
                            onCheckedChange={(checked) =>
                              handleSubcategoryToggle(subcategory.id, checked as boolean)
                            }
                          />
                          <span>{subcategory.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quiz Settings</CardTitle>
                <CardDescription>
                  Configure time limits, difficulty, and grading criteria
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                  <Select value={timeLimit} onValueChange={setTimeLimit}>
                    <SelectTrigger id="timeLimit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No Limit</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="passingScore">Passing Score (%)</Label>
                  <Select value={passingScore} onValueChange={setPassingScore}>
                    <SelectTrigger id="passingScore">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">60%</SelectItem>
                      <SelectItem value="70">70%</SelectItem>
                      <SelectItem value="75">75%</SelectItem>
                      <SelectItem value="80">80%</SelectItem>
                      <SelectItem value="85">85%</SelectItem>
                      <SelectItem value="90">90%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxAttempts">Maximum Attempts</Label>
                  <Select value={maxAttempts} onValueChange={setMaxAttempts}>
                    <SelectTrigger id="maxAttempts">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Unlimited</SelectItem>
                      <SelectItem value="1">1 attempt</SelectItem>
                      <SelectItem value="2">2 attempts</SelectItem>
                      <SelectItem value="3">3 attempts</SelectItem>
                      <SelectItem value="5">5 attempts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="difficultyLevel">Difficulty Level</Label>
                  <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                    <SelectTrigger id="difficultyLevel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Beginner</SelectItem>
                      <SelectItem value="2">2 - Intermediate</SelectItem>
                      <SelectItem value="3">3 - Advanced</SelectItem>
                      <SelectItem value="4">4 - Expert</SelectItem>
                      <SelectItem value="5">5 - Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions List Tab */}
          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quiz Questions</CardTitle>
                    <CardDescription>Manage the questions in your quiz</CardDescription>
                  </div>
                  <Button onClick={() => setActiveTab('editor')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customQuestions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No questions added yet</p>
                    <p className="text-sm">Click "Add Question" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customQuestions.map((question, index) => (
                      <div
                        key={question.id}
                        className="border rounded-lg p-4 hover:border-primary transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Q{index + 1}</Badge>
                              <Badge variant="secondary">
                                {question.type === 'multiple_choice'
                                  ? 'Multiple Choice'
                                  : 'True/False'}
                              </Badge>
                              <Badge variant="outline">
                                Difficulty: {question.difficultyLevel}
                              </Badge>
                            </div>
                            <p className="font-medium text-foreground mb-2">{question.text}</p>
                            <div className="space-y-1">
                              {question.options.map((option, optIndex) => (
                                <div
                                  key={option.id}
                                  className={`text-sm ${
                                    option.id === question.correctAnswer
                                      ? 'text-green-600 font-medium'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option.text}
                                  {option.id === question.correctAnswer && ' ✓'}
                                </div>
                              ))}
                            </div>
                            {question.explanation && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                Explanation: {question.explanation}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editQuestion(question)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteQuestion(question.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Question Editor Tab */}
          <TabsContent value="editor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</CardTitle>
                <CardDescription>Create or edit a question for your quiz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="questionType">Question Type</Label>
                  <Select
                    value={questionType}
                    onValueChange={(value: any) => setQuestionType(value)}
                  >
                    <SelectTrigger id="questionType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="questionText">Question Text *</Label>
                  <Textarea
                    id="questionText"
                    placeholder="Enter your question"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    rows={3}
                  />
                </div>

                {questionType === 'multiple_choice' ? (
                  <div>
                    <Label>Answer Options *</Label>
                    <div className="space-y-2 mt-2">
                      {questionOptions.map((option, index) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <span className="text-sm font-medium w-6">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option.text}
                            onChange={(e) => updateOption(option.id, e.target.value)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => setCorrectAnswer(option.id)}
                            className={correctAnswer === option.id ? 'bg-green-100' : ''}
                          >
                            {correctAnswer === option.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                          {questionOptions.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => removeOption(option.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {questionOptions.length < 10 && (
                        <Button variant="outline" size="sm" onClick={addOption}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Click the checkmark to set the correct answer
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label>Correct Answer *</Label>
                    <Select
                      value={correctAnswer.toString()}
                      onValueChange={(value) => setCorrectAnswer(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">True</SelectItem>
                        <SelectItem value="1">False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="explanation">Explanation</Label>
                  <Textarea
                    id="explanation"
                    placeholder="Explain why this answer is correct"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="questionDifficulty">Difficulty</Label>
                    <Select value={questionDifficulty} onValueChange={setQuestionDifficulty}>
                      <SelectTrigger id="questionDifficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Easy</SelectItem>
                        <SelectItem value="2">2 - Medium</SelectItem>
                        <SelectItem value="3">3 - Hard</SelectItem>
                        <SelectItem value="4">4 - Very Hard</SelectItem>
                        <SelectItem value="5">5 - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="questionTags">Tags (comma-separated)</Label>
                    <Input
                      id="questionTags"
                      placeholder="security, authentication, oauth"
                      value={questionTags}
                      onChange={(e) => setQuestionTags(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={saveQuestion}>
                    <Check className="h-4 w-4 mr-2" />
                    {editingQuestion ? 'Update Question' : 'Add Question'}
                  </Button>
                  <Button variant="outline" onClick={resetQuestionForm}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{title || 'Untitled Quiz'}</CardTitle>
                    <CardDescription>{description || 'No description provided'}</CardDescription>
                  </div>
                  <Badge>{customQuestions.length} Questions</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {customQuestions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No questions to preview</p>
                    <p className="text-sm">Add questions to see the preview</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-accent p-4 rounded-lg">
                      <p className="text-sm font-medium mb-2">Instructions:</p>
                      <p className="text-sm text-muted-foreground">{instructions}</p>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <span className="font-medium">Time Limit:</span>{' '}
                          {timeLimit === '0' ? 'No Limit' : `${timeLimit} minutes`}
                        </div>
                        <div>
                          <span className="font-medium">Passing Score:</span> {passingScore}%
                        </div>
                        <div>
                          <span className="font-medium">Max Attempts:</span>{' '}
                          {maxAttempts === '0' ? 'Unlimited' : maxAttempts}
                        </div>
                        <div>
                          <span className="font-medium">Difficulty:</span> Level {difficultyLevel}
                        </div>
                      </div>
                    </div>

                    {/* Question Preview */}
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">
                          Question {currentPreviewQuestion + 1} of {customQuestions.length}
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPreviewQuestion(Math.max(0, currentPreviewQuestion - 1))
                            }
                            disabled={currentPreviewQuestion === 0}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPreviewQuestion(
                                Math.min(customQuestions.length - 1, currentPreviewQuestion + 1)
                              )
                            }
                            disabled={currentPreviewQuestion === customQuestions.length - 1}
                          >
                            Next
                          </Button>
                        </div>
                      </div>

                      {customQuestions[currentPreviewQuestion] && (
                        <div className="space-y-4">
                          <p className="text-lg font-medium">
                            {customQuestions[currentPreviewQuestion].text}
                          </p>
                          <div className="space-y-2">
                            {customQuestions[currentPreviewQuestion].options.map(
                              (option, index) => (
                                <div
                                  key={option.id}
                                  className={`border rounded-lg p-3 ${
                                    option.id ===
                                    customQuestions[currentPreviewQuestion].correctAnswer
                                      ? 'border-green-500 bg-green-50'
                                      : ''
                                  }`}
                                >
                                  <span className="font-medium mr-2">
                                    {String.fromCharCode(65 + index)}.
                                  </span>
                                  {option.text}
                                  {option.id ===
                                    customQuestions[currentPreviewQuestion].correctAnswer && (
                                    <Badge variant="default" className="ml-2">
                                      Correct
                                    </Badge>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                          {customQuestions[currentPreviewQuestion].explanation && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                              <p className="font-medium text-sm mb-2">Explanation:</p>
                              <p className="text-sm">
                                {customQuestions[currentPreviewQuestion].explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
