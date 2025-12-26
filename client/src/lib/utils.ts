/**
 * General Utility Functions
 *
 * This module provides common utility functions used throughout the application.
 *
 * @module utils
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines and merges Tailwind CSS class names.
 *
 * This function uses `clsx` to conditionally combine class names and
 * `tailwind-merge` to intelligently merge Tailwind CSS classes, resolving
 * conflicts (e.g., `p-2` vs `p-4`) by keeping the last specified value.
 *
 * @param inputs - Class values to combine (strings, arrays, objects, or conditionals)
 * @returns A merged string of class names with conflicts resolved
 *
 * @example
 * // Basic usage
 * cn("p-4", "text-center")
 * // Returns: "p-4 text-center"
 *
 * @example
 * // With conditional classes
 * cn("base-class", isActive && "active", isDisabled && "disabled")
 * // Returns appropriate class string based on conditions
 *
 * @example
 * // Merging conflicting Tailwind classes
 * cn("p-2 bg-red-500", "p-4 bg-blue-500")
 * // Returns: "p-4 bg-blue-500" (later values override earlier ones)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gets user initials from first and last name.
 *
 * @param firstName - User's first name (optional)
 * @param lastName - User's last name (optional)
 * @returns Uppercase initials (e.g., "JD" for John Doe) or "?" if no names provided
 *
 * @example
 * getInitials("John", "Doe")
 * // Returns: "JD"
 *
 * @example
 * getInitials("Jane", null)
 * // Returns: "J"
 */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  if (!firstName && !lastName) return '?';
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase() || '?';
}

/**
 * Minimum user properties required for display name generation.
 * This interface defines the contract for the getUserDisplayName function,
 * allowing it to work with any object that has these optional properties.
 */
interface UserForDisplayName {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

/**
 * Gets a display name for a user based on available information.
 *
 * Priority order:
 * 1. Full name (firstName + lastName)
 * 2. First name only
 * 3. Last name only
 * 4. Email username (part before @)
 * 5. "User" as fallback
 *
 * @param user - User object with optional name and email fields
 * @returns Display name string
 *
 * @example
 * getUserDisplayName({ firstName: "John", lastName: "Doe", email: "john@example.com" })
 * // Returns: "John Doe"
 *
 * @example
 * getUserDisplayName({ email: "jane@example.com" })
 * // Returns: "jane"
 */
export function getUserDisplayName(user: UserForDisplayName | null): string {
  if (!user) return 'User';
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

/**
 * Formats notification count with proper pluralization.
 *
 * @param count - Number of notifications
 * @param includeNumber - Whether to include the count in the output (default: true)
 * @returns Formatted notification text
 *
 * @example
 * formatNotificationCount(0)
 * // Returns: "0 notifications"
 *
 * @example
 * formatNotificationCount(1)
 * // Returns: "1 notification"
 *
 * @example
 * formatNotificationCount(5)
 * // Returns: "5 notifications"
 *
 * @example
 * formatNotificationCount(1, false)
 * // Returns: "notification"
 */
export function formatNotificationCount(count: number, includeNumber = true): string {
  const pluralSuffix = count === 1 ? '' : 's';
  const word = `notification${pluralSuffix}`;
  return includeNumber ? `${count} ${word}` : word;
}
