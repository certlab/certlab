/**
 * Utility for deterministic shuffling of arrays
 * Uses a simple Linear Congruential Generator (LCG) for seeded randomization
 */

/**
 * Deterministically shuffles an array based on a seed value.
 * Uses a simplified Fisher-Yates shuffle with a Linear Congruential Generator (LCG).
 *
 * This ensures that the same seed always produces the same shuffle order,
 * which is useful for quiz questions where we want consistent ordering
 * across page refreshes but randomized relative to the question.
 *
 * @param array - The array to shuffle (will not be modified)
 * @param seed - Seed value for deterministic shuffling
 * @returns A new shuffled array
 */
export function deterministicShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];

  // Linear Congruential Generator parameters (from Numerical Recipes)
  // These are well-tested constants that produce good pseudo-random sequences
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);

  let random = seed;

  // Fisher-Yates shuffle algorithm with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate next pseudo-random number
    random = (a * random + c) % m;
    // Map to range [0, i+1)
    const j = Math.floor((random / m) * (i + 1));

    // Swap elements
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
