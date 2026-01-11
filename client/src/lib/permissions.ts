/**
 * Permission utilities for quiz and material access control
 * Implements creator-based permissions with optional admin override
 */

import { logInfo } from './errors';

/**
 * Basic user shape for permission checks
 */
interface PermissionUser {
  id: string;
  role?: string;
}

/**
 * Resource with owner information
 */
interface PermissionResource {
  userId?: string;
  author?: string | null;
  createdBy?: string;
}

/**
 * Check if user can edit a resource
 * @param resource - The resource to check (Quiz, Lecture, or QuizTemplate)
 * @param user - The current user
 * @returns true if user has edit permission
 */
export function canEdit(
  resource: PermissionResource | null | undefined,
  user: PermissionUser | null | undefined
): boolean {
  if (!resource || !user) {
    return false;
  }

  // Creator can always edit
  // Check userId (lectures), author (quizzes), or createdBy (templates)
  // Priority order: userId > author > createdBy
  // Note: Different resource types use different owner fields:
  //   - Lectures use 'userId'
  //   - Quizzes use 'author'
  //   - Templates use 'createdBy'
  // The fallback chain ensures compatibility with all resource types
  const creatorId = resource.userId || resource.author || resource.createdBy;
  if (creatorId === user.id) {
    return true;
  }

  // Admin override (optional - can be enabled if needed)
  if (user.role === 'admin') {
    return true;
  }

  return false;
}

/**
 * Check if user can delete a resource
 * @param resource - The resource to check (Quiz, Lecture, or QuizTemplate)
 * @param user - The current user
 * @returns true if user has delete permission
 */
export function canDelete(
  resource: PermissionResource | null | undefined,
  user: PermissionUser | null | undefined
): boolean {
  // Same permissions as edit
  return canEdit(resource, user);
}

/**
 * Log a permission check event for audit purposes
 * @param action - The action being attempted (edit, delete, view)
 * @param resourceType - Type of resource (quiz, lecture, material)
 * @param resourceId - ID of the resource
 * @param userId - ID of the user attempting the action
 * @param granted - Whether permission was granted
 */
export function logPermissionCheck(
  action: 'edit' | 'delete' | 'view',
  resourceType: 'quiz' | 'lecture' | 'material',
  resourceId: string | number,
  userId: string,
  granted: boolean
): void {
  logInfo('permissionCheck', {
    action,
    resourceType,
    resourceId: resourceId.toString(),
    userId,
    granted,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get permission error message based on action
 * @param action - The action being denied
 * @param resourceType - Type of resource
 * @returns User-friendly error message
 */
export function getPermissionDeniedMessage(
  action: 'edit' | 'delete',
  resourceType: 'quiz' | 'lecture' | 'material'
): string {
  if (action === 'edit') {
    return `You can view this ${resourceType} but cannot edit it. Only the creator can make changes.`;
  }
  if (action === 'delete') {
    return `You can view this ${resourceType} but cannot delete it. Only the creator can delete their own content.`;
  }
  return 'Permission denied';
}
