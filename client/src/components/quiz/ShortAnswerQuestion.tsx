import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { EnhancedExplanation } from '@/components/EnhancedExplanation';
import type { Question, QuizState } from './types';
import type { Question as SchemaQuestion } from '@shared/schema';

interface ShortAnswerQuestionProps {
  question: Question;
  state: QuizState;
  onAnswerChange: (value: string) => void;
}

export function ShortAnswerQuestion({ question, state, onAnswerChange }: ShortAnswerQuestionProps) {
  const currentAnswer = typeof state.selectedAnswer === 'string' ? state.selectedAnswer : '';

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-medium text-foreground flex-1">{question.text}</h3>
        {question.requiresManualGrading && (
          <Badge variant="secondary" className="ml-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Manual Grading
          </Badge>
        )}
      </div>

      {/* Short answer textarea */}
      <div className="space-y-3">
        <Label htmlFor={`question-${question.id}-textarea`} className="text-sm font-medium">
          Your Answer
        </Label>
        <Textarea
          id={`question-${question.id}-textarea`}
          value={currentAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={state.showFeedback}
          placeholder="Enter your answer in detail..."
          rows={6}
          className={`
            transition-all duration-200 resize-none
            ${state.showFeedback ? 'bg-gray-50 dark:bg-gray-900' : ''}
          `}
        />
        {question.requiresManualGrading && !state.showFeedback && (
          <p className="text-sm text-muted-foreground">
            This question requires manual grading. Your answer will be reviewed by an instructor.
          </p>
        )}
        {state.showFeedback && question.requiresManualGrading && (
          <div className="text-sm text-blue-600 dark:text-blue-400">
            <p className="font-medium">Answer submitted for review</p>
            <p className="mt-1">An instructor will review your answer and provide feedback.</p>
          </div>
        )}
      </div>

      {/* Immediate Feedback Explanation - Only shown for non-manual grading */}
      {question.explanation && !question.requiresManualGrading && (
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
