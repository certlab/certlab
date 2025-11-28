/**
 * General Utility Functions
 * 
 * This module provides common utility functions used throughout the application.
 * 
 * @module utils
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
  return twMerge(clsx(inputs))
}
