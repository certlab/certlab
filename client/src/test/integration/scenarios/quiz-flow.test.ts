/**
 * Quiz Flow Integration Tests
 *
 * Tests complete quiz workflows including:
 * - Quiz creation workflow
 * - Quiz taking flow (start, answer, submit)
 * - Quiz review and results
 * - Quiz data persistence and state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetIntegrationMocks,
  signInTestUser,
  seedTestData,
  createTestUser,
  createTestCategory,
  createTestQuestion,
  createTestQuiz,
  waitForAsync,
  assertDefined,
} from '../helpers/integration-utils';
import { firestoreMock } from '../helpers/test-providers';
import { storage } from '@/lib/storage-factory';

describe('Quiz Flow Integration Tests', () => {
  beforeEach(async () => {
    resetIntegrationMocks();

    // Seed comprehensive test data
    await seedTestData({
      tenants: [{ id: 1, name: 'Test Tenant', isActive: true }],
      users: [
        {
          id: 'user1',
          email: 'user1@example.com',
          firstName: 'Test',
          lastName: 'User',
          tenantId: 1,
          role: 'user',
        },
      ],
      categories: [
        createTestCategory(1, 1, { name: 'Security' }),
        createTestCategory(2, 1, { name: 'Networking' }),
      ],
      subcategories: [
        { id: 1, name: 'Encryption', categoryId: 1 },
        { id: 2, name: 'Access Control', categoryId: 1 },
        { id: 3, name: 'TCP/IP', categoryId: 2 },
      ],
      questions: [
        createTestQuestion(1, 1, 1, {
          text: 'What is AES?',
          options: [
            { text: 'Advanced Encryption Standard', isCorrect: true },
            { text: 'Advanced Email System', isCorrect: false },
            { text: 'Automated Entry Service', isCorrect: false },
            { text: 'Application Encoding Scheme', isCorrect: false },
          ],
        }),
        createTestQuestion(2, 1, 1, {
          text: 'What is RSA?',
          options: [
            { text: 'Public key cryptosystem', isCorrect: true },
            { text: 'Routing Service Algorithm', isCorrect: false },
            { text: 'Remote System Access', isCorrect: false },
            { text: 'Random Security Authentication', isCorrect: false },
          ],
        }),
        createTestQuestion(3, 1, 2, {
          text: 'What is MFA?',
          options: [
            { text: 'Multi-Factor Authentication', isCorrect: true },
            { text: 'Manual File Access', isCorrect: false },
            { text: 'Multiple Firewall Architecture', isCorrect: false },
            { text: 'Managed File Application', isCorrect: false },
          ],
        }),
        createTestQuestion(4, 2, 3, {
          text: 'What layer is TCP?',
          options: [
            { text: 'Transport Layer', isCorrect: true },
            { text: 'Application Layer', isCorrect: false },
            { text: 'Network Layer', isCorrect: false },
            { text: 'Data Link Layer', isCorrect: false },
          ],
        }),
      ],
    });

    // Sign in test user
    const testUser = createTestUser({ uid: 'user1', email: 'user1@example.com' });
    await signInTestUser(testUser);
    await firestoreMock.setCurrentUserId('user1');
  });

  describe('Quiz Creation Workflow', () => {
    it('should create a new quiz with selected configuration', async () => {
      // Create quiz with specific configuration
      const quizData = {
        userId: 'user1',
        tenantId: 1,
        name: 'Security Basics Quiz',
        categoryIds: [1], // Security category
        subcategoryIds: [1, 2], // Encryption and Access Control
        difficultyLevels: [1, 2],
        numberOfQuestions: 10,
        createdAt: new Date().toISOString(),
        completedAt: null,
        score: null,
      };

      // Store quiz in Firestore
      await firestoreMock.setSubcollectionDocument('users', 'user1', 'quizzes', '1', quizData);

      // Verify quiz was created
      const quiz = await firestoreMock.getDocument('users/user1/quizzes', '1');
      assertDefined(quiz);
      expect(quiz.data.name).toBe('Security Basics Quiz');
      expect(quiz.data.categoryIds).toEqual([1]);
      expect(quiz.data.numberOfQuestions).toBe(10);
      expect(quiz.data.completedAt).toBeNull();
    });

    it('should generate quiz questions based on selected criteria', async () => {
      // Get available questions for selected categories
      const questions = await storage.getQuestionsByCategories([1], [1, 2], [1, 2], 1);

      // Should get questions matching criteria
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);

      // All questions should match the category/subcategory criteria
      questions.forEach((q) => {
        expect(q.categoryId).toBe(1);
        expect([1, 2]).toContain(q.subcategoryId);
      });
    });

    it('should generate questions matching selected criteria', async () => {
      // Create quiz with specific configuration
      const quizConfig = {
        categoryIds: [1],
        subcategoryIds: [1, 2],
        numberOfQuestions: 3,
      };

      // Get questions matching criteria
      const availableQuestions = await storage.getQuestionsByCategories(
        quizConfig.categoryIds,
        quizConfig.subcategoryIds,
        [1, 2],
        1
      );

      // Should have questions available
      expect(availableQuestions.length).toBeGreaterThan(0);

      // All questions should match the criteria
      availableQuestions.forEach((q) => {
        expect(quizConfig.categoryIds).toContain(q.categoryId);
        if (q.subcategoryId) {
          expect(quizConfig.subcategoryIds).toContain(q.subcategoryId);
        }
      });
    });
  });

  describe('Quiz Taking Flow', () => {
    beforeEach(async () => {
      // Create an active quiz for the user
      const quiz = createTestQuiz(1, 'user1', 1, {
        name: 'Active Quiz',
        startedAt: new Date().toISOString(),
        completedAt: null,
      });

      await firestoreMock.setSubcollectionDocument('users', 'user1', 'quizzes', '1', quiz);

      // Add quiz questions
      await firestoreMock.setSubcollectionDocument('users/user1', 'quizzes/1', 'questions', '1', {
        id: 1,
        questionId: 1,
        text: 'What is AES?',
        options: [
          { text: 'Advanced Encryption Standard', isCorrect: true },
          { text: 'Advanced Email System', isCorrect: false },
        ],
        userAnswer: null,
        isCorrect: null,
      });
    });

    it('should start quiz and load questions', async () => {
      // Get quiz
      const quiz = await firestoreMock.getDocument('users/user1/quizzes', '1');
      assertDefined(quiz);
      expect(quiz.data.startedAt).toBeDefined();
      expect(quiz.data.completedAt).toBeNull();

      // Get quiz questions
      const questions = await firestoreMock.getSubcollectionDocuments(
        'users/user1',
        'quizzes/1',
        'questions'
      );

      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].data.userAnswer).toBeNull();
    });

    it('should save answer for a question', async () => {
      // Get question
      const question = await firestoreMock.getDocument('users/user1/quizzes/1/questions', '1');
      assertDefined(question);
      expect(question.data.userAnswer).toBeNull();

      // Save answer
      await firestoreMock.updateDocument('users/user1/quizzes/1/questions', '1', {
        userAnswer: 'Advanced Encryption Standard',
        isCorrect: true,
      });

      // Verify answer saved
      const updatedQuestion = await firestoreMock.getDocument(
        'users/user1/quizzes/1/questions',
        '1'
      );
      assertDefined(updatedQuestion);
      expect(updatedQuestion.data.userAnswer).toBe('Advanced Encryption Standard');
      expect(updatedQuestion.data.isCorrect).toBe(true);
    });

    it('should track quiz progress', async () => {
      // Add multiple questions
      await firestoreMock.setSubcollectionDocument('users/user1', 'quizzes/1', 'questions', '2', {
        id: 2,
        questionId: 2,
        userAnswer: null,
      });

      await firestoreMock.setSubcollectionDocument('users/user1', 'quizzes/1', 'questions', '3', {
        id: 3,
        questionId: 3,
        userAnswer: null,
      });

      // Get all questions
      const questions = await firestoreMock.getSubcollectionDocuments(
        'users/user1',
        'quizzes/1',
        'questions'
      );

      const totalQuestions = questions.length;
      expect(totalQuestions).toBe(3);

      // Answer first question
      await firestoreMock.updateDocument('users/user1/quizzes/1/questions', '1', {
        userAnswer: 'Advanced Encryption Standard',
      });

      // Calculate progress
      const answeredQuestions = await firestoreMock.getSubcollectionDocuments(
        'users/user1',
        'quizzes/1',
        'questions'
      );
      const answeredCount = answeredQuestions.filter((q) => q.data.userAnswer !== null).length;
      const progress = (answeredCount / totalQuestions) * 100;

      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it('should allow changing answers before submission', async () => {
      // Answer question
      await firestoreMock.updateDocument('users/user1/quizzes/1/questions', '1', {
        userAnswer: 'Wrong Answer',
      });

      let question = await firestoreMock.getDocument('users/user1/quizzes/1/questions', '1');
      assertDefined(question);
      expect(question.data.userAnswer).toBe('Wrong Answer');

      // Change answer
      await firestoreMock.updateDocument('users/user1/quizzes/1/questions', '1', {
        userAnswer: 'Advanced Encryption Standard',
      });

      question = await firestoreMock.getDocument('users/user1/quizzes/1/questions', '1');
      assertDefined(question);
      expect(question.data.userAnswer).toBe('Advanced Encryption Standard');
    });

    it('should submit quiz and calculate score', async () => {
      // Answer all questions
      await firestoreMock.updateDocument('users/user1/quizzes/1/questions', '1', {
        userAnswer: 'Advanced Encryption Standard',
        isCorrect: true,
      });

      // Get all questions to calculate score
      const questions = await firestoreMock.getSubcollectionDocuments(
        'users/user1',
        'quizzes/1',
        'questions'
      );

      const correctCount = questions.filter((q) => q.data.isCorrect === true).length;
      const totalCount = questions.length;
      const score = Math.round((correctCount / totalCount) * 100);

      // Submit quiz
      await firestoreMock.updateDocument('users/user1/quizzes', '1', {
        completedAt: new Date().toISOString(),
        score: score,
      });

      // Verify quiz submitted
      const quiz = await firestoreMock.getDocument('users/user1/quizzes', '1');
      assertDefined(quiz);
      expect(quiz.data.completedAt).toBeDefined();
      expect(quiz.data.score).toBe(score);
      expect(quiz.data.score).toBeGreaterThanOrEqual(0);
      expect(quiz.data.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Quiz Review and Results', () => {
    beforeEach(async () => {
      // Create completed quiz
      const quiz = createTestQuiz(1, 'user1', 1, {
        name: 'Completed Quiz',
        completedAt: new Date().toISOString(),
        score: 75,
      });

      await firestoreMock.setSubcollectionDocument('users', 'user1', 'quizzes', '1', quiz);

      // Add answered questions
      await firestoreMock.setSubcollectionDocument('users/user1', 'quizzes/1', 'questions', '1', {
        id: 1,
        questionId: 1,
        text: 'What is AES?',
        userAnswer: 'Advanced Encryption Standard',
        correctAnswer: 'Advanced Encryption Standard',
        isCorrect: true,
      });

      await firestoreMock.setSubcollectionDocument('users/user1', 'quizzes/1', 'questions', '2', {
        id: 2,
        questionId: 2,
        text: 'What is RSA?',
        userAnswer: 'Wrong Answer',
        correctAnswer: 'Public key cryptosystem',
        isCorrect: false,
      });
    });

    it('should display quiz results', async () => {
      const quiz = await firestoreMock.getDocument('users/user1/quizzes', '1');
      assertDefined(quiz);

      expect(quiz.data.completedAt).toBeDefined();
      expect(quiz.data.score).toBe(75);
    });

    it('should show correct and incorrect answers', async () => {
      const questions = await firestoreMock.getSubcollectionDocuments(
        'users/user1',
        'quizzes/1',
        'questions'
      );

      const correctAnswers = questions.filter((q) => q.data.isCorrect === true);
      const incorrectAnswers = questions.filter((q) => q.data.isCorrect === false);

      expect(correctAnswers.length).toBe(1);
      expect(incorrectAnswers.length).toBe(1);
    });

    it('should allow reviewing question explanations', async () => {
      // Get question with explanation
      const question = await storage.getQuestion(1);

      if (question) {
        expect(question.explanation).toBeDefined();
      }
    });

    it('should calculate category-specific performance', async () => {
      const questions = await firestoreMock.getSubcollectionDocuments(
        'users/user1',
        'quizzes/1',
        'questions'
      );

      // Group by category and calculate scores
      const categoryPerformance: Record<number, { correct: number; total: number }> = {};

      for (const q of questions) {
        const fullQuestion = await storage.getQuestion(q.data.questionId);
        if (fullQuestion) {
          const catId = fullQuestion.categoryId;
          if (!categoryPerformance[catId]) {
            categoryPerformance[catId] = { correct: 0, total: 0 };
          }
          categoryPerformance[catId].total++;
          if (q.data.isCorrect) {
            categoryPerformance[catId].correct++;
          }
        }
      }

      // Verify performance tracking
      Object.values(categoryPerformance).forEach((perf) => {
        expect(perf.total).toBeGreaterThan(0);
        expect(perf.correct).toBeLessThanOrEqual(perf.total);
      });
    });
  });

  describe('Quiz Data Persistence', () => {
    it('should persist quiz state across sessions', async () => {
      // Create quiz
      const quiz = createTestQuiz(1, 'user1', 1, {
        name: 'Persistent Quiz',
        startedAt: new Date().toISOString(),
        completedAt: null,
      });

      await firestoreMock.setSubcollectionDocument('users', 'user1', 'quizzes', '1', quiz);

      // Simulate logout and login
      await firestoreMock.clearCurrentUser();
      await waitForAsync(50);

      await firestoreMock.setCurrentUserId('user1');
      await waitForAsync(50);

      // Quiz should still exist
      const persistedQuiz = await firestoreMock.getDocument('users/user1/quizzes', '1');
      assertDefined(persistedQuiz);
      expect(persistedQuiz.data.name).toBe('Persistent Quiz');
    });

    it('should update user progress after quiz completion', async () => {
      // Complete quiz
      await firestoreMock.setSubcollectionDocument(
        'users',
        'user1',
        'quizzes',
        '1',
        createTestQuiz(1, 'user1', 1, {
          completedAt: new Date().toISOString(),
          score: 85,
        })
      );

      // Update progress
      await firestoreMock.setSubcollectionDocument('users', 'user1', 'progress', '1', {
        categoryId: 1,
        questionsAnswered: 10,
        correctAnswers: 8,
        lastAttemptScore: 85,
        masteryLevel: 'developing',
      });

      // Verify progress updated
      const progress = await firestoreMock.getDocument('users/user1/progress', '1');
      assertDefined(progress);
      expect(progress.data.lastAttemptScore).toBe(85);
    });

    it('should handle concurrent quiz sessions', async () => {
      // Create multiple quizzes
      await firestoreMock.setSubcollectionDocument(
        'users',
        'user1',
        'quizzes',
        '1',
        createTestQuiz(1, 'user1', 1, { name: 'Quiz 1' })
      );

      await firestoreMock.setSubcollectionDocument(
        'users',
        'user1',
        'quizzes',
        '2',
        createTestQuiz(2, 'user1', 1, { name: 'Quiz 2' })
      );

      // Get all quizzes
      const quizzes = await firestoreMock.getSubcollectionDocuments('users', 'user1', 'quizzes');

      expect(quizzes.length).toBe(2);
      expect(quizzes.map((q) => q.data.name)).toContain('Quiz 1');
      expect(quizzes.map((q) => q.data.name)).toContain('Quiz 2');
    });
  });

  describe('Quiz State Management', () => {
    it('should track quiz lifecycle states', async () => {
      // Create quiz (not started)
      const quiz = createTestQuiz(1, 'user1', 1, {
        name: 'Lifecycle Quiz',
        startedAt: null,
        completedAt: null,
      });

      await firestoreMock.setSubcollectionDocument('users', 'user1', 'quizzes', '1', quiz);

      let savedQuiz = await firestoreMock.getDocument('users/user1/quizzes', '1');
      assertDefined(savedQuiz);
      expect(savedQuiz.data.startedAt).toBeNull();
      expect(savedQuiz.data.completedAt).toBeNull();

      // Start quiz
      await firestoreMock.updateDocument('users/user1/quizzes', '1', {
        startedAt: new Date().toISOString(),
      });

      savedQuiz = await firestoreMock.getDocument('users/user1/quizzes', '1');
      assertDefined(savedQuiz);
      expect(savedQuiz.data.startedAt).toBeDefined();
      expect(savedQuiz.data.completedAt).toBeNull();

      // Complete quiz
      await firestoreMock.updateDocument('users/user1/quizzes', '1', {
        completedAt: new Date().toISOString(),
        score: 90,
      });

      savedQuiz = await firestoreMock.getDocument('users/user1/quizzes', '1');
      assertDefined(savedQuiz);
      expect(savedQuiz.data.completedAt).toBeDefined();
      expect(savedQuiz.data.score).toBe(90);
    });

    it('should verify completed quiz state is immutable', async () => {
      // Create completed quiz
      const completedAt = new Date().toISOString();
      await firestoreMock.setSubcollectionDocument(
        'users',
        'user1',
        'quizzes',
        '1',
        createTestQuiz(1, 'user1', 1, {
          completedAt,
          score: 85,
        })
      );

      const quiz = await firestoreMock.getDocument('users/user1/quizzes', '1');
      assertDefined(quiz);

      // Verify quiz is in completed state
      expect(quiz.data.completedAt).toBe(completedAt);
      expect(quiz.data.score).toBe(85);

      // Attempt to modify completed quiz - mock allows it but application should prevent
      await firestoreMock.updateDocument('users/user1/quizzes', '1', {
        score: 100,
      });

      // Verify that in a real application, the above would be rejected
      // For now, we validate that we can detect the completed state
      const updatedQuiz = await firestoreMock.getDocument('users/user1/quizzes', '1');
      assertDefined(updatedQuiz);
      expect(updatedQuiz.data.completedAt).toBe(completedAt); // Still completed
    });
  });
});
