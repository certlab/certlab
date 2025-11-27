import type { Question, Quiz } from "@shared/schema";

// Define quiz state shape
export interface QuizState {
  currentQuestionIndex: number;
  answers: Record<number, number>;
  flaggedQuestions: Set<number>;
  selectedAnswer: number | undefined;
  showFeedback: boolean;
  isCorrect: boolean;
  isReviewingFlagged: boolean;
  currentFlaggedIndex: number;
  flaggedQuestionIndices: number[];
}

// Define action types
export type QuizAction =
  | { type: 'SELECT_ANSWER'; payload: { questionId: number; answer: number; isCorrect: boolean; showFeedback: boolean } }
  | { type: 'CHANGE_QUESTION'; payload: { index: number; savedAnswer?: number } }
  | { type: 'TOGGLE_FLAG'; payload: { questionId: number } }
  | { type: 'START_FLAGGED_REVIEW'; payload: { indices: number[] } }
  | { type: 'MOVE_TO_FLAGGED'; payload: { flaggedIndex: number; questionIndex: number } }
  | { type: 'END_FLAGGED_REVIEW' }
  | { type: 'RESET_FEEDBACK' };

// Initial state for the quiz
export const initialQuizState: QuizState = {
  currentQuestionIndex: 0,
  answers: {},
  flaggedQuestions: new Set<number>(),
  selectedAnswer: undefined,
  showFeedback: false,
  isCorrect: false,
  isReviewingFlagged: false,
  currentFlaggedIndex: 0,
  flaggedQuestionIndices: []
};

// Re-export shared types for convenience
export type { Question, Quiz };
