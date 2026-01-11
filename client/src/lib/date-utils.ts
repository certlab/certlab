/**
 * Date Conversion Utilities
 *
 * Helper functions for safely converting Firestore timestamps to Date objects
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Safely convert a value to a Date object
 * Handles Date objects, Firestore Timestamps, strings, and null/undefined
 *
 * @param value - The value to convert (can be Date, Timestamp, string, or null/undefined)
 * @returns Date object or null if conversion fails
 */
export function safeToDate(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  // Already a Date object
  if (value instanceof Date) {
    return value;
  }

  // Firestore Timestamp
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    try {
      return (value as Timestamp).toDate();
    } catch {
      return null;
    }
  }

  // String representation
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  // Number (timestamp in milliseconds)
  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Format a date safely for display
 *
 * @param value - The value to format
 * @param locale - Optional locale for formatting (default: user's locale)
 * @returns Formatted date string or fallback message
 */
export function formatDate(value: unknown, locale?: string): string {
  const date = safeToDate(value);
  if (!date) {
    return 'N/A';
  }

  try {
    return date.toLocaleDateString(locale);
  } catch {
    return date.toISOString().split('T')[0];
  }
}
