import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QuizTimer } from "./QuizTimer";
import type { Quiz, QuizState } from "./types";

interface QuizHeaderProps {
  quiz: Quiz;
  questions: { id: number }[];
  state: QuizState;
  timeRemaining: number | null;
}

export function QuizHeader({ quiz, questions, state, timeRemaining }: QuizHeaderProps) {
  const progress = questions.length > 0 
    ? ((state.currentQuestionIndex + 1) / questions.length) * 100 
    : 0;

  return (
    <div className="p-4 sm:p-6 border-b border-border/50 gradient-mesh">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-1">
            <h2 className="text-lg sm:text-xl font-medium text-foreground">{quiz.title}</h2>
            <Badge 
              variant={quiz.mode === "quiz" ? "default" : "secondary"}
              className={`text-xs font-medium ${
                quiz.mode === "quiz" 
                  ? "bg-secondary text-white border-0" 
                  : "bg-primary/20 text-primary border-primary/30"
              }`}
            >
              {quiz.mode === "quiz" ? (
                <>
                  <i className="fas fa-clipboard-check mr-1"></i>
                  Quiz Mode
                </>
              ) : (
                <>
                  <i className="fas fa-brain mr-1"></i>
                  Study Mode
                </>
              )}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {quiz.mode === "quiz" 
              ? "Graded assessment that updates your mastery progress"
              : "Practice session with immediate feedback"
            }
          </p>
        </div>
        <QuizTimer timeRemaining={timeRemaining} />
      </div>
      
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm text-muted-foreground">
          {state.isReviewingFlagged ? (
            <>
              <Badge variant="outline" className="mr-2 bg-accent/10 text-accent border-accent">
                <i className="fas fa-flag mr-1"></i>
                Reviewing Flagged
              </Badge>
              Question {state.currentFlaggedIndex + 1} of {state.flaggedQuestionIndices.length}
            </>
          ) : (
            `Question ${state.currentQuestionIndex + 1} of ${questions.length}`
          )}
        </span>
        <span className="text-xs sm:text-sm text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2 quiz-progress-smooth" />
    </div>
  );
}
