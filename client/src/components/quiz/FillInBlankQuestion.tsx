import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnhancedExplanation } from '@/components/EnhancedExplanation';
import type { Question, QuizState } from './types';
import type { Question as SchemaQuestion } from '@shared/schema';

interface FillInBlankQuestionProps {
  question: Question;
  state: QuizState;
  onAnswerChange: (value: string) => void;
}

export function FillInBlankQuestion({ question, state, onAnswerChange }: FillInBlankQuestionProps) {
  const currentAnswer = typeof state.selectedAnswer === 'string' ? state.selectedAnswer : '';

  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-medium text-foreground mb-3 sm:mb-4">
        {question.text}
      </h3>

      {/* Fill in the blank input */}
      <div className="space-y-3">
        <Label htmlFor={`question-${question.id}-input`} className="text-sm font-medium">
          Your Answer
        </Label>
        <Input
          id={`question-${question.id}-input`}
          type="text"
          value={currentAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={state.showFeedback}
          placeholder="Enter your answer..."
          className={`
            transition-all duration-200
            ${
              state.showFeedback
                ? state.isCorrect
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                : ''
            }
          `}
        />
        {state.showFeedback && (
          <div className="text-sm">
            {state.isCorrect ? (
              <p className="text-green-600 dark:text-green-400 font-medium">✓ Correct!</p>
            ) : (
              <div className="text-red-600 dark:text-red-400">
                <p className="font-medium">✗ Incorrect</p>
                {question.acceptedAnswers && question.acceptedAnswers.length > 0 && (
                  <p className="mt-1">Accepted answers: {question.acceptedAnswers.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Immediate Feedback Explanation */}
      {question.explanation && (
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            state.showFeedback
              ? 'max-h-[2000px] opacity-100 mt-4 sm:mt-6'
              : 'max-h-0 opacity-0 mt-0'
          }`}
          aria-hidden={!state.showFeedback}
        >
          <EnhancedExplanation question={question as SchemaQuestion} isCorrect={state.isCorrect} />
        </div>
      )}
    </div>
  );
}
