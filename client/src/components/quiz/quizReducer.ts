import type { QuizState, QuizAction } from "./types";

// Reducer function to handle state updates
export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SELECT_ANSWER':
      return {
        ...state,
        selectedAnswer: action.payload.answer,
        answers: {
          ...state.answers,
          [action.payload.questionId]: action.payload.answer
        },
        showFeedback: action.payload.showFeedback,
        isCorrect: action.payload.isCorrect
      };
      
    case 'CHANGE_QUESTION':
      return {
        ...state,
        currentQuestionIndex: action.payload.index,
        selectedAnswer: action.payload.savedAnswer,
        showFeedback: false,
        isCorrect: false
      };
      
    case 'TOGGLE_FLAG':
      const newFlagged = new Set(state.flaggedQuestions);
      if (newFlagged.has(action.payload.questionId)) {
        newFlagged.delete(action.payload.questionId);
      } else {
        newFlagged.add(action.payload.questionId);
      }
      return {
        ...state,
        flaggedQuestions: newFlagged
      };
      
    case 'START_FLAGGED_REVIEW':
      return {
        ...state,
        isReviewingFlagged: true,
        currentFlaggedIndex: 0,
        flaggedQuestionIndices: action.payload.indices
      };
      
    case 'MOVE_TO_FLAGGED':
      return {
        ...state,
        currentFlaggedIndex: action.payload.flaggedIndex,
        currentQuestionIndex: action.payload.questionIndex
      };
      
    case 'END_FLAGGED_REVIEW':
      return {
        ...state,
        isReviewingFlagged: false,
        currentFlaggedIndex: 0,
        flaggedQuestionIndices: []
      };
      
    case 'RESET_FEEDBACK':
      return {
        ...state,
        showFeedback: false,
        isCorrect: false
      };
      
    default:
      return state;
  }
}
