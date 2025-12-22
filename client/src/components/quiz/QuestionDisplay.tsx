import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { EnhancedExplanation } from '@/components/EnhancedExplanation';
import type { Question, QuizState } from './types';
import type { Question as SchemaQuestion } from '@shared/schema';

interface QuestionDisplayProps {
  question: Question;
  state: QuizState;
  onAnswerChange: (value: string) => void;
}

export function QuestionDisplay({ question, state, onAnswerChange }: QuestionDisplayProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-medium text-foreground mb-3 sm:mb-4">
        {question.text}
      </h3>

      {/* Answer Options */}
      <RadioGroup
        value={state.selectedAnswer !== undefined ? state.selectedAnswer.toString() : ''}
        onValueChange={onAnswerChange}
        className="space-y-3"
      >
        {(question.options as any[]).map((option, index) => {
          // Use option.id if available, otherwise use index
          const optionId = option.id !== undefined ? option.id : index;
          const isSelectedAnswer = state.selectedAnswer === optionId;
          const isCorrectAnswer = optionId === question.correctAnswer;

          // Simplified className logic with smoother transitions
          let optionClassName = 'quiz-option-base';

          if (state.showFeedback && isSelectedAnswer) {
            optionClassName += state.isCorrect ? ' quiz-option-correct' : ' quiz-option-incorrect';
          } else if (state.showFeedback && isCorrectAnswer && !state.isCorrect) {
            optionClassName += ' quiz-option-correct-reveal';
          } else if (isSelectedAnswer && !state.showFeedback) {
            optionClassName += ' quiz-option-selected';
          } else if (state.selectedAnswer === undefined) {
            optionClassName += ' quiz-option-unanswered';
          } else {
            optionClassName += ' quiz-option-default';
          }

          return (
            <div
              key={`option-${optionId}`}
              className={optionClassName}
              onClick={() =>
                !state.showFeedback &&
                state.selectedAnswer === undefined &&
                onAnswerChange(optionId.toString())
              }
              style={{ cursor: state.selectedAnswer !== undefined ? 'default' : 'pointer' }}
            >
              <RadioGroupItem
                value={optionId.toString()}
                id={`question-${question.id}-option-${optionId}`}
                className="quiz-radio-smooth"
              />
              <Label
                htmlFor={`question-${question.id}-option-${optionId}`}
                className="text-foreground cursor-pointer flex-1 text-sm sm:text-base"
              >
                {option.text}
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {/* Immediate Feedback Explanation - Enhanced V2 */}
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
