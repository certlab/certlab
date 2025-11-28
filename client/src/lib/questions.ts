/**
 * Quiz Utility Functions
 * 
 * This module provides utility functions for quiz operations including
 * array shuffling, time formatting, and score calculations with 
 * accessibility-compliant color theming.
 * 
 * @module questions
 */

/**
 * Shuffles an array using the Fisher-Yates (Knuth) shuffle algorithm.
 * This algorithm produces an unbiased permutation where every permutation
 * is equally likely.
 * 
 * @template T - The type of elements in the array
 * @param array - The array to shuffle
 * @returns A new shuffled array (the original array is not modified)
 * 
 * @example
 * const questions = [q1, q2, q3, q4];
 * const shuffled = shuffleArray(questions);
 * // shuffled is a random permutation of questions
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Formats a duration in seconds to a minutes:seconds string format.
 * 
 * @param seconds - The number of seconds to format
 * @returns A string in "M:SS" format where minutes can be any length
 *          (e.g., "2:05" for 125 seconds, "61:03" for 3663 seconds)
 * 
 * @example
 * formatTime(125);  // Returns "2:05"
 * formatTime(60);   // Returns "1:00"
 * formatTime(45);   // Returns "0:45"
 * formatTime(3663); // Returns "61:03"
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Calculates the percentage score from correct and total question counts.
 * 
 * @param correct - The number of correctly answered questions
 * @param total - The total number of questions
 * @returns The score as a percentage (0-100), rounded to the nearest integer
 * 
 * @example
 * calculateScore(8, 10);  // Returns 80
 * calculateScore(7, 10);  // Returns 70
 * calculateScore(15, 20); // Returns 75
 */
export const calculateScore = (correct: number, total: number): number => {
  return Math.round((correct / total) * 100);
};

/**
 * Returns a Tailwind CSS text color class based on the score threshold.
 * Colors are WCAG AA compliant with appropriate dark mode variants.
 * 
 * Score thresholds:
 * - 90%+: Green (excellent)
 * - 80-89%: Blue (good)
 * - 70-79%: Yellow (passing)
 * - Below 70%: Red (needs improvement)
 * 
 * @param score - The score percentage (0-100)
 * @returns Tailwind CSS class string for text color
 * 
 * @example
 * getScoreColor(95); // Returns "text-green-600 dark:text-green-400"
 * getScoreColor(85); // Returns "text-blue-600 dark:text-blue-400"
 * getScoreColor(65); // Returns "text-red-600 dark:text-red-400"
 */
export const getScoreColor = (score: number): string => {
  // WCAG AA compliant colors with dark mode variants
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 80) return 'text-blue-600 dark:text-blue-400';
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

/**
 * Returns a Tailwind CSS background color class based on the score threshold.
 * Colors are WCAG AA compliant with appropriate dark mode variants.
 * 
 * Score thresholds:
 * - 90%+: Green background (excellent)
 * - 80-89%: Blue background (good)
 * - 70-79%: Yellow background (passing)
 * - Below 70%: Red background (needs improvement)
 * 
 * @param score - The score percentage (0-100)
 * @returns Tailwind CSS class string for background color
 * 
 * @example
 * getScoreBgColor(95); // Returns "bg-green-100 dark:bg-green-900/30"
 * getScoreBgColor(75); // Returns "bg-yellow-100 dark:bg-yellow-900/30"
 */
export const getScoreBgColor = (score: number): string => {
  // WCAG AA compliant background colors with dark mode variants
  if (score >= 90) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 80) return 'bg-blue-100 dark:bg-blue-900/30';
  if (score >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
};
