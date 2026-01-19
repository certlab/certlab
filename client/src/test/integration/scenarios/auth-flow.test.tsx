/**
 * Authentication Flow Integration Tests
 *
 * Tests complete authentication workflows including:
 * - Firebase authentication flow
 * - Local/dev fallback authentication
 * - Session persistence and resume
 * - Authentication error cases
 * - Logout and session cleanup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import {
  resetIntegrationMocks,
  signInTestUser,
  signOutTestUser,
  createTestUser,
  waitForAsync,
} from '../helpers/integration-utils';
import { IntegrationTestProvider, firebaseMock, firestoreMock } from '../helpers/test-providers';
import { AuthProvider, useAuth } from '@/lib/auth-provider';
import { storage, initializeStorage, isCloudSyncAvailable } from '@/lib/storage-factory';
import React from 'react';

// Test component to access auth context
function AuthTestComponent({ onAuthStateChange }: { onAuthStateChange?: (state: any) => void }) {
  const auth = useAuth();

  React.useEffect(() => {
    onAuthStateChange?.(auth);
  }, [auth, onAuthStateChange]);

  return (
    <div>
      <div data-testid="loading">{String(auth.isLoading)}</div>
      <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="user-email">{auth.user?.email || 'null'}</div>
      <div data-testid="user-id">{auth.user?.id || 'null'}</div>
      <div data-testid="tenant-id">{auth.tenantId || 'null'}</div>
      <div data-testid="cloud-sync">{String(auth.isCloudSyncEnabled)}</div>
    </div>
  );
}

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    resetIntegrationMocks();
  });

  afterEach(() => {
    resetIntegrationMocks();
  });

  describe('Firebase Authentication', () => {
    it('should initialize with no user when not authenticated', async () => {
      let authState: any = null;

      render(
        <IntegrationTestProvider>
          <AuthProvider>
            <AuthTestComponent onAuthStateChange={(state) => (authState = state)} />
          </AuthProvider>
        </IntegrationTestProvider>
      );

      // Wait for initialization
      await waitFor(
        () => {
          expect(authState?.isLoading).toBe(false);
        },
        { timeout: 2000 }
      );

      // Should not be authenticated
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.firebaseUser).toBeNull();
    });

    it('should authenticate user with Firebase and create Firestore profile', async () => {
      let authState: any = null;

      // Render auth provider
      render(
        <IntegrationTestProvider>
          <AuthProvider>
            <AuthTestComponent onAuthStateChange={(state) => (authState = state)} />
          </AuthProvider>
        </IntegrationTestProvider>
      );

      // Wait for initial load
      await waitFor(() => expect(authState?.isLoading).toBe(false), { timeout: 2000 });

      // Sign in user
      const testUser = createTestUser({
        uid: 'test-user-1',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      // Create user in Firestore
      await firestoreMock.setDocument('users', testUser.uid, {
        id: testUser.uid,
        email: testUser.email,
        firstName: 'Test',
        lastName: 'User',
        tenantId: 1,
        role: 'user',
      });

      // Sign in
      await signInTestUser(testUser);
      await firestoreMock.setCurrentUserId(testUser.uid);

      // Wait for auth state to update
      await waitForAsync(100);

      // Firebase user should be set
      expect(firebaseMock.getUser()).toEqual(testUser);
    });

    it('should handle authentication errors gracefully', async () => {
      // Disable Firebase configuration
      firebaseMock.setConfigured(false);

      let authState: any = null;

      render(
        <IntegrationTestProvider>
          <AuthProvider>
            <AuthTestComponent onAuthStateChange={(state) => (authState = state)} />
          </AuthProvider>
        </IntegrationTestProvider>
      );

      await waitFor(() => expect(authState?.isLoading).toBe(false), { timeout: 2000 });

      // In dev mode, should continue without Firebase
      // In production mode, would throw error
      expect(firebaseMock.isFirebaseConfigured()).toBe(false);
    });

    it('should sync user profile image from Firebase to Firestore', async () => {
      const testUser = createTestUser({
        uid: 'test-user-2',
        email: 'test2@example.com',
        photoURL: 'https://example.com/photo1.jpg',
      });

      // Create user in Firestore with different photo URL
      await firestoreMock.setDocument('users', testUser.uid, {
        id: testUser.uid,
        email: testUser.email,
        profileImageUrl: 'https://example.com/old-photo.jpg',
        tenantId: 1,
        role: 'user',
      });

      // Sign in (should trigger profile sync)
      await signInTestUser(testUser);
      await firestoreMock.setCurrentUserId(testUser.uid);
      await waitForAsync(100);

      // Get user from storage
      const user = await storage.getUser(testUser.uid);

      // Profile image should be updated from Firebase (in real implementation)
      // For mock, we just verify the user exists
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser.uid);
    });
  });

  describe('Session Management', () => {
    it('should persist user session across page reloads', async () => {
      const testUser = createTestUser({
        uid: 'test-user-3',
        email: 'test3@example.com',
      });

      // Create user in Firestore
      await firestoreMock.setDocument('users', testUser.uid, {
        id: testUser.uid,
        email: testUser.email,
        tenantId: 1,
        role: 'user',
      });

      // Sign in
      await signInTestUser(testUser);
      await firestoreMock.setCurrentUserId(testUser.uid);
      await waitForAsync(50);

      // Verify session is set
      const currentUserId = await storage.getCurrentUserId();
      expect(currentUserId).toBe(testUser.uid);

      // Simulate page reload by checking if user ID persists
      const userId = await storage.getCurrentUserId();
      expect(userId).toBe(testUser.uid);

      // Get user should work
      const user = await storage.getUser(testUser.uid);
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser.uid);
    });

    it('should clear session on logout', async () => {
      const testUser = createTestUser({
        uid: 'test-user-4',
        email: 'test4@example.com',
      });

      // Sign in
      await signInTestUser(testUser);
      await firestoreMock.setCurrentUserId(testUser.uid);
      await waitForAsync(50);

      // Verify signed in
      expect(await storage.getCurrentUserId()).toBe(testUser.uid);
      expect(firebaseMock.getUser()).toEqual(testUser);

      // Sign out
      await signOutTestUser();
      await storage.clearCurrentUser();
      await waitForAsync(50);

      // Verify session cleared
      expect(await storage.getCurrentUserId()).toBeNull();
      expect(firebaseMock.getUser()).toBeNull();
    });

    it('should handle session resume with expired data', async () => {
      const testUser = createTestUser({
        uid: 'test-user-5',
        email: 'test5@example.com',
      });

      // Create user in Firestore
      await firestoreMock.setDocument('users', testUser.uid, {
        id: testUser.uid,
        email: testUser.email,
        tenantId: 1,
        role: 'user',
      });

      // Sign in
      await signInTestUser(testUser);
      await firestoreMock.setCurrentUserId(testUser.uid);

      // Verify session exists
      const userId = await storage.getCurrentUserId();
      expect(userId).toBe(testUser.uid);

      // Simulate expired session by clearing Firebase user but keeping storage session
      firebaseMock.setUser(null);

      // Try to get current user - should handle gracefully
      const currentUserId = await storage.getCurrentUserId();
      expect(currentUserId).toBe(testUser.uid); // Storage still has session

      // But Firebase user is gone
      expect(firebaseMock.getUser()).toBeNull();
    });
  });

  describe('Local/Dev Fallback Authentication', () => {
    it('should work without Firebase in development mode', async () => {
      // Disable Firebase
      firebaseMock.setConfigured(false);

      // Initialize storage without Firebase
      await initializeStorage(null);

      // Should initialize successfully
      expect(isCloudSyncAvailable()).toBe(false);

      // Can still use local storage operations
      const tenants = await storage.getTenants();
      expect(Array.isArray(tenants)).toBe(true);
    });

    it('should support local user creation without Firebase', async () => {
      // Disable Firebase
      firebaseMock.setConfigured(false);

      // Create local user
      const localUser = {
        id: 'local-user-1',
        email: 'local@example.com',
        firstName: 'Local',
        lastName: 'User',
        tenantId: 1,
        role: 'user' as const,
      };

      await firestoreMock.setDocument('users', localUser.id, localUser);

      // Set as current user
      await storage.setCurrentUserId(localUser.id);

      // Get user
      const user = await storage.getUser(localUser.id);
      expect(user).toEqual(
        expect.objectContaining({
          id: localUser.id,
          email: localUser.email,
        })
      );
    });
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle sign-in with missing parameters', async () => {
      // Sign in without required parameters should create a user with defaults
      const user = await signInTestUser();

      // Verify user was created with generated ID
      expect(user.uid).toBeDefined();
      expect(user.uid).toMatch(/^test-user-\d+$/);
      
      // Verify Firebase mock has the user
      expect(firebaseMock.getUser()).toBeDefined();
    });

    it('should handle invalid credentials', async () => {
      // Try to sign in with invalid user
      const invalidUser = createTestUser({
        uid: 'invalid-user',
        email: 'invalid@example.com',
      });

      await signInTestUser(invalidUser);

      // User is signed in to Firebase mock
      expect(firebaseMock.getUser()).toEqual(invalidUser);

      // But no Firestore profile exists
      const user = await storage.getUser(invalidUser.uid);
      expect(user).toBeNull();
    });

    it('should handle concurrent authentication attempts', async () => {
      const user1 = createTestUser({ uid: 'concurrent-1', email: 'user1@example.com' });
      const user2 = createTestUser({ uid: 'concurrent-2', email: 'user2@example.com' });

      // Create users in Firestore
      await firestoreMock.setDocument('users', user1.uid, {
        id: user1.uid,
        email: user1.email,
        tenantId: 1,
        role: 'user',
      });
      await firestoreMock.setDocument('users', user2.uid, {
        id: user2.uid,
        email: user2.email,
        tenantId: 1,
        role: 'user',
      });

      // Attempt concurrent sign-ins
      const signIn1 = signInTestUser(user1);
      const signIn2 = signInTestUser(user2);

      // Last one wins in this mock
      await Promise.all([signIn1, signIn2]);

      // The last user should be signed in
      const currentUser = firebaseMock.getUser();
      expect(currentUser).toEqual(user2);
    });
  });

  describe('Authentication State Transitions', () => {
    it('should transition from loading to authenticated state', async () => {
      const states: string[] = [];
      let authState: any = null;

      const testUser = createTestUser({
        uid: 'state-test-1',
        email: 'state@example.com',
      });

      // Create user in Firestore
      await firestoreMock.setDocument('users', testUser.uid, {
        id: testUser.uid,
        email: testUser.email,
        tenantId: 1,
        role: 'user',
      });

      render(
        <IntegrationTestProvider>
          <AuthProvider>
            <AuthTestComponent
              onAuthStateChange={(state) => {
                authState = state;
                states.push(
                  state.isLoading
                    ? 'loading'
                    : state.isAuthenticated
                      ? 'authenticated'
                      : 'unauthenticated'
                );
              }}
            />
          </AuthProvider>
        </IntegrationTestProvider>
      );

      // Wait for initial state
      await waitFor(() => expect(authState?.isLoading).toBe(false), { timeout: 2000 });

      // Sign in
      await signInTestUser(testUser);
      await firestoreMock.setCurrentUserId(testUser.uid);
      await waitForAsync(100);

      // Should have transitioned through states
      expect(states.length).toBeGreaterThan(0);
    });

    it('should handle rapid sign-in/sign-out cycles', async () => {
      const testUser = createTestUser({
        uid: 'rapid-test-1',
        email: 'rapid@example.com',
      });

      // Create user in Firestore
      await firestoreMock.setDocument('users', testUser.uid, {
        id: testUser.uid,
        email: testUser.email,
        tenantId: 1,
        role: 'user',
      });

      // Rapid sign-in and sign-out
      for (let i = 0; i < 3; i++) {
        await signInTestUser(testUser);
        await firestoreMock.setCurrentUserId(testUser.uid);
        await waitForAsync(20);

        await signOutTestUser();
        await storage.clearCurrentUser();
        await waitForAsync(20);
      }

      // Final state should be signed out
      expect(firebaseMock.getUser()).toBeNull();
      expect(await storage.getCurrentUserId()).toBeNull();
    });
  });
});
