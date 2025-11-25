/**
 * Client-side authentication system
 * Uses browser storage for authentication state
 */

import { clientStorage } from './client-storage';
import type { User } from '@shared/schema';

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
}

class ClientAuth {
  async register(email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResponse> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Validate password length if password is provided
      if (password && password.length > 0 && password.length < 8) {
        return { success: false, message: 'Password must be at least 8 characters' };
      }

      // Check if user already exists
      const existingUser = await clientStorage.getUserByEmail(email);
      if (existingUser) {
        return { success: false, message: 'User with this email already exists' };
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
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await clientStorage.getUserByEmail(email);
      if (!user) {
        return { success: false, message: 'Invalid email or password' };
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
        return { success: false, message: 'Invalid email or password' };
      }

      // Set as current user
      await clientStorage.setCurrentUserId(user.id);

      // Return without password hash
      const { passwordHash: _, ...sanitizedUser } = user;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  async logout(): Promise<void> {
    await clientStorage.clearCurrentUser();
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
      console.error('Error getting current user:', error);
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
        return { success: false, message: 'Not authenticated' };
      }

      // Don't allow updating password through this method
      const { passwordHash, ...safeUpdates } = updates as any;

      const updatedUser = await clientStorage.updateUser(userId, safeUpdates);
      if (!updatedUser) {
        return { success: false, message: 'User not found' };
      }

      const { passwordHash: _, ...sanitizedUser } = updatedUser;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, message: 'Profile update failed' };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const userId = await clientStorage.getCurrentUserId();
      if (!userId) {
        return { success: false, message: 'Not authenticated' };
      }

      const user = await clientStorage.getUser(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // If user has no password, allow setting one without current password
      if (!user.passwordHash) {
        // Validate new password
        if (newPassword.length < 8) {
          return { success: false, message: 'Password must be at least 8 characters' };
        }

        // Set password
        const newHash = await hashPassword(newPassword);
        const updatedUser = await clientStorage.updateUser(userId, { passwordHash: newHash });
        if (!updatedUser) {
          return { success: false, message: 'Password setup failed' };
        }

        const { passwordHash: _, ...sanitizedUser } = updatedUser;
        return { success: true, user: sanitizedUser, message: 'Password set successfully' };
      }

      // Verify current password
      const currentHash = await hashPassword(currentPassword);
      if (user.passwordHash !== currentHash) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Validate new password
      if (newPassword.length < 8) {
        return { success: false, message: 'New password must be at least 8 characters' };
      }

      // Update password
      const newHash = await hashPassword(newPassword);
      const updatedUser = await clientStorage.updateUser(userId, { passwordHash: newHash });
      if (!updatedUser) {
        return { success: false, message: 'Password update failed' };
      }

      const { passwordHash: _, ...sanitizedUser } = updatedUser;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, message: 'Password change failed' };
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
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async hasPassword(userId: string): Promise<boolean> {
    try {
      const user = await clientStorage.getUser(userId);
      return !!user?.passwordHash;
    } catch (error) {
      console.error('Error checking password:', error);
      return false;
    }
  }

  async loginPasswordless(email: string): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await clientStorage.getUserByEmail(email);
      if (!user) {
        return { success: false, message: 'Account not found' };
      }

      // Verify account has no password (is password-less)
      if (user.passwordHash) {
        return { success: false, message: 'This account requires a password' };
      }

      // Set as current user
      await clientStorage.setCurrentUserId(user.id);

      // Return without password hash
      const { passwordHash: _, ...sanitizedUser } = user;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      console.error('Password-less login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }
}

export const clientAuth = new ClientAuth();
