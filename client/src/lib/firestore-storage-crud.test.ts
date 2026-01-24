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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { firestoreStorage } from './firestore-storage';
import * as firestoreService from './firestore-service';
import type { User, Quiz, Question, Category, Subcategory, UserProgress } from '@shared/schema';

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

describe('FirestoreStorage - User Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const newUser: Partial<User> = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };

      const mockCreatedUser: User = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: null,
        role: 'user',
        selectedTitle: null,
        createdAt: null,
        lastSeen: null,
        tenantId: null,
        photoURL: null,
      };

      vi.mocked(firestoreService.setUserProfile).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserProfile).mockResolvedValue(mockCreatedUser);

      const result = await firestoreStorage.createUser(newUser);

      expect(result).toEqual(mockCreatedUser);
      expect(firestoreService.setUserProfile).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com',
        })
      );
    });

    it('should generate an ID if not provided', async () => {
      const newUser: Partial<User> = {
        username: 'testuser',
        email: 'test@example.com',
      };

      vi.mocked(firestoreService.setUserProfile).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserProfile).mockResolvedValue({
        id: 'generated-id',
        username: 'testuser',
        email: 'test@example.com',
      } as User);

      const result = await firestoreStorage.createUser(newUser);

      expect(result.id).toBeTruthy();
      expect(firestoreService.setUserProfile).toHaveBeenCalled();
    });

    it('should handle errors during user creation', async () => {
      const newUser: Partial<User> = {
        username: 'testuser',
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
        username: 'updateduser',
        displayName: 'Updated User',
      };

      const mockUpdatedUser: User = {
        id: userId,
        username: 'updateduser',
        displayName: 'Updated User',
        email: 'test@example.com',
        role: 'user',
        selectedTitle: null,
        createdAt: null,
        lastSeen: null,
        tenantId: null,
        photoURL: null,
      };

      vi.mocked(firestoreService.updateUserProfile).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserProfile).mockResolvedValue(mockUpdatedUser);

      const result = await firestoreStorage.updateUser(userId, updates);

      expect(result).toEqual(mockUpdatedUser);
      expect(firestoreService.updateUserProfile).toHaveBeenCalledWith(userId, updates);
    });

    it('should return null if user does not exist', async () => {
      const userId = 'nonexistent';
      const updates: Partial<User> = { username: 'test' };

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
        username: 'testuser',
        email: 'test@example.com',
        displayName: null,
        role: 'user',
        selectedTitle: null,
        createdAt: null,
        lastSeen: null,
        tenantId: null,
        photoURL: null,
      };

      vi.mocked(firestoreService.getUserProfile).mockResolvedValue(mockUser);

      const result = await firestoreStorage.getUser(userId);

      expect(result).toEqual(mockUser);
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
        name: 'Test Quiz',
        categoryIds: [1, 2],
        mode: 'practice',
      };

      const mockCreatedQuiz: Quiz = {
        id: 1,
        userId: 'user123',
        name: 'Test Quiz',
        categoryIds: [1, 2],
        mode: 'practice',
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        score: null,
        totalQuestions: 0,
        correctAnswers: 0,
        createdAt: null,
        completedAt: null,
        timeSpent: null,
        flaggedQuestions: [],
        passed: null,
        version: 1,
      };

      vi.mocked(firestoreService.setUserSubcollectionDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserSubcollectionDocument).mockResolvedValue(mockCreatedQuiz);

      const result = await firestoreStorage.createQuiz(newQuiz);

      expect(result).toEqual(mockCreatedQuiz);
      expect(firestoreService.setUserSubcollectionDocument).toHaveBeenCalledWith(
        'user123',
        'quizzes',
        expect.any(String),
        expect.objectContaining({
          name: 'Test Quiz',
          categoryIds: [1, 2],
        })
      );
    });

    it('should throw error if user ID is not set', async () => {
      vi.spyOn(firestoreStorage, 'getCurrentUserId').mockResolvedValue(null);

      const newQuiz: Partial<Quiz> = {
        name: 'Test Quiz',
      };

      await expect(firestoreStorage.createQuiz(newQuiz)).rejects.toThrow('User ID required');
    });

    it('should generate a numeric ID for the quiz', async () => {
      const newQuiz: Partial<Quiz> = {
        userId: 'user123',
        name: 'Test Quiz',
      };

      vi.mocked(firestoreService.setUserSubcollectionDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserSubcollectionDocument).mockResolvedValue({
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
          name: 'Quiz 1',
          categoryIds: [1],
          mode: 'practice',
          questions: [],
          currentQuestionIndex: 0,
          answers: {},
          score: null,
          totalQuestions: 0,
          correctAnswers: 0,
          createdAt: null,
          completedAt: null,
          timeSpent: null,
          flaggedQuestions: [],
          passed: null,
          version: 1,
        },
        {
          id: 2,
          userId,
          name: 'Quiz 2',
          categoryIds: [2],
          mode: 'exam',
          questions: [],
          currentQuestionIndex: 0,
          answers: {},
          score: null,
          totalQuestions: 0,
          correctAnswers: 0,
          createdAt: null,
          completedAt: null,
          timeSpent: null,
          flaggedQuestions: [],
          passed: null,
          version: 1,
        },
      ];

      vi.mocked(firestoreService.getUserSubcollectionDocuments).mockResolvedValue(mockQuizzes);

      const result = await firestoreStorage.getUserQuizzes(userId);

      expect(result).toEqual(mockQuizzes);
      expect(firestoreService.getUserSubcollectionDocuments).toHaveBeenCalledWith(
        userId,
        'quizzes'
      );
    });

    it('should return empty array if user has no quizzes', async () => {
      const userId = 'user123';

      vi.mocked(firestoreService.getUserSubcollectionDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getUserQuizzes(userId);

      expect(result).toEqual([]);
    });
  });

  describe('updateQuiz', () => {
    it('should update an existing quiz', async () => {
      const quizId = 1;
      const updates: Partial<Quiz> = {
        name: 'Updated Quiz',
        score: 85,
        completedAt: new Date(),
      };

      const mockUpdatedQuiz: Quiz = {
        id: quizId,
        userId: 'user123',
        name: 'Updated Quiz',
        categoryIds: [1],
        mode: 'practice',
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        createdAt: null,
        completedAt: updates.completedAt,
        timeSpent: null,
        flaggedQuestions: [],
        passed: true,
        version: 1,
      };

      vi.mocked(firestoreService.updateUserDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserSubcollectionDocument).mockResolvedValue(mockUpdatedQuiz);

      const result = await firestoreStorage.updateQuiz(quizId, updates);

      expect(result).toEqual(mockUpdatedQuiz);
    });

    it('should return null if quiz does not exist', async () => {
      const quizId = 999;
      const updates: Partial<Quiz> = { name: 'Updated' };

      vi.mocked(firestoreService.updateUserDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserSubcollectionDocument).mockResolvedValue(null);

      const result = await firestoreStorage.updateQuiz(quizId, updates);

      expect(result).toBeNull();
    });
  });

  describe('deleteQuiz', () => {
    it('should delete a quiz', async () => {
      const quizId = 1;

      vi.mocked(firestoreService.deleteUserDocument).mockResolvedValue(undefined);

      await firestoreStorage.deleteQuiz(quizId);

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
        question: 'What is 2+2?',
        options: [
          { id: 1, text: '3', isCorrect: false },
          { id: 2, text: '4', isCorrect: true },
        ],
        categoryId: 1,
        subcategoryId: 1,
        difficulty: 1,
      };

      const mockCreatedQuestion: Question = {
        id: 1,
        question: 'What is 2+2?',
        options: [
          { id: 1, text: '3', isCorrect: false },
          { id: 2, text: '4', isCorrect: true },
        ],
        categoryId: 1,
        subcategoryId: 1,
        difficulty: 1,
        explanation: null,
        tags: null,
        createdAt: null,
        updatedAt: null,
        tenantId: null,
        isPersonal: false,
        userId: null,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockCreatedQuestion);

      const result = await firestoreStorage.createQuestion(newQuestion);

      expect(result).toEqual(mockCreatedQuestion);
      expect(firestoreService.setSharedDocument).toHaveBeenCalled();
    });

    it('should validate question data before creation', async () => {
      const invalidQuestion: Partial<Question> = {
        question: 'Invalid question',
        options: [{ id: 1, text: 'Only one option', isCorrect: true }], // Need at least 2
      };

      await expect(firestoreStorage.createQuestion(invalidQuestion)).rejects.toThrow();
    });

    it('should sanitize question text', async () => {
      const { sanitizeInput } = await import('./sanitize');

      const newQuestion: Partial<Question> = {
        question: '<script>alert("xss")</script>What is this?',
        options: [
          { id: 1, text: 'A', isCorrect: false },
          { id: 2, text: 'B', isCorrect: true },
        ],
        categoryId: 1,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue({
        id: 1,
        ...newQuestion,
      } as Question);

      await firestoreStorage.createQuestion(newQuestion);

      expect(sanitizeInput).toHaveBeenCalledWith(newQuestion.question);
    });
  });

  describe('getQuestionsByCategories', () => {
    it('should retrieve questions by category IDs', async () => {
      const categoryIds = [1, 2];
      const mockQuestions: Question[] = [
        {
          id: 1,
          question: 'Question 1',
          options: [],
          categoryId: 1,
          subcategoryId: null,
          difficulty: 1,
          explanation: null,
          tags: null,
          createdAt: null,
          updatedAt: null,
          tenantId: null,
          isPersonal: false,
          userId: null,
        },
        {
          id: 2,
          question: 'Question 2',
          options: [],
          categoryId: 2,
          subcategoryId: null,
          difficulty: 2,
          explanation: null,
          tags: null,
          createdAt: null,
          updatedAt: null,
          tenantId: null,
          isPersonal: false,
          userId: null,
        },
      ];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockQuestions);

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);

      expect(result).toEqual(mockQuestions);
    });

    it('should filter by subcategory IDs if provided', async () => {
      const categoryIds = [1];
      const subcategoryIds = [10];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(categoryIds, {
        subcategoryIds,
      });

      expect(firestoreService.getSharedDocuments).toHaveBeenCalled();
    });

    it('should filter by difficulty levels if provided', async () => {
      const categoryIds = [1];
      const difficultyLevels = [1, 2];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(categoryIds, {
        difficultyLevels,
      });

      expect(firestoreService.getSharedDocuments).toHaveBeenCalled();
    });
  });

  describe('updateQuestion', () => {
    it('should update an existing question', async () => {
      const questionId = 1;
      const updates: Partial<Question> = {
        question: 'Updated question?',
        difficulty: 2,
      };

      const mockUpdatedQuestion: Question = {
        id: questionId,
        question: 'Updated question?',
        options: [],
        categoryId: 1,
        subcategoryId: null,
        difficulty: 2,
        explanation: null,
        tags: null,
        createdAt: null,
        updatedAt: null,
        tenantId: null,
        isPersonal: false,
        userId: null,
      };

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockUpdatedQuestion);
      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);

      const result = await firestoreStorage.updateQuestion(questionId, updates);

      expect(result).toEqual(mockUpdatedQuestion);
    });

    it('should throw error if question does not exist', async () => {
      const questionId = 999;
      const updates: Partial<Question> = { difficulty: 2 };

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(null);

      await expect(firestoreStorage.updateQuestion(questionId, updates)).rejects.toThrow(
        'Question not found'
      );
    });
  });

  describe('deleteQuestion', () => {
    it('should delete a question', async () => {
      const questionId = 1;

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue({
        id: questionId,
      } as Question);

      const deleteDocMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(firestoreService.getFirestoreInstance).mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            delete: deleteDocMock,
          }),
        }),
      } as any);

      await firestoreStorage.deleteQuestion(questionId);

      // Verify the question was looked up or deleted
      expect(firestoreService.getSharedDocument).toHaveBeenCalled();
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
        tenantId: null,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockCreatedCategory);

      const result = await firestoreStorage.createCategory(newCategory);

      expect(result).toEqual(mockCreatedCategory);
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
        { id: 1, name: 'Category 1', description: null, tenantId: null },
        { id: 2, name: 'Category 2', description: null, tenantId: null },
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
        tenantId: null,
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
    it('should delete a category', async () => {
      const categoryId = 1;

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue({
        id: categoryId,
      } as Category);

      const deleteDocMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(firestoreService.getFirestoreInstance).mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            delete: deleteDocMock,
          }),
        }),
      } as any);

      await firestoreStorage.deleteCategory(categoryId);

      expect(firestoreService.getSharedDocument).toHaveBeenCalled();
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
        tenantId: null,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockCreatedSubcategory);

      const result = await firestoreStorage.createSubcategory(newSubcategory);

      expect(result).toEqual(mockCreatedSubcategory);
    });
  });

  describe('getSubcategories', () => {
    it('should retrieve all subcategories', async () => {
      const mockSubcategories: Subcategory[] = [
        { id: 1, name: 'Subcategory 1', categoryId: 1, description: null, tenantId: null },
        { id: 2, name: 'Subcategory 2', categoryId: 1, description: null, tenantId: null },
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
        tenantId: null,
      };

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue(mockUpdatedSubcategory);
      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);

      const result = await firestoreStorage.updateSubcategory(subcategoryId, updates);

      expect(result).toEqual(mockUpdatedSubcategory);
    });
  });

  describe('deleteSubcategory', () => {
    it('should delete a subcategory', async () => {
      const subcategoryId = 1;

      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue({
        id: subcategoryId,
      } as Subcategory);

      const deleteDocMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(firestoreService.getFirestoreInstance).mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            delete: deleteDocMock,
          }),
        }),
      } as any);

      await firestoreStorage.deleteSubcategory(subcategoryId);

      expect(firestoreService.getSharedDocument).toHaveBeenCalled();
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

    await expect(firestoreStorage.getCategories()).rejects.toThrow('Network error');

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
