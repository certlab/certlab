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

import { clientStorage } from './client-storage';
import type { User } from '@shared/schema';
import { indexedDBService, STORES } from './indexeddb';
import { AuthError, AuthErrorCode, logError, isStorageError } from './errors';

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
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts hex string to Uint8Array
 */
function hexToArray(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(0);
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

/**
 * Hash password using PBKDF2 with the provided salt and iterations
 * Returns the hash as a hex string
 */
async function pbkdf2Hash(password: string, salt: Uint8Array, iterations: number = PBKDF2_ITERATIONS): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
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
async function verifyPassword(password: string, storedHash: string): Promise<{ valid: boolean; needsRehash: boolean }> {
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
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
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
    await indexedDBService.put(STORES.settings, {
      key: 'sessionInfo',
      value: JSON.stringify(sessionInfo),
    });
  }

  private async getSessionInfo(): Promise<SessionInfo | null> {
    const setting = await indexedDBService.get<{ key: string; value: string }>(
      STORES.settings,
      'sessionInfo'
    );
    if (!setting?.value) return null;
    try {
      return JSON.parse(setting.value) as SessionInfo;
    } catch {
      return null;
    }
  }

  private async clearSessionInfo(): Promise<void> {
    await indexedDBService.delete(STORES.settings, 'sessionInfo');
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

  async register(email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResponse> {
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
      const existingUser = await clientStorage.getUserByEmail(email);
      if (existingUser) {
        const error = new AuthError(AuthErrorCode.USER_EXISTS, { email });
        return { success: false, message: error.message, errorCode: error.code };
      }

      // Create user with optional password
      const isPasswordless = !password || password.length === 0;
      const passwordHash = isPasswordless ? null : await hashPassword(password);
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
      const user = await clientStorage.getUserByEmail(email);
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
        await clientStorage.setCurrentUserId(user.id);
        
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
        await clientStorage.updateUser(user.id, { passwordHash: newHash });
      }

      // Set as current user
      await clientStorage.setCurrentUserId(user.id);
      
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
      const userId = await clientStorage.getCurrentUserId();
      logSecurityEvent('LOGOUT', { userId });
      await clientStorage.clearCurrentUser();
      await this.clearSessionInfo();
      return { success: true };
    } catch (error) {
      logError('logout', error);
      const authError = new AuthError(AuthErrorCode.LOGOUT_FAILED);
      return { success: false, message: authError.message, errorCode: authError.code };
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
        await this.clearSessionInfo();
        return null;
      }

      // Check if password-less session has expired
      if (!(await this.isSessionValid())) {
        logSecurityEvent('SESSION_EXPIRED', {
          userId: user.id,
          email: user.email,
        });
        await clientStorage.clearCurrentUser();
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
      const userId = await clientStorage.getCurrentUserId();
      if (!userId) {
        const error = new AuthError(AuthErrorCode.NOT_AUTHENTICATED);
        return { success: false, message: error.message, errorCode: error.code };
      }

      // Don't allow updating password through this method
      const { passwordHash, ...safeUpdates } = updates as any;

      const updatedUser = await clientStorage.updateUser(userId, safeUpdates);
      if (!updatedUser) {
        const error = new AuthError(AuthErrorCode.USER_NOT_FOUND, { userId });
        return { success: false, message: error.message, errorCode: error.code };
      }

      const { passwordHash: _, ...sanitizedUser } = updatedUser;
      return { success: true, user: sanitizedUser };
    } catch (error) {
      logError('updateProfile', error, { updates: Object.keys(updates) });
      
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
      const userId = await clientStorage.getCurrentUserId();
      if (!userId) {
        const error = new AuthError(AuthErrorCode.NOT_AUTHENTICATED);
        return { success: false, message: error.message, errorCode: error.code };
      }

      const user = await clientStorage.getUser(userId);
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
        const updatedUser = await clientStorage.updateUser(userId, { passwordHash: newHash });
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
      const updatedUser = await clientStorage.updateUser(userId, { passwordHash: newHash });
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
      await clientStorage.setCurrentUserId(user.id);
      
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
}

export const clientAuth = new ClientAuth();
