import type { Question } from '@shared/schema';
import type { QuizAnswer } from '@/components/quiz/types';

/**
 * Grades a question based on its type and the user's answer
 * @param question The question to grade
 * @param userAnswer The user's answer
 * @returns Object with isCorrect flag and optional details
 */
export function gradeQuestion(
  question: Question,
  userAnswer: QuizAnswer
): { isCorrect: boolean; details?: string } {
  const questionType = question.questionType || 'multiple_choice_single';

  switch (questionType) {
    case 'multiple_choice_single':
    case 'true_false':
      // Simple comparison for single choice
      if (typeof userAnswer === 'number') {
        return {
          isCorrect: userAnswer === question.correctAnswer,
        };
      }
      return { isCorrect: false };

    case 'multiple_choice_multiple':
      // Check if all correct answers are selected and no incorrect ones
      if (Array.isArray(userAnswer) && Array.isArray(question.correctAnswers)) {
        const userSet = new Set(userAnswer);
        const correctSet = new Set(question.correctAnswers);

        // Must have same size
        if (userSet.size !== correctSet.size) {
          return { isCorrect: false };
        }

        // All user answers must be correct
        const allCorrect = Array.from(userSet).every((ans) => correctSet.has(ans));
        return { isCorrect: allCorrect };
      }
      return { isCorrect: false };

    case 'fill_in_blank':
      // Case-insensitive comparison with accepted answers
      if (typeof userAnswer === 'string' && Array.isArray(question.acceptedAnswers)) {
        const normalizedAnswer = userAnswer.trim().toLowerCase();
        const isCorrect = question.acceptedAnswers.some(
          (accepted) => accepted.trim().toLowerCase() === normalizedAnswer
        );
        return { isCorrect };
      }
      return { isCorrect: false };

    case 'short_answer':
      // Short answers require manual grading
      if (question.requiresManualGrading) {
        return {
          isCorrect: false,
          details: 'This question requires manual grading by an instructor.',
        };
      }
      // If not requiring manual grading, could have accepted answers
      if (typeof userAnswer === 'string' && Array.isArray(question.acceptedAnswers)) {
        const normalizedAnswer = userAnswer.trim().toLowerCase();
        const isCorrect = question.acceptedAnswers.some(
          (accepted) => accepted.trim().toLowerCase() === normalizedAnswer
        );
        return { isCorrect };
      }
      return { isCorrect: false };

    case 'matching':
      // Check if all pairs are correctly matched
      if (
        typeof userAnswer === 'object' &&
        !Array.isArray(userAnswer) &&
        Array.isArray(question.matchingPairs)
      ) {
        const userMatches = userAnswer as Record<number, number>;

        // Check if all matches are correct
        let allCorrect = true;
        for (const [leftIdStr, rightId] of Object.entries(userMatches)) {
          const leftId = Number(leftIdStr);

          // Find the correct pair for this left ID
          const correctPair = question.matchingPairs.find((p) => p.id === leftId);
          // Find the selected right item
          const selectedPair = question.matchingPairs.find((p) => p.id === rightId);

          if (!correctPair || !selectedPair || correctPair.right !== selectedPair.right) {
            allCorrect = false;
            break;
          }
        }

        // Also check that all pairs are matched
        if (Object.keys(userMatches).length !== question.matchingPairs.length) {
          allCorrect = false;
        }

        return { isCorrect: allCorrect };
      }
      return { isCorrect: false };

    case 'ordering':
      // Check if items are in correct order
      if (Array.isArray(userAnswer) && Array.isArray(question.orderingItems)) {
        const userOrder = userAnswer as number[];

        // Check each item's position
        let allCorrect = true;
        for (let i = 0; i < userOrder.length; i++) {
          const itemId = userOrder[i];
          const item = question.orderingItems.find((it) => it.id === itemId);

          if (!item || item.correctPosition !== i) {
            allCorrect = false;
            break;
          }
        }

        // Also verify all items are present
        if (userOrder.length !== question.orderingItems.length) {
          allCorrect = false;
        }

        return { isCorrect: allCorrect };
      }
      return { isCorrect: false };

    default:
      return { isCorrect: false, details: 'Unknown question type' };
  }
}

/**
 * Parses a string answer back into the appropriate QuizAnswer type
 * Used when answers are stored as strings and need to be converted back
 */
export function parseAnswer(answerString: string, questionType: string): QuizAnswer {
  try {
    // For simple numeric answers (MCQ single, True/False)
    if (questionType === 'multiple_choice_single' || questionType === 'true_false') {
      return parseInt(answerString, 10);
    }

    // For text answers (Fill-in-blank, Short answer)
    if (questionType === 'fill_in_blank' || questionType === 'short_answer') {
      return answerString;
    }

    // For complex types, try JSON parsing
    return JSON.parse(answerString);
  } catch {
    // If parsing fails, return the string as-is
    return answerString;
  }
}
