import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Question, QuizState } from "./types";

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
        value={state.selectedAnswer !== undefined ? state.selectedAnswer.toString() : ""}
        onValueChange={onAnswerChange}
        className="space-y-3"
      >
        {(question.options as any[]).map((option, index) => {
          // Use option.id if available, otherwise use index
          const optionId = option.id !== undefined ? option.id : index;
          const isSelectedAnswer = state.selectedAnswer === optionId;
          const isCorrectAnswer = optionId === question.correctAnswer;
          
          // Simplified className logic with smoother transitions
          let optionClassName = "quiz-option-base";
          
          if (state.showFeedback && isSelectedAnswer) {
            optionClassName += state.isCorrect ? " quiz-option-correct" : " quiz-option-incorrect";
          } else if (state.showFeedback && isCorrectAnswer && !state.isCorrect) {
            optionClassName += " quiz-option-correct-reveal";
          } else if (isSelectedAnswer && !state.showFeedback) {
            optionClassName += " quiz-option-selected";
          } else if (state.selectedAnswer === undefined) {
            optionClassName += " quiz-option-unanswered";
          } else {
            optionClassName += " quiz-option-default";
          }

          return (
            <div 
              key={`option-${optionId}`}
              className={optionClassName}
              onClick={() => !state.showFeedback && state.selectedAnswer === undefined && onAnswerChange(optionId.toString())}
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

      {/* Immediate Feedback Explanation */}
      {question.explanation && (
        <div 
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            state.showFeedback 
              ? 'max-h-96 opacity-100 mt-4 sm:mt-6' 
              : 'max-h-0 opacity-0 mt-0'
          }`}
          aria-hidden={!state.showFeedback}
        >
          <div className={`p-3 sm:p-4 rounded-lg border-2 ${
            state.isCorrect 
              ? 'border-success/20 bg-success/5' 
              : 'border-destructive/20 bg-destructive/5'
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                state.isCorrect ? 'bg-success/20' : 'bg-destructive/20'
              }`}>
                <i className={`fas text-xs sm:text-sm ${
                  state.isCorrect 
                    ? 'fa-lightbulb text-success' 
                    : 'fa-info-circle text-destructive'
                }`}></i>
              </div>
              <div className="flex-1">
                <h5 className={`font-medium mb-1 sm:mb-2 text-sm sm:text-base ${
                  state.isCorrect ? 'text-success' : 'text-destructive'
                }`}>
                  {state.isCorrect ? 'Why this is correct:' : 'Why this is incorrect:'}
                </h5>
                <p className={`text-xs sm:text-sm leading-relaxed ${
                  state.isCorrect ? 'text-success/80' : 'text-destructive/80'
                }`}>
                  {question.explanation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
