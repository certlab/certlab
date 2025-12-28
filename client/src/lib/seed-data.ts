/**
 * Seed Data Module for CertLab
 *
 * This module handles the initial data seeding for new CertLab installations.
 * When a user first loads the application, this module ensures that essential
 * data exists in Firestore, including:
 *
 * - Default tenants (organizations)
 * - Certification categories (CISSP, CISM)
 * - Topic subcategories
 * - Sample questions
 * - Achievement badges
 *
 * ## Note
 *
 * With the transition to Firestore-only storage, seeding is now handled
 * through Firestore admin operations or during initial Firebase setup,
 * not through client-side code. This file is kept for compatibility
 * but the seeding logic has been disabled.
 *
 * @deprecated Client-side seeding is no longer supported. Use Firestore admin SDK scripts,
 * Firebase console, or initial database setup procedures to seed shared content.
 *
 * @module seed-data
 */

/**
 * @deprecated Client-side seeding is disabled in Firestore-only architecture.
 * This function is a no-op that logs a deprecation warning.
 * Use Firestore admin tools to seed data instead.
 */
export async function seedInitialData(): Promise<void> {
  console.warn(
    '[Seed Data] DEPRECATED: Client-side seeding is disabled.\n' +
      'Firestore shared content must be seeded via:\n' +
      '  1. Firestore admin SDK scripts\n' +
      '  2. Firebase console\n' +
      '  3. Initial database setup procedures'
  );
  return;
}

// Function to check if seeding is needed and perform it
export async function ensureDataSeeded(): Promise<void> {
  try {
    await seedInitialData();
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}
