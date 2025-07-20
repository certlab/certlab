import { useRoute } from "wouter";
import Header from "@/components/Header";
import QuizInterface from "@/components/QuizInterface";

export default function Quiz() {
  const [, params] = useRoute("/quiz/:id");
  const quizId = parseInt(params?.id || "0");

  if (!quizId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Quiz Not Found</h1>
            <p className="text-muted-foreground">The quiz you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <QuizInterface quizId={quizId} />
      </main>
    </div>
  );
}
