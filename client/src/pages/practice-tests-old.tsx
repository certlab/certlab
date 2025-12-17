import PracticeTestMode from '@/components/PracticeTestMode';
import { FileText } from 'lucide-react';

export default function PracticeTests() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header with gradient background */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-blue-900/30 border border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Practice Tests</h1>
          </div>
          <p className="text-muted-foreground text-base leading-relaxed">
            Take full-length practice exams that simulate real certification tests to prepare
            effectively.
          </p>
        </div>

        {/* Practice Test Mode Component */}
        <PracticeTestMode />
      </main>
    </div>
  );
}
