import { formatTime } from "@/lib/questions";

interface QuizTimerProps {
  timeRemaining: number | null;
}

export function QuizTimer({ timeRemaining }: QuizTimerProps) {
  if (timeRemaining === null) {
    return null;
  }

  return (
    <div className="text-center sm:text-right">
      <div className="text-xl sm:text-2xl font-bold text-accent">
        {formatTime(timeRemaining)}
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground">Time Remaining</div>
    </div>
  );
}
