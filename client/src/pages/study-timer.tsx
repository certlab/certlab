import { StudyTimer } from '@/components/StudyTimer';

export default function StudyTimerPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Study Timer</h1>
        <p className="text-muted-foreground">
          Use the Pomodoro technique to boost your focus and productivity
        </p>
      </div>

      <StudyTimer />
    </div>
  );
}
