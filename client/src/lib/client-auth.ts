/**
 * Client-side authentication system
 * Uses browser storage for authentication state
 */

import { clientStorage } from './client-storage';
import type { User } from '@shared/schema';
import { AuthError, AuthErrorCode, logError, isStorageError } from './errors';

// Simple client-side password hashing (NOT cryptographically secure, but sufficient for local storage)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  message?: string;
  errorCode?: AuthErrorCode;
}

class ClientAuth {
  async register(email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResponse> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const error = new AuthError(AuthErrorCode.INVALID_EMAIL, { email });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // Validate password length if password is provided
      if (password && password.length > 0 && password.length < 8) {
        const error = new AuthError(AuthErrorCode.PASSWORD_TOO_SHORT, { passwordLength: password.length });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // Check if user already exists
      const existingUser = await clientStorage.getUserByEmail(email);
      if (existingUser) {
        const error = new AuthError(AuthErrorCode.USER_EXISTS, { email });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // Create user with optional password
      const passwordHash = password && password.length > 0 ? await hashPassword(password) : null;
      const user = await clientStorage.createUser({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'user',
        tenantId: 1,
      });

      // Set as current user
      await clientStorage.setCurrentUserId(user.id);

      // Return without password hash
      const { passwordHash: _, ...sanitizedUser } = user;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('register', error, { email, hasPassword: !!password });
      
      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.userMessage, errorCode: authError.code };
      }
      
      const authError = new AuthError(AuthErrorCode.REGISTRATION_FAILED);
      return { success: false, message: authError.userMessage, errorCode: authError.code };
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await clientStorage.getUserByEmail(email);
      if (!user) {
        const error = new AuthError(AuthErrorCode.INVALID_CREDENTIALS, { email });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // If user has no password set, allow password-less login
      if (!user.passwordHash) {
        // Set as current user
        await clientStorage.setCurrentUserId(user.id);

        // Return without password hash
        const { passwordHash: _, ...sanitizedUser } = user;
        return { success: true, user: sanitizedUser };
      }

      // Verify password if user has one
      const passwordHash = await hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        const error = new AuthError(AuthErrorCode.INVALID_CREDENTIALS, { email });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // Set as current user
      await clientStorage.setCurrentUserId(user.id);

      // Return without password hash
      const { passwordHash: _, ...sanitizedUser } = user;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('login', error, { email });
      
      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.userMessage, errorCode: authError.code };
      }
      
      const authError = new AuthError(AuthErrorCode.LOGIN_FAILED);
      return { success: false, message: authError.userMessage, errorCode: authError.code };
    }
  }

  async logout(): Promise<void> {
    try {
      await clientStorage.clearCurrentUser();
    } catch (error) {
      logError('logout', error);
      throw new AuthError(AuthErrorCode.LOGOUT_FAILED);
    }
  }

  async getCurrentUser(): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const userId = await clientStorage.getCurrentUserId();
      if (!userId) return null;

      const user = await clientStorage.getUser(userId);
      if (!user) {
        // Clear invalid session
        await clientStorage.clearCurrentUser();
        return null;
      }

      const { passwordHash: _, ...sanitizedUser } = user;
      return sanitizedUser;
    } catch (error) {
      logError('getCurrentUser', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  async updateProfile(updates: Partial<User>): Promise<AuthResponse> {
    try {
      const userId = await clientStorage.getCurrentUserId();
      if (!userId) {
        const error = new AuthError(AuthErrorCode.NOT_AUTHENTICATED);
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // Don't allow updating password through this method
      const { passwordHash, ...safeUpdates } = updates as any;

      const updatedUser = await clientStorage.updateUser(userId, safeUpdates);
      if (!updatedUser) {
        const error = new AuthError(AuthErrorCode.USER_NOT_FOUND, { userId });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      const { passwordHash: _, ...sanitizedUser } = updatedUser;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('updateProfile', error, { updates: Object.keys(updates) });
      
      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.userMessage, errorCode: authError.code };
      }
      
      const authError = new AuthError(AuthErrorCode.PROFILE_UPDATE_FAILED);
      return { success: false, message: authError.userMessage, errorCode: authError.code };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const userId = await clientStorage.getCurrentUserId();
      if (!userId) {
        const error = new AuthError(AuthErrorCode.NOT_AUTHENTICATED);
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      const user = await clientStorage.getUser(userId);
      if (!user) {
        const error = new AuthError(AuthErrorCode.USER_NOT_FOUND, { userId });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // If user has no password, allow setting one without current password
      if (!user.passwordHash) {
        // Validate new password
        if (newPassword.length < 8) {
          const error = new AuthError(AuthErrorCode.PASSWORD_TOO_SHORT, { passwordLength: newPassword.length });
          return { success: false, message: error.userMessage, errorCode: error.code };
        }

        // Set password
        const newHash = await hashPassword(newPassword);
        const updatedUser = await clientStorage.updateUser(userId, { passwordHash: newHash });
        if (!updatedUser) {
          const error = new AuthError(AuthErrorCode.PASSWORD_CHANGE_FAILED);
          return { success: false, message: error.userMessage, errorCode: error.code };
        }

        const { passwordHash: _, ...sanitizedUser } = updatedUser;
        return { success: true, user: sanitizedUser, message: 'Password set successfully' };
      }

      // Verify current password
      const currentHash = await hashPassword(currentPassword);
      if (user.passwordHash !== currentHash) {
        const error = new AuthError(AuthErrorCode.INVALID_PASSWORD, { userId });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // Validate new password
      if (newPassword.length < 8) {
        const error = new AuthError(AuthErrorCode.PASSWORD_TOO_SHORT, { passwordLength: newPassword.length });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // Update password
      const newHash = await hashPassword(newPassword);
      const updatedUser = await clientStorage.updateUser(userId, { passwordHash: newHash });
      if (!updatedUser) {
        const error = new AuthError(AuthErrorCode.PASSWORD_CHANGE_FAILED);
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      const { passwordHash: _, ...sanitizedUser } = updatedUser;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('changePassword', error);
      
      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.userMessage, errorCode: authError.code };
      }
      
      const authError = new AuthError(AuthErrorCode.PASSWORD_CHANGE_FAILED);
      return { success: false, message: authError.userMessage, errorCode: authError.code };
    }
  }

  async getAllUsers(): Promise<(Omit<User, 'passwordHash'> & { hasPassword: boolean })[]> {
    try {
      const users = await clientStorage.getAllUsers();
      
      // Return users without password hashes, but include hasPassword flag
      return users.map(user => {
        const { passwordHash, ...sanitizedUser } = user;
        return { ...sanitizedUser, hasPassword: !!passwordHash };
      });
    } catch (error) {
      logError('getAllUsers', error);
      return [];
    }
  }

  async hasPassword(userId: string): Promise<boolean> {
    try {
      const user = await clientStorage.getUser(userId);
      return !!user?.passwordHash;
    } catch (error) {
      logError('hasPassword', error, { userId });
      return false;
    }
  }

  async loginPasswordless(email: string): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await clientStorage.getUserByEmail(email);
      if (!user) {
        const error = new AuthError(AuthErrorCode.USER_NOT_FOUND, { email });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // Verify account has no password (is password-less)
      if (user.passwordHash) {
        const error = new AuthError(AuthErrorCode.PASSWORD_REQUIRED, { email });
        return { success: false, message: error.userMessage, errorCode: error.code };
      }

      // Set as current user
      await clientStorage.setCurrentUserId(user.id);

      // Return without password hash
      const { passwordHash: _, ...sanitizedUser } = user;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('loginPasswordless', error, { email });
      
      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.userMessage, errorCode: authError.code };
      }
      
      const authError = new AuthError(AuthErrorCode.LOGIN_FAILED);
      return { success: false, message: authError.userMessage, errorCode: authError.code };
    }
  }
}

export const clientAuth = new ClientAuth();
