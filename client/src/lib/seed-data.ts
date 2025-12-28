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
 * @module seed-data
 */

import { storage } from './storage-factory';

const SEED_VERSION = 6; // Gamification V2 features

export async function seedInitialData(): Promise<void> {
  // Note: With Firestore-only storage, seeding is handled differently
  // Shared content (categories, questions, badges) should be seeded via:
  // 1. Firestore admin SDK scripts
  // 2. Firebase console
  // 3. Initial database setup procedures
  //
  // Client-side seeding has been disabled to avoid conflicts and ensure
  // data consistency across all users in the cloud storage system.

  console.log('[Seed Data] Firestore-based seeding skipped - use admin tools to seed data');
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
