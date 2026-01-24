/**
 * Comprehensive CRUD Tests for Firestore Storage
 *
 * Tests all core CRUD operations in firestore-storage.ts including:
 * - User operations
 * - Quiz operations
 * - Question operations
 * - Category and Subcategory operations
 * - Progress tracking
 * - Error handling and edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firestoreStorage } from './firestore-storage';
import * as firestoreService from './firestore-service';
import type { User, Quiz, Question, Category, Subcategory } from '@shared/schema';

// Mock the firestore-service module
vi.mock('./firestore-service', () => ({
  getFirestoreInstance: vi.fn(),
  getUserDocument: vi.fn(),
  getUserDocuments: vi.fn(),
  setUserDocument: vi.fn(),
  updateUserDocument: vi.fn(),
  deleteUserDocument: vi.fn(),
  getUserSubcollectionDocument: vi.fn(),
  getUserSubcollectionDocuments: vi.fn(),
  setUserSubcollectionDocument: vi.fn(),
  getSharedDocument: vi.fn(),
  getSharedDocuments: vi.fn(),
  setSharedDocument: vi.fn(),
  getUserProfile: vi.fn(),
  setUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  Timestamp: class MockTimestamp {
    constructor(
      public seconds: number,
      public nanoseconds: number
    ) {}
    toDate() {
      return new Date(this.seconds * 1000);
    }
  },
  timestampToDate: vi.fn((ts: any) => {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    return ts;
  }),
  where: vi.fn((field, op, value) => ({ field, op, value, _type: 'where' })),
  orderBy: vi.fn((field, direction) => ({ field, direction, _type: 'orderBy' })),
}));

// Mock errors module
vi.mock('./errors', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  isFirestorePermissionError: vi.fn().mockReturnValue(false),
}));

// Mock sanitize module
vi.mock('./sanitize', () => ({
  sanitizeInput: vi.fn((input) => input),
  sanitizeArray: vi.fn((arr) => arr),
}));

/**
 * Helper to create a valid Question mock with all required fields
 */
function createMockQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 1,
    text: 'What is 2+2? This is a test question with enough characters.',
    questionType: 'multiple_choice_single',
    options: [
      { id: 0, text: '3' },
      { id: 1, text: '4' },
    ],
    correctAnswer: 1,
    correctAnswers: null,
    acceptedAnswers: null,
    matchingPairs: null,
    orderingItems: null,
    requiresManualGrading: false,
    categoryId: 1,
    subcategoryId: 1,
    tenantId: 1,
    difficultyLevel: 1,
    explanation: null,
    explanationSteps: null,
    tags: null,
    referenceLinks: null,
    videoUrl: null,
    communityExplanations: null,
    explanationVotes: 0,
    hasAlternativeViews: false,
    ...overrides,
  } as Question;
}

describe('FirestoreStorage - User Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const newUser: Partial<User> = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      };

      const mockCreatedUser: User = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: '',
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        role: 'user',
        tenantId: 1,
        certificationGoals: [],
        studyPreferences: null,
        skillsAssessment: null,
        polarCustomerId: null,
        tokenBalance: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(firestoreService.setUserProfile).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserProfile).mockResolvedValue(mockCreatedUser);

      const result = await firestoreStorage.createUser(newUser);

      expect(result.id).toBe('user123');
      expect(result.email).toBe('test@example.com');
      expect(firestoreService.setUserProfile).toHaveBeenCalled();
    });

    it('should generate an ID if not provided', async () => {
      const newUser: Partial<User> = {
        email: 'test@example.com',
      };

      vi.mocked(firestoreService.setUserProfile).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserProfile).mockResolvedValue({
        id: 'generated-id',
        email: 'test@example.com',
        role: 'user',
        tenantId: 1,
      } as User);

      const result = await firestoreStorage.createUser(newUser);

      expect(result.id).toBeTruthy();
      expect(firestoreService.setUserProfile).toHaveBeenCalled();
    });

    it('should handle errors during user creation', async () => {
      const newUser: Partial<User> = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      };

      vi.mocked(firestoreService.setUserProfile).mockRejectedValue(new Error('Permission denied'));

      await expect(firestoreStorage.createUser(newUser)).rejects.toThrow('Permission denied');
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', async () => {
      const userId = 'user123';
      const updates: Partial<User> = {
        firstName: 'Updated',
        lastName: 'User',
      };

      const mockUpdatedUser: User = {
        id: userId,
        firstName: 'Updated',
        lastName: 'User',
        email: 'test@example.com',
        role: 'user',
        tenantId: 1,
      } as User;

      vi.mocked(firestoreService.updateUserProfile).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserProfile).mockResolvedValue(mockUpdatedUser);

      const result = await firestoreStorage.updateUser(userId, updates);

      expect(result?.id).toBe(userId);
      expect(result?.firstName).toBe('Updated');
      expect(firestoreService.updateUserProfile).toHaveBeenCalledWith(userId, updates);
    });

    it('should return null if user does not exist', async () => {
      const userId = 'nonexistent';
      const updates: Partial<User> = { firstName: 'test' };

      vi.mocked(firestoreService.updateUserProfile).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserProfile).mockResolvedValue(null);

      const result = await firestoreStorage.updateUser(userId, updates);

      expect(result).toBeNull();
    });
  });

  describe('getUser', () => {
    it('should retrieve a user by ID', async () => {
      const userId = 'user123';
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        role: 'user',
        tenantId: 1,
      } as User;

      vi.mocked(firestoreService.getUserProfile).mockResolvedValue(mockUser);

      const result = await firestoreStorage.getUser(userId);

      expect(result?.id).toBe(userId);
      expect(result?.email).toBe('test@example.com');
      expect(firestoreService.getUserProfile).toHaveBeenCalledWith(userId);
    });

    it('should return undefined if user does not exist', async () => {
      const userId = 'nonexistent';

      vi.mocked(firestoreService.getUserProfile).mockResolvedValue(null);

      const result = await firestoreStorage.getUser(userId);

      expect(result).toBeUndefined();
    });

    it('should handle permission errors silently', async () => {
      const userId = 'user123';

      const { isFirestorePermissionError } = await import('./errors');
      vi.mocked(isFirestorePermissionError).mockReturnValue(true);
      vi.mocked(firestoreService.getUserProfile).mockRejectedValue(new Error('Permission denied'));

      const result = await firestoreStorage.getUser(userId);

      expect(result).toBeUndefined();
    });
  });
});

describe('FirestoreStorage - Quiz Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set a current user ID for quiz operations
    vi.spyOn(firestoreStorage, 'getCurrentUserId').mockResolvedValue('user123');
  });

  describe('createQuiz', () => {
    it('should create a new quiz with valid data', async () => {
      const newQuiz: Partial<Quiz> = {
        userId: 'user123',
        title: 'Test Quiz',
        categoryIds: [1, 2],
        subcategoryIds: [],
        questionCount: 10,
        mode: 'practice',
      };

      const mockCreatedQuiz: Quiz = {
        id: 1,
        userId: 'user123',
        title: 'Test Quiz',
        categoryIds: [1, 2],
        subcategoryIds: [],
        questionCount: 10,
        mode: 'practice',
        answers: null,
        score: null,
        totalQuestions: null,
        correctAnswers: null,
        startedAt: null,
        completedAt: null,
        tenantId: 1,
        description: null,
        tags: null,
        questionIds: null,
        timeLimit: null,
        isAdaptive: false,
        adaptiveMetrics: null,
        difficultyLevel: 1,
        difficultyFilter: null,
        isPassing: false,
        missedTopics: null,
        author: null,
        authorName: null,
        prerequisites: null,
        createdAt: null,
        updatedAt: null,
      } as Quiz;

      vi.mocked(firestoreService.setUserDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserDocument).mockResolvedValue(mockCreatedQuiz);

      const result = await firestoreStorage.createQuiz(newQuiz);

      expect(result.title).toBe('Test Quiz');
      expect(result.userId).toBe('user123');
      expect(result.categoryIds).toEqual([1, 2]);
      expect(firestoreService.setUserDocument).toHaveBeenCalledWith(
        'user123',
        'quizzes',
        expect.any(String),
        expect.objectContaining({
          title: 'Test Quiz',
          categoryIds: [1, 2],
        })
      );
    });

    it('should throw error if user ID is not set', async () => {
      vi.spyOn(firestoreStorage, 'getCurrentUserId').mockResolvedValue(null);

      const newQuiz: Partial<Quiz> = {
        title: 'Test Quiz',
      };

      await expect(firestoreStorage.createQuiz(newQuiz)).rejects.toThrow('User ID required');
    });

    it('should generate a numeric ID for the quiz', async () => {
      const newQuiz: Partial<Quiz> = {
        userId: 'user123',
        title: 'Test Quiz',
      };

      vi.mocked(firestoreService.setUserDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserDocument).mockResolvedValue({
        id: 12345,
        ...newQuiz,
      } as Quiz);

      const result = await firestoreStorage.createQuiz(newQuiz);

      expect(typeof result.id).toBe('number');
      expect(result.id).toBeGreaterThan(0);
    });
  });

  describe('getUserQuizzes', () => {
    it('should retrieve all quizzes for a user', async () => {
      const userId = 'user123';
      const mockQuizzes: Quiz[] = [
        {
          id: 1,
          userId,
          title: 'Quiz 1',
          categoryIds: [1],
          subcategoryIds: [],
          questionCount: 10,
          mode: 'practice',
        } as Quiz,
        {
          id: 2,
          userId,
          title: 'Quiz 2',
          categoryIds: [2],
          subcategoryIds: [],
          questionCount: 10,
          mode: 'exam',
        } as Quiz,
      ];

      vi.mocked(firestoreService.getUserDocuments).mockResolvedValue(mockQuizzes);

      const result = await firestoreStorage.getUserQuizzes(userId, 1);

      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Quiz 1');
      expect(result[1].title).toBe('Quiz 2');
      expect(firestoreService.getUserDocuments).toHaveBeenCalled();
    });

    it('should return empty array if user has no quizzes', async () => {
      const userId = 'user123';

      vi.mocked(firestoreService.getUserDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getUserQuizzes(userId, 1);

      expect(result).toEqual([]);
    });
  });

  describe('updateQuiz', () => {
    it('should update an existing quiz', async () => {
      const quizId = 1;
      const userId = 'user123';

      firestoreStorage.setCurrentUserId(userId);

      const updates: Partial<Quiz> = {
        title: 'Updated Quiz',
        score: 85,
        completedAt: new Date(),
      };

      const mockUpdatedQuiz = {
        id: quizId,
        userId,
        title: 'Updated Quiz',
        score: 85,
      } as Quiz;

      vi.mocked(firestoreService.updateUserDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserDocument).mockResolvedValue(mockUpdatedQuiz);

      const result = await firestoreStorage.updateQuiz(quizId, updates);

      expect(result?.title).toBe('Updated Quiz');
      expect(result?.score).toBe(85);
    });

    it('should throw if quiz does not exist', async () => {
      const quizId = 999;
      const userId = 'user123';

      firestoreStorage.setCurrentUserId(userId);

      const updates: Partial<Quiz> = { title: 'Updated' };

      vi.mocked(firestoreService.updateUserDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserDocument).mockResolvedValue(null);

      await expect(firestoreStorage.updateQuiz(quizId, updates)).rejects.toThrow(
        'Quiz not found after update'
      );
    });
  });

  describe('deleteQuizTemplate', () => {
    it('should delete a quiz template', async () => {
      const templateId = 1;
      const userId = 'user123';

      // Mock getQuizTemplate which is called first to verify existence
      vi.mocked(firestoreService.getUserDocument).mockResolvedValue({
        id: templateId,
        userId,
      } as any);
      vi.mocked(firestoreService.deleteUserDocument).mockResolvedValue(undefined);

      await firestoreStorage.deleteQuizTemplate(templateId, userId);

      expect(firestoreService.deleteUserDocument).toHaveBeenCalled();
    });
  });
});

describe('FirestoreStorage - Question Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createQuestion', () => {
    it('should create a new question with valid data', async () => {
      const newQuestion: Partial<Question> = {
        text: 'What is 2+2? This is a test question with enough characters.',
        options: [
          { id: 0, text: '3' },
          { id: 1, text: '4' },
        ],
        correctAnswer: 1,
        categoryId: 1,
        subcategoryId: 1,
        difficultyLevel: 1,
      };

      const mockCreatedQuestion = createMockQuestion({
        id: 1,
        text: 'What is 2+2? This is a test question with enough characters.',
        options: [
          { id: 0, text: '3' },
          { id: 1, text: '4' },
        ],
        correctAnswer: 1,
        categoryId: 1,
        subcategoryId: 1,
        tenantId: 1,
      });

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockCreatedQuestion);

      const result = await firestoreStorage.createQuestion(newQuestion);

      expect(result.text).toBe(newQuestion.text);
      expect(firestoreService.setSharedDocument).toHaveBeenCalled();
    });

    it('should validate question data before creation', async () => {
      const invalidQuestion: Partial<Question> = {
        text: 'Short', // Too short - need at least 10 characters
        options: [{ id: 0, text: 'Only one option' }], // Need at least 2
      };

      await expect(firestoreStorage.createQuestion(invalidQuestion)).rejects.toThrow(
        /at least 10 characters|too short|minimum length/i
      );
    });

    it('should sanitize question text', async () => {
      const { sanitizeInput } = await import('./sanitize');

      const newQuestion: Partial<Question> = {
        text: '<script>alert("xss")</script>What is this? A proper question with length.',
        options: [
          { id: 0, text: 'A' },
          { id: 1, text: 'B' },
        ],
        correctAnswer: 1,
        categoryId: 1,
        subcategoryId: 1,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(
        createMockQuestion({
          id: 1,
          text: newQuestion.text,
          options: newQuestion.options,
          correctAnswer: newQuestion.correctAnswer,
          categoryId: newQuestion.categoryId,
          subcategoryId: newQuestion.subcategoryId,
        })
      );

      await firestoreStorage.createQuestion(newQuestion);

      expect(sanitizeInput).toHaveBeenCalledWith(newQuestion.text, expect.any(Number));
    });
  });

  describe('getQuestionsByCategories', () => {
    it('should retrieve questions by category IDs', async () => {
      const categoryIds = [1, 2];
      const mockQuestions: Question[] = [
        createMockQuestion({
          id: 1,
          text: 'Question 1',
          categoryId: 1,
          subcategoryId: 1,
          tenantId: 1,
        }),
        createMockQuestion({
          id: 2,
          text: 'Question 2',
          categoryId: 2,
          subcategoryId: 2,
          difficultyLevel: 2,
          tenantId: 1,
        }),
      ];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockQuestions);

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);

      expect(result).toEqual(mockQuestions);
    });

    it('should filter by subcategory IDs if provided', async () => {
      const categoryIds = [1];
      const subcategoryIds = [10];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(categoryIds, subcategoryIds);

      expect(firestoreService.getSharedDocuments).toHaveBeenCalled();
    });

    it('should filter by difficulty levels if provided', async () => {
      const categoryIds = [1];
      const difficultyLevels = [1, 2];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(categoryIds, undefined, difficultyLevels);

      expect(firestoreService.getSharedDocuments).toHaveBeenCalled();
    });
  });

  describe('updateQuestion', () => {
    it('should update an existing question', async () => {
      const questionId = 1;
      const updates: Partial<Question> = {
        text: 'Updated question with proper length for validation?',
        difficultyLevel: 2,
      };

      const mockUpdatedQuestion = createMockQuestion({
        id: questionId,
        text: 'Updated question with proper length for validation?',
        difficultyLevel: 2,
        tenantId: 1,
        subcategoryId: 1,
      });

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockUpdatedQuestion);
      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);

      const result = await firestoreStorage.updateQuestion(questionId, updates);

      expect(result.text).toBe(updates.text);
      expect(result.difficultyLevel).toBe(2);
    });

    it('should throw error if question does not exist', async () => {
      const questionId = 999;
      const updates: Partial<Question> = { difficultyLevel: 2 };

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(null);

      await expect(firestoreStorage.updateQuestion(questionId, updates)).rejects.toThrow(
        'Question not found'
      );
    });
  });

  describe('deleteQuestion', () => {
    it('should have deleteQuestion method available', async () => {
      // The deleteQuestion method uses dynamic import and calls deleteDoc
      // Testing this requires mocking the firebase/firestore module which is complex
      // For now, we test that the method exists and has the correct signature
      expect(typeof firestoreStorage.deleteQuestion).toBe('function');

      // Note: Full integration tests should verify deletion works end-to-end
      // This is a placeholder test until proper firebase/firestore mocking is implemented
    });
  });
});

describe('FirestoreStorage - Category Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create a new category with valid data', async () => {
      const newCategory: Partial<Category> = {
        name: 'Test Category',
        description: 'A test category',
      };

      const mockCreatedCategory: Category = {
        id: 1,
        name: 'Test Category',
        description: 'A test category',
        tenantId: 1,
        icon: null,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockCreatedCategory);

      const result = await firestoreStorage.createCategory(newCategory);

      expect(result.name).toBe('Test Category');
      expect(result.description).toBe('A test category');
    });

    it('should validate category data before creation', async () => {
      const invalidCategory: Partial<Category> = {
        name: '', // Empty name should fail validation
      };

      await expect(firestoreStorage.createCategory(invalidCategory)).rejects.toThrow();
    });
  });

  describe('getCategories', () => {
    it('should retrieve all categories', async () => {
      const mockCategories: Category[] = [
        { id: 1, name: 'Category 1', description: null, tenantId: 1, icon: null },
        { id: 2, name: 'Category 2', description: null, tenantId: 1, icon: null },
      ];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockCategories);

      const result = await firestoreStorage.getCategories();

      expect(result).toEqual(mockCategories);
    });

    it('should filter by tenant ID if provided', async () => {
      const tenantId = 1;

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getCategories(tenantId);

      expect(firestoreService.getSharedDocuments).toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    it('should update an existing category', async () => {
      const categoryId = 1;
      const updates: Partial<Category> = {
        name: 'Updated Category',
        description: 'Updated description',
      };

      const mockUpdatedCategory: Category = {
        id: categoryId,
        name: 'Updated Category',
        description: 'Updated description',
        tenantId: 1,
        icon: null,
      };

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockUpdatedCategory);
      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);

      const result = await firestoreStorage.updateCategory(categoryId, updates);

      expect(result).toEqual(mockUpdatedCategory);
    });

    it('should throw error if category does not exist', async () => {
      const categoryId = 999;
      const updates: Partial<Category> = { name: 'Updated' };

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(null);

      await expect(firestoreStorage.updateCategory(categoryId, updates)).rejects.toThrow(
        'Category not found'
      );
    });
  });

  describe('deleteCategory', () => {
    it('should have deleteCategory method available', async () => {
      // The deleteCategory method uses dynamic import and calls deleteDoc
      // Testing this requires mocking the firebase/firestore module which is complex
      // For now, we test that the method exists and has the correct signature
      expect(typeof firestoreStorage.deleteCategory).toBe('function');

      // Note: Full integration tests should verify deletion works end-to-end
      // This is a placeholder test until proper firebase/firestore mocking is implemented
    });
  });
});

describe('FirestoreStorage - Subcategory Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSubcategory', () => {
    it('should create a new subcategory', async () => {
      const newSubcategory: Partial<Subcategory> = {
        name: 'Test Subcategory',
        categoryId: 1,
      };

      const mockCreatedSubcategory: Subcategory = {
        id: 1,
        name: 'Test Subcategory',
        categoryId: 1,
        description: null,
        tenantId: 1,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockCreatedSubcategory);

      const result = await firestoreStorage.createSubcategory(newSubcategory);

      expect(result.name).toBe('Test Subcategory');
      expect(result.categoryId).toBe(1);
    });
  });

  describe('getSubcategories', () => {
    it('should retrieve all subcategories', async () => {
      const mockSubcategories: Subcategory[] = [
        { id: 1, name: 'Subcategory 1', categoryId: 1, description: null, tenantId: 1 },
        { id: 2, name: 'Subcategory 2', categoryId: 1, description: null, tenantId: 1 },
      ];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockSubcategories);

      const result = await firestoreStorage.getSubcategories();

      expect(result).toEqual(mockSubcategories);
    });

    it('should filter by category ID if provided', async () => {
      const categoryId = 1;

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getSubcategories(categoryId);

      expect(firestoreService.getSharedDocuments).toHaveBeenCalled();
    });
  });

  describe('updateSubcategory', () => {
    it('should update an existing subcategory', async () => {
      const subcategoryId = 1;
      const updates: Partial<Subcategory> = {
        name: 'Updated Subcategory',
      };

      const mockUpdatedSubcategory: Subcategory = {
        id: subcategoryId,
        name: 'Updated Subcategory',
        categoryId: 1,
        description: null,
        tenantId: 1,
      };

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockUpdatedSubcategory);
      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);

      const result = await firestoreStorage.updateSubcategory(subcategoryId, updates);

      expect(result).toEqual(mockUpdatedSubcategory);
    });
  });

  describe('deleteSubcategory', () => {
    it('should have deleteSubcategory method available', async () => {
      // The deleteSubcategory method uses dynamic import and calls deleteDoc
      // Testing this requires mocking the firebase/firestore module which is complex
      // For now, we test that the method exists and has the correct signature
      expect(typeof firestoreStorage.deleteSubcategory).toBe('function');

      // Note: Full integration tests should verify deletion works end-to-end
      // This is a placeholder test until proper firebase/firestore mocking is implemented
    });
  });
});

describe('FirestoreStorage - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log errors when operations fail', async () => {
    const { logError } = await import('./errors');

    vi.mocked(firestoreService.getSharedDocuments).mockRejectedValue(new Error('Network error'));

    const result = await firestoreStorage.getCategories();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
    expect(logError).toHaveBeenCalledWith('getCategories', expect.any(Error), expect.any(Object));
  });

  it('should handle permission errors gracefully', async () => {
    const { isFirestorePermissionError } = await import('./errors');

    vi.mocked(isFirestorePermissionError).mockReturnValue(true);
    vi.mocked(firestoreService.getUserProfile).mockRejectedValue(new Error('Permission denied'));

    const result = await firestoreStorage.getUser('user123');

    // Should not throw, just return undefined
    expect(result).toBeUndefined();
  });
});
