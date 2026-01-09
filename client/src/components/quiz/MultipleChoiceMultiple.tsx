import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EnhancedExplanation } from '@/components/EnhancedExplanation';
import type { Question, QuizState } from './types';
import type { Question as SchemaQuestion } from '@shared/schema';

interface MultipleChoiceMultipleProps {
  question: Question;
  state: QuizState;
  onAnswerChange: (value: number[]) => void;
}

export function MultipleChoiceMultiple({
  question,
  state,
  onAnswerChange,
}: MultipleChoiceMultipleProps) {
  const selectedAnswers = Array.isArray(state.selectedAnswer)
    ? (state.selectedAnswer as number[])
    : [];

  const handleToggleOption = (optionId: number) => {
    if (state.showFeedback) return;

    const newAnswers = selectedAnswers.includes(optionId)
      ? selectedAnswers.filter((id) => id !== optionId)
      : [...selectedAnswers, optionId];

    onAnswerChange(newAnswers);
  };

  const isCorrectOption = (optionId: number) => {
    return question.correctAnswers?.includes(optionId) || false;
  };

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-medium text-foreground flex-1">{question.text}</h3>
        <Badge variant="secondary" className="ml-2">
          Select all that apply
        </Badge>
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {(question.options as Array<{ id?: number; text: string }>)?.map((option, index) => {
          const optionId = option.id !== undefined ? option.id : index;
          const isSelected = selectedAnswers.includes(optionId);
          const isCorrect = isCorrectOption(optionId);

          // Determine styling based on feedback state
          let optionClassName =
            'flex items-start gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer';

          if (state.showFeedback) {
            if (isSelected && isCorrect) {
              optionClassName += ' border-green-500 bg-green-50 dark:bg-green-950/20';
            } else if (isSelected && !isCorrect) {
              optionClassName += ' border-red-500 bg-red-50 dark:bg-red-950/20';
            } else if (!isSelected && isCorrect) {
              optionClassName += ' border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
            } else {
              optionClassName += ' border-gray-300';
            }
          } else if (isSelected) {
            optionClassName += ' border-blue-500 bg-blue-50 dark:bg-blue-950/20';
          } else {
            optionClassName += ' border-gray-300 hover:border-gray-400';
          }

          if (state.showFeedback) {
            optionClassName += ' cursor-default';
          }

          return (
            <div
              key={`option-${optionId}`}
              className={optionClassName}
              onClick={() => handleToggleOption(optionId)}
            >
              <Checkbox
                id={`question-${question.id}-option-${optionId}`}
                checked={isSelected}
                onCheckedChange={() => handleToggleOption(optionId)}
                disabled={state.showFeedback}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor={`question-${question.id}-option-${optionId}`}
                  className="text-foreground cursor-pointer text-sm sm:text-base"
                >
                  {option.text}
                </Label>
                {state.showFeedback && (
                  <div className="mt-1 text-sm">
                    {isSelected && isCorrect && (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        ✓ Correctly selected
                      </span>
                    )}
                    {isSelected && !isCorrect && (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        ✗ Should not be selected
                      </span>
                    )}
                    {!isSelected && isCorrect && (
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                        ⚠ Should be selected
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection counter */}
      {!state.showFeedback && (
        <div className="mt-3">
          <Badge variant="secondary">{selectedAnswers.length} selected</Badge>
        </div>
      )}

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
