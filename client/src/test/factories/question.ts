/**
 * Test data factories for Question entities
 */
import type { Question, InsertQuestion, QuestionOption } from '@shared/schema';

/**
 * Default question options for testing
 */
export const DEFAULT_OPTIONS: QuestionOption[] = [
  { id: 0, text: 'Option A' },
  { id: 1, text: 'Option B' },
  { id: 2, text: 'Option C' },
  { id: 3, text: 'Option D' },
];

/**
 * Default question for testing
 */
const DEFAULT_QUESTION: Question = {
  id: 1,
  tenantId: 1,
  categoryId: 1,
  subcategoryId: 1,
  questionType: 'multiple_choice_single',
  text: 'What is the primary purpose of security management?',
  options: DEFAULT_OPTIONS,
  correctAnswer: 0,
  correctAnswers: null,
  acceptedAnswers: null,
  matchingPairs: null,
  orderingItems: null,
  requiresManualGrading: false,
  explanation: 'Security management ensures the protection of organizational assets.',
  difficultyLevel: 2,
  tags: ['security', 'management'],
  explanationSteps: null,
  referenceLinks: null,
  videoUrl: null,
  communityExplanations: null,
  explanationVotes: 0,
  hasAlternativeViews: false,
};

/**
 * Creates a test Question with optional overrides
 */
export function createQuestion(overrides?: Partial<Question>): Question {
  return {
    ...DEFAULT_QUESTION,
    ...overrides,
  };
}

/**
 * Creates a multiple choice question with multiple correct answers
 */
export function createMultipleAnswerQuestion(overrides?: Partial<Question>): Question {
  return createQuestion({
    ...overrides,
    questionType: 'multiple_choice_multiple',
    text:
      overrides?.text || 'Which of the following are security controls? (Select all that apply)',
    correctAnswer: null,
    correctAnswers: [0, 2, 3],
  });
}

/**
 * Creates a true/false question
 */
export function createTrueFalseQuestion(overrides?: Partial<Question>): Question {
  return createQuestion({
    ...overrides,
    questionType: 'true_false',
    text: overrides?.text || 'Is security management a critical component of information security?',
    options: [
      { id: 0, text: 'True' },
      { id: 1, text: 'False' },
    ],
    correctAnswer: 0,
  });
}

/**
 * Creates a fill-in-the-blank question
 */
export function createFillInBlankQuestion(overrides?: Partial<Question>): Question {
  return createQuestion({
    ...overrides,
    questionType: 'fill_in_blank',
    text:
      overrides?.text ||
      'The three pillars of information security are confidentiality, _____, and availability.',
    options: null,
    correctAnswer: null,
    acceptedAnswers: ['integrity', 'Integrity', 'INTEGRITY'],
  });
}

/**
 * Creates a question with enhanced explanation features
 */
export function createQuestionWithEnhancedExplanation(overrides?: Partial<Question>): Question {
  return createQuestion({
    ...overrides,
    explanationSteps: [
      'Step 1: Understand the security management framework',
      'Step 2: Identify organizational assets',
      'Step 3: Implement protection controls',
      'Step 4: Monitor and review effectiveness',
    ],
    referenceLinks: [
      {
        title: 'NIST Cybersecurity Framework',
        url: 'https://www.nist.gov/cyberframework',
        type: 'documentation',
      },
      {
        title: 'ISO 27001 Overview',
        url: 'https://www.iso.org/isoiec-27001-information-security.html',
        type: 'documentation',
      },
    ],
    videoUrl: 'https://www.youtube.com/watch?v=example',
    explanationVotes: 15,
  });
}

/**
 * Creates multiple test questions with sequential IDs
 */
export function createQuestions(count: number, baseOverrides?: Partial<Question>): Question[] {
  return Array.from({ length: count }, (_, index) =>
    createQuestion({
      ...baseOverrides,
      id: index + 1,
      text: `Test question ${index + 1}`,
    })
  );
}

/**
 * Creates an InsertQuestion object (for creation tests)
 */
export function createInsertQuestion(overrides?: Partial<InsertQuestion>): InsertQuestion {
  return {
    tenantId: overrides?.tenantId || 1,
    categoryId: overrides?.categoryId || 1,
    subcategoryId: overrides?.subcategoryId || 1,
    questionType: overrides?.questionType || 'multiple_choice_single',
    text: overrides?.text || 'New test question',
    options: overrides?.options || DEFAULT_OPTIONS,
    correctAnswer: overrides?.correctAnswer !== undefined ? overrides.correctAnswer : 0,
    correctAnswers: overrides?.correctAnswers || null,
    acceptedAnswers: overrides?.acceptedAnswers || null,
    matchingPairs: overrides?.matchingPairs || null,
    orderingItems: overrides?.orderingItems || null,
    requiresManualGrading: overrides?.requiresManualGrading || false,
    explanation: overrides?.explanation || 'Test explanation',
    difficultyLevel: overrides?.difficultyLevel || 1,
    tags: overrides?.tags || ['test'],
    explanationSteps: overrides?.explanationSteps || null,
    referenceLinks: overrides?.referenceLinks || null,
    videoUrl: overrides?.videoUrl || null,
    communityExplanations: overrides?.communityExplanations || null,
  };
}

/**
 * Creates questions at various difficulty levels
 */
export function createQuestionsByDifficulty(): Question[] {
  return [
    createQuestion({ id: 1, difficultyLevel: 1, text: 'Easy question' }),
    createQuestion({ id: 2, difficultyLevel: 2, text: 'Beginner question' }),
    createQuestion({ id: 3, difficultyLevel: 3, text: 'Intermediate question' }),
    createQuestion({ id: 4, difficultyLevel: 4, text: 'Advanced question' }),
    createQuestion({ id: 5, difficultyLevel: 5, text: 'Expert question' }),
  ];
}
