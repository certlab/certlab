import { Card } from "@/components/ui/card";
import type { Question, QuizState } from "./types";

interface QuestionNavigatorProps {
  questions: Question[];
  state: QuizState;
  onNavigate: (index: number) => void;
}

export function QuestionNavigator({ questions, state, onNavigate }: QuestionNavigatorProps) {
  const getQuestionStatus = (questionIndex: number) => {
    const question = questions[questionIndex];
    if (!question) return 'unanswered';
    
    if (questionIndex === state.currentQuestionIndex) return 'current';
    if (state.flaggedQuestions.has(question.id)) return 'flagged';
    if (state.answers[question.id] !== undefined) return 'answered';
    return 'unanswered';
  };

  return (
    <Card className="shadow-lg border-0 p-3 sm:p-4 bg-card">
      <h4 className="font-medium text-foreground mb-3 text-sm sm:text-base" id="question-navigator-heading">Question Navigator</h4>
      <div 
        className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 sm:gap-2"
        role="navigation"
        aria-labelledby="question-navigator-heading"
      >
        {questions.map((_, index) => {
          const status = getQuestionStatus(index);
          let className = "quiz-nav-button ";
          let statusLabel = "";
          
          switch (status) {
            case 'current':
              className += "quiz-nav-current";
              statusLabel = "current question";
              break;
            case 'answered':
              className += "quiz-nav-answered";
              statusLabel = "answered";
              break;
            case 'flagged':
              className += "quiz-nav-flagged";
              statusLabel = "flagged for review";
              break;
            default:
              className += "quiz-nav-unanswered";
              statusLabel = "not answered";
          }
          
          return (
            <button
              key={index}
              onClick={() => onNavigate(index)}
              className={className}
              aria-label={`Go to question ${index + 1}, ${statusLabel}`}
              aria-current={status === 'current' ? 'step' : undefined}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-3 sm:gap-x-6 mt-3 sm:mt-4 text-[10px] sm:text-xs">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded quiz-legend-dot"></div>
          <span className="text-muted-foreground">Current</span>
        </div>
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-secondary rounded quiz-legend-dot"></div>
          <span className="text-muted-foreground">Answered</span>
        </div>
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-accent rounded quiz-legend-dot"></div>
          <span className="text-muted-foreground">Flagged</span>
        </div>
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-muted rounded quiz-legend-dot"></div>
          <span className="text-muted-foreground">Not Answered</span>
        </div>
      </div>
    </Card>
  );
}
