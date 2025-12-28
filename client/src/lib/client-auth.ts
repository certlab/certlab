/**
 * Client-side authentication system
 * Uses browser storage for authentication state
 *
 * Security notes for client-side password hashing:
 * - Uses PBKDF2 with 100,000 iterations via Web Crypto API
 * - Generates a unique 128-bit salt for each password using crypto.getRandomValues()
 * - Hash format: "pbkdf2:iterations:salt:hash" for version identification
 * - While client-side hashing provides some protection, users should understand that
 *   all data (including hashes) is stored locally in IndexedDB which can be accessed
 *   by anyone with physical access to the device
 * - This implementation protects against casual inspection but not against determined
 *   attackers with device access
 */

import { storage } from './storage-factory';
import type { User } from '@shared/schema';
import { AuthError, AuthErrorCode, logError, isStorageError } from './errors';
import {
  initializeFirebase,
  isFirebaseConfigured,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutFromGoogle,
  type FirebaseUser,
} from './firebase';

// Session timeout for password-less accounts (24 hours in milliseconds)
const PASSWORDLESS_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/** Email validation regex pattern */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimum required password length */
const MIN_PASSWORD_LENGTH = 8;

// Session info structure for type safety
interface SessionInfo {
  loginAt: number;
  isPasswordless: boolean;
}

// PBKDF2 configuration
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 128 bits
const HASH_LENGTH = 32; // 256 bits

/**
 * Generates a cryptographically secure random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Converts Uint8Array to hex string
 */
function arrayToHex(array: Uint8Array): string {
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts hex string to Uint8Array
 */
function hexToArray(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(0);
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

/**
 * Hash password using PBKDF2 with the provided salt and iterations
 * Returns the hash as a hex string
 */
async function pbkdf2Hash(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveBits',
  ]);

  // Derive bits using PBKDF2
  // Note: Create a standalone ArrayBuffer from the Uint8Array to satisfy
  // TypeScript 5.9+ stricter typing (Uint8Array.buffer is ArrayBufferLike, not ArrayBuffer)
  const saltBuffer = new Uint8Array(salt).buffer;
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8 // length in bits
  );

  return arrayToHex(new Uint8Array(derivedBits));
}

/**
 * Constant-time comparison of two hex strings to prevent timing attacks.
 * Compares all bytes regardless of early mismatches.
 */
function constantTimeCompare(a: string, b: string): boolean {
  // Pad strings to same length to maintain constant time
  const maxLen = Math.max(a.length, b.length);
  const aPadded = a.padEnd(maxLen, '\0');
  const bPadded = b.padEnd(maxLen, '\0');

  let result = a.length ^ b.length; // Include length difference in result
  for (let i = 0; i < maxLen; i++) {
    result |= aPadded.charCodeAt(i) ^ bPadded.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Creates a password hash using PBKDF2
 * Returns format: "pbkdf2:iterations:salt:hash"
 */
async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await pbkdf2Hash(password, salt);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${arrayToHex(salt)}:${hash}`;
}

/**
 * Verifies a password against a stored hash
 * Supports both legacy SHA-256 hashes and new PBKDF2 hashes
 * Uses constant-time comparison to prevent timing attacks
 */
async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  // Check if this is a PBKDF2 hash (format: "pbkdf2:iterations:salt:hash")
  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 4) {
      return { valid: false, needsRehash: false };
    }

    const [, iterationsStr, saltHex, expectedHash] = parts;
    const iterations = parseInt(iterationsStr, 10);

    // Validate iterations is a positive integer within reasonable bounds
    // Minimum 1000 iterations, maximum 10 million (prevents DoS)
    if (isNaN(iterations) || iterations < 1000 || iterations > 10000000) {
      return { valid: false, needsRehash: false };
    }

    // Validate salt length (should be 16 bytes = 32 hex characters) and format
    if (saltHex.length !== SALT_LENGTH * 2 || !/^[0-9a-f]+$/i.test(saltHex)) {
      return { valid: false, needsRehash: false };
    }

    const salt = hexToArray(saltHex);

    // Use the shared pbkdf2Hash function with stored iterations
    const computedHash = await pbkdf2Hash(password, salt, iterations);

    // Use constant-time comparison to prevent timing attacks
    const valid = constantTimeCompare(computedHash, expectedHash);

    // Check if we need to rehash (e.g., if iterations have increased)
    const needsRehash = valid && iterations < PBKDF2_ITERATIONS;

    return { valid, needsRehash };
  }

  // Legacy SHA-256 hash (64 character hex string)
  // These need to be migrated to PBKDF2
  if (storedHash.length === 64 && /^[0-9a-f]+$/.test(storedHash)) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Use constant-time comparison to prevent timing attacks
    const valid = constantTimeCompare(computedHash, storedHash);
    // Legacy hashes always need rehashing to PBKDF2
    return { valid, needsRehash: valid };
  }

  // Unknown hash format
  return { valid: false, needsRehash: false };
}

/**
 * Validate password length and return an AuthError if invalid
 */
function validatePasswordLength(password: string): AuthError | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return new AuthError(AuthErrorCode.PASSWORD_TOO_SHORT, { passwordLength: password.length });
  }
  return null;
}

// Audit logging for security events (console-based for client-side app)
function logSecurityEvent(event: string, details: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  console.info(`[SECURITY AUDIT] ${timestamp} - ${event}`, {
    ...details,
    userAgent: navigator.userAgent,
    timestamp,
  });
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  message?: string;
  errorCode?: AuthErrorCode;
}

class ClientAuth {
  // Session management for password-less accounts
  private async setSessionTimestamp(isPasswordless: boolean): Promise<void> {
    const sessionInfo: SessionInfo = {
      loginAt: Date.now(),
      isPasswordless,
    };
    try {
      // Use localStorage for session info instead of IndexedDB
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
    } catch (error) {
      logError('Failed to save sessionInfo to localStorage', error);
      // Continue despite localStorage failure - session will be invalid
    }
  }

  private async getSessionInfo(): Promise<SessionInfo | null> {
    try {
      const value = localStorage.getItem('sessionInfo');
      if (!value) return null;
      return JSON.parse(value) as SessionInfo;
    } catch (error) {
      logError('Failed to parse sessionInfo from localStorage', error);
      return null;
    }
  }

  private async clearSessionInfo(): Promise<void> {
    try {
      localStorage.removeItem('sessionInfo');
    } catch (error) {
      logError('Failed to clear sessionInfo from localStorage', error);
      // Continue despite localStorage failure
    }
  }

  // Helper method to log password-less login events
  private logPasswordlessLogin(user: User): void {
    logSecurityEvent('PASSWORDLESS_LOGIN', {
      userId: user.id,
      email: user.email,
      sessionTimeoutMs: PASSWORDLESS_SESSION_TIMEOUT_MS,
    });
  }

  // Check if password-less session has expired (absolute timeout, not idle timeout)
  // Session expires 24 hours after login, regardless of activity
  async isSessionValid(): Promise<boolean> {
    const sessionInfo = await this.getSessionInfo();
    if (!sessionInfo) return true; // No session info means normal session

    // Password-protected accounts don't expire
    if (!sessionInfo.isPasswordless) return true;

    // Check if 24 hours have elapsed since login (absolute timeout)
    const elapsed = Date.now() - sessionInfo.loginAt;
    if (elapsed > PASSWORDLESS_SESSION_TIMEOUT_MS) {
      logSecurityEvent('SESSION_EXPIRED', {
        reason: 'Password-less session timeout exceeded',
        elapsedMs: elapsed,
        timeoutMs: PASSWORDLESS_SESSION_TIMEOUT_MS,
      });
      return false;
    }

    return true;
  }

  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<AuthResponse> {
    try {
      // Validate email format
      if (!EMAIL_REGEX.test(email)) {
        const error = new AuthError(AuthErrorCode.INVALID_EMAIL, { email });
        return { success: false, message: error.message, errorCode: error.code };
      }

      // Validate password length if password is provided
      if (password && password.length > 0) {
        const passwordError = validatePasswordLength(password);
        if (passwordError) {
          return { success: false, message: passwordError.message, errorCode: passwordError.code };
        }
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        const error = new AuthError(AuthErrorCode.USER_EXISTS, { email });
        return { success: false, message: error.message, errorCode: error.code };
      }

      // Create user with optional password
      const isPasswordless = !password || password.length === 0;
      const passwordHash = isPasswordless ? null : await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'user',
        tenantId: 1,
      });

      // Set as current user
      await storage.setCurrentUserId(user.id);

      // Set session timestamp
      await this.setSessionTimestamp(isPasswordless);

      // Log registration event
      logSecurityEvent('USER_REGISTERED', {
        userId: user.id,
        email: user.email,
        isPasswordless,
      });

      // Return without password hash
      const { passwordHash: _, ...sanitizedUser } = user;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('register', error, { email, hasPassword: !!password });

      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.message, errorCode: authError.code };
      }

      const authError = new AuthError(AuthErrorCode.REGISTRATION_FAILED);
      return { success: false, message: authError.message, errorCode: authError.code };
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        logSecurityEvent('LOGIN_FAILED', {
          email,
          reason: 'User not found',
        });
        const error = new AuthError(AuthErrorCode.INVALID_CREDENTIALS, { email });
        return { success: false, message: error.message, errorCode: error.code };
      }

      // If user has no password set, allow password-less login
      if (!user.passwordHash) {
        // Set as current user
        await storage.setCurrentUserId(user.id);

        // Set session timestamp for password-less account
        await this.setSessionTimestamp(true);

        // Log password-less login
        this.logPasswordlessLogin(user);

        // Return without password hash
        const { passwordHash: _, ...sanitizedUser } = user;
        return { success: true, user: sanitizedUser };
      }

      // Verify password using the secure verification function
      const { valid, needsRehash } = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        logSecurityEvent('LOGIN_FAILED', {
          userId: user.id,
          email: user.email,
          reason: 'Invalid password',
        });
        const error = new AuthError(AuthErrorCode.INVALID_CREDENTIALS, { email });
        return { success: false, message: error.message, errorCode: error.code };
      }

      // If the password was verified but needs rehashing (e.g., migrating from SHA-256 to PBKDF2),
      // rehash with the new algorithm
      if (needsRehash) {
        const newHash = await hashPassword(password);
        await storage.updateUser(user.id, { passwordHash: newHash });
      }

      // Set as current user
      await storage.setCurrentUserId(user.id);

      // Set session timestamp for password-protected account
      await this.setSessionTimestamp(false);

      // Log successful login
      logSecurityEvent('LOGIN_SUCCESS', {
        userId: user.id,
        email: user.email,
        isPasswordless: false,
      });

      // Return without password hash
      const { passwordHash: _, ...sanitizedUser } = user;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('login', error, { email });

      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.message, errorCode: authError.code };
      }

      const authError = new AuthError(AuthErrorCode.LOGIN_FAILED);
      return { success: false, message: authError.message, errorCode: authError.code };
    }
  }

  async logout(): Promise<AuthResponse> {
    try {
      const userId = await storage.getCurrentUserId();
      logSecurityEvent('LOGOUT', { userId });
      await storage.clearCurrentUser();
      await this.clearSessionInfo();
      // Also sign out from Google if applicable
      await this.signOutFromGoogle();
      return { success: true };
    } catch (error) {
      logError('logout', error);
      const authError = new AuthError(AuthErrorCode.LOGOUT_FAILED);
      return { success: false, message: authError.message, errorCode: authError.code };
    }
  }

  async getCurrentUser(): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const userId = await storage.getCurrentUserId();
      if (!userId) return null;

      const user = await storage.getUser(userId);
      if (!user) {
        // Clear invalid session
        await storage.clearCurrentUser();
        await this.clearSessionInfo();
        return null;
      }

      // Check if password-less session has expired
      if (!(await this.isSessionValid())) {
        logSecurityEvent('SESSION_EXPIRED', {
          userId: user.id,
          email: user.email,
        });
        await storage.clearCurrentUser();
        await this.clearSessionInfo();
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
      const userId = await storage.getCurrentUserId();
      if (!userId) {
        const error = new AuthError(AuthErrorCode.NOT_AUTHENTICATED);
        return { success: false, message: error.message, errorCode: error.code };
      }

      // Don't allow updating password through this method
      const { passwordHash: _passwordHash, ...safeUpdates } = updates as any;

      const updatedUser = await storage.updateUser(userId, safeUpdates);
      if (!updatedUser) {
        const error = new AuthError(AuthErrorCode.USER_NOT_FOUND, { userId });
        return { success: false, message: error.message, errorCode: error.code };
      }

      const { passwordHash: _, ...sanitizedUser } = updatedUser;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('updateProfile', error, { updates: updates ? Object.keys(updates) : [] });

      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.message, errorCode: authError.code };
      }

      const authError = new AuthError(AuthErrorCode.PROFILE_UPDATE_FAILED);
      return { success: false, message: authError.message, errorCode: authError.code };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const userId = await storage.getCurrentUserId();
      if (!userId) {
        const error = new AuthError(AuthErrorCode.NOT_AUTHENTICATED);
        return { success: false, message: error.message, errorCode: error.code };
      }

      const user = await storage.getUser(userId);
      if (!user) {
        const error = new AuthError(AuthErrorCode.USER_NOT_FOUND, { userId });
        return { success: false, message: error.message, errorCode: error.code };
      }

      // If user has no password, allow setting one without current password
      if (!user.passwordHash) {
        // Validate new password
        const passwordError = validatePasswordLength(newPassword);
        if (passwordError) {
          return { success: false, message: passwordError.message, errorCode: passwordError.code };
        }

        // Set password
        const newHash = await hashPassword(newPassword);
        const updatedUser = await storage.updateUser(userId, { passwordHash: newHash });
        if (!updatedUser) {
          const error = new AuthError(AuthErrorCode.PASSWORD_CHANGE_FAILED);
          return { success: false, message: error.message, errorCode: error.code };
        }

        // Log security upgrade from password-less to password-protected
        logSecurityEvent('PASSWORD_SET', {
          userId: user.id,
          email: user.email,
          previouslyPasswordless: true,
        });

        // Update session to reflect password-protected status
        await this.setSessionTimestamp(false);

        const { passwordHash: _, ...sanitizedUser } = updatedUser;
        return { success: true, user: sanitizedUser, message: 'Password set successfully' };
      }

      // Verify current password using the secure verification function
      const { valid } = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        logSecurityEvent('PASSWORD_CHANGE_FAILED', {
          userId: user.id,
          email: user.email,
          reason: 'Incorrect current password',
        });
        const error = new AuthError(AuthErrorCode.INVALID_PASSWORD, { userId });
        return { success: false, message: error.message, errorCode: error.code };
      }

      // Validate new password
      const passwordError = validatePasswordLength(newPassword);
      if (passwordError) {
        return { success: false, message: passwordError.message, errorCode: passwordError.code };
      }

      // Update password with new PBKDF2 hash
      const newHash = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(userId, { passwordHash: newHash });
      if (!updatedUser) {
        const error = new AuthError(AuthErrorCode.PASSWORD_CHANGE_FAILED);
        return { success: false, message: error.message, errorCode: error.code };
      }

      // Log password change
      logSecurityEvent('PASSWORD_CHANGED', {
        userId: user.id,
        email: user.email,
      });

      const { passwordHash: _, ...sanitizedUser } = updatedUser;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('changePassword', error);

      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.message, errorCode: authError.code };
      }

      const authError = new AuthError(AuthErrorCode.PASSWORD_CHANGE_FAILED);
      return { success: false, message: authError.message, errorCode: authError.code };
    }
  }

  async getAllUsers(): Promise<(Omit<User, 'passwordHash'> & { hasPassword: boolean })[]> {
    try {
      const users = await storage.getAllUsers();

      // Return users without password hashes, but include hasPassword flag
      return users.map((user) => {
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
      const user = await storage.getUser(userId);
      return !!user?.passwordHash;
    } catch (error) {
      logError('hasPassword', error, { userId });
      return false;
    }
  }

  async loginPasswordless(email: string): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        logSecurityEvent('PASSWORDLESS_LOGIN_FAILED', {
          email,
          reason: 'Account not found',
        });
        const error = new AuthError(AuthErrorCode.USER_NOT_FOUND, { email });
        return { success: false, message: error.message, errorCode: error.code };
      }

      // Verify account has no password (is password-less)
      if (user.passwordHash) {
        logSecurityEvent('PASSWORDLESS_LOGIN_FAILED', {
          userId: user.id,
          email: user.email,
          reason: 'Account has password',
        });
        const error = new AuthError(AuthErrorCode.PASSWORD_REQUIRED, { email });
        return { success: false, message: error.message, errorCode: error.code };
      }

      // Set as current user
      await storage.setCurrentUserId(user.id);

      // Set session timestamp for password-less account
      await this.setSessionTimestamp(true);

      // Log password-less login
      this.logPasswordlessLogin(user);

      // Return without password hash
      const { passwordHash: _, ...sanitizedUser } = user;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('loginPasswordless', error, { email });

      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.message, errorCode: authError.code };
      }

      const authError = new AuthError(AuthErrorCode.LOGIN_FAILED);
      return { success: false, message: authError.message, errorCode: authError.code };
    }
  }

  /**
   * Check if Google authentication is available
   * @returns true if Firebase is configured and Google auth is available
   */
  isGoogleAuthAvailable(): boolean {
    return isFirebaseConfigured();
  }

  /**
   * Initialize Firebase for Google authentication
   * Should be called early in the app lifecycle
   * @returns true if Firebase was successfully initialized
   */
  initializeGoogleAuth(): boolean {
    return initializeFirebase();
  }

  /**
   * Sign in or register with Google
   * If the user already exists, logs them in
   * If the user doesn't exist, creates a new account
   * @returns AuthResponse with the user on success
   */
  async signInWithGoogle(): Promise<AuthResponse> {
    try {
      // Initialize Firebase if not already done
      if (!this.initializeGoogleAuth()) {
        const authError = new AuthError(AuthErrorCode.LOGIN_FAILED);
        return {
          success: false,
          message: 'Google authentication is not configured. Please check Firebase settings.',
          errorCode: authError.code,
        };
      }

      // Sign in with Google via Firebase
      const credential = await firebaseSignInWithGoogle();
      const firebaseUser: FirebaseUser = credential.user;

      if (!firebaseUser.email) {
        const authError = new AuthError(AuthErrorCode.LOGIN_FAILED);
        return {
          success: false,
          message: 'Google account does not have an email address.',
          errorCode: authError.code,
        };
      }

      // Check if user already exists in our database
      let user = await storage.getUserByEmail(firebaseUser.email);

      if (user) {
        // User exists, update profile image if changed
        if (firebaseUser.photoURL && user.profileImageUrl !== firebaseUser.photoURL) {
          const updatedUser = await storage.updateUser(user.id, {
            profileImageUrl: firebaseUser.photoURL,
          });
          if (updatedUser) {
            user = updatedUser;
          }
        }

        // Log Google sign-in for existing user
        logSecurityEvent('GOOGLE_SIGN_IN_SUCCESS', {
          userId: user?.id,
          email: firebaseUser.email,
          isNewUser: false,
        });
      } else {
        // Create new user with Google profile
        const nameParts = (firebaseUser.displayName || '').split(' ');
        const firstName = nameParts[0] || null;
        const lastName = nameParts.slice(1).join(' ') || null;

        user = await storage.createUser({
          email: firebaseUser.email,
          passwordHash: null, // Google users don't have a password
          firstName,
          lastName,
          profileImageUrl: firebaseUser.photoURL || null,
          role: 'user',
          tenantId: 1,
        });

        // Log Google sign-up for new user
        logSecurityEvent('GOOGLE_SIGN_UP_SUCCESS', {
          userId: user.id,
          email: firebaseUser.email,
          isNewUser: true,
        });
      }

      if (!user) {
        const authError = new AuthError(AuthErrorCode.LOGIN_FAILED);
        return {
          success: false,
          message: 'Failed to create or retrieve user account.',
          errorCode: authError.code,
        };
      }

      // Set as current user
      await storage.setCurrentUserId(user.id);

      // Set session timestamp for Google accounts.
      // Google-authenticated users are treated similarly to password-less accounts with a 24-hour
      // session timeout because:
      // 1. No local password is stored for Google accounts (passwordHash is null)
      // 2. Google manages the actual authentication state server-side
      // 3. The 24-hour timeout provides a reasonable balance between security and convenience
      // 4. Users can always re-authenticate quickly via Google popup if the session expires
      // Security note: Since Google-authenticated users do not have a local password and rely on
      // Google's authentication state, clearing browser data (cookies, local storage, IndexedDB)
      // or using a different device will require re-authentication with Google.
      await this.setSessionTimestamp(true);

      // Return without password hash
      const { passwordHash: _, ...sanitizedUser } = user;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('signInWithGoogle', error);

      // Handle specific Firebase errors with detailed messages
      if (error instanceof Error) {
        const userMessage = error.message;

        // Return specific Firebase error messages directly
        // These are already user-friendly from firebase.ts
        if (
          userMessage.includes('domain is not authorized') ||
          userMessage.includes('not enabled in Firebase') ||
          userMessage.includes('popup was blocked') ||
          userMessage.includes('API key is invalid') ||
          userMessage.includes('cancelled') ||
          userMessage.includes('Network error')
        ) {
          return {
            success: false,
            message: userMessage,
            errorCode: AuthErrorCode.LOGIN_FAILED,
          };
        }
      }

      if (isStorageError(error)) {
        const authError = new AuthError(AuthErrorCode.STORAGE_ERROR);
        return { success: false, message: authError.message, errorCode: authError.code };
      }

      // For any other errors, include the original error message if available
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to sign in with Google. Please try again.';

      return {
        success: false,
        message: errorMsg,
        errorCode: AuthErrorCode.LOGIN_FAILED,
      };
    }
  }

  /**
   * Sign out from Google (Firebase) in addition to local logout
   * This should be called when a Google-authenticated user logs out
   */
  async signOutFromGoogle(): Promise<void> {
    try {
      await signOutFromGoogle();
    } catch (error) {
      logError('signOutFromGoogle', error);
      // Don't throw - local logout should still proceed
    }
  }
}

export const clientAuth = new ClientAuth();
