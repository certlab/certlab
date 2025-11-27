export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const calculateScore = (correct: number, total: number): number => {
  return Math.round((correct / total) * 100);
};

export const getScoreColor = (score: number): string => {
  // WCAG AA compliant colors with dark mode variants
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 80) return 'text-blue-600 dark:text-blue-400';
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export const getScoreBgColor = (score: number): string => {
  // WCAG AA compliant background colors with dark mode variants
  if (score >= 90) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 80) return 'bg-blue-100 dark:bg-blue-900/30';
  if (score >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
};
