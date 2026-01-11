import { useParams } from 'react-router-dom';
import QuizInterface from '@/components/QuizInterface';

export default function Quiz() {
  const params = useParams<{ id: string }>();
  const quizId = params?.id ? parseInt(params.id) : 0;

  if (!quizId || isNaN(quizId)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center" role="alert" aria-live="polite">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Quiz Not Found</h1>
            <p className="text-muted-foreground">The quiz you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main
        id="main-content"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8"
        aria-label="Quiz interface"
      >
        <QuizInterface quizId={quizId} />
      </main>
    </div>
  );
}
