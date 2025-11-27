import { describe, it, expect } from 'vitest';
import { reducer } from './use-toast';

describe('Toast reducer', () => {
  const initialState = { toasts: [] };

  describe('ADD_TOAST', () => {
    it('should add a toast to the state', () => {
      const toast = {
        id: '1',
        title: 'Test Toast',
        description: 'Test description',
        open: true,
      };

      const result = reducer(initialState, {
        type: 'ADD_TOAST',
        toast,
      });

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0]).toEqual(toast);
    });

    it('should limit toasts to TOAST_LIMIT (1)', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true };
      const toast2 = { id: '2', title: 'Toast 2', open: true };

      let state = reducer(initialState, { type: 'ADD_TOAST', toast: toast1 });
      state = reducer(state, { type: 'ADD_TOAST', toast: toast2 });

      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].id).toBe('2');
    });
  });

  describe('UPDATE_TOAST', () => {
    it('should update an existing toast', () => {
      const toast = { id: '1', title: 'Original', open: true };
      let state = reducer(initialState, { type: 'ADD_TOAST', toast });

      state = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      });

      expect(state.toasts[0].title).toBe('Updated');
      expect(state.toasts[0].open).toBe(true);
    });

    it('should not update a non-existent toast', () => {
      const toast = { id: '1', title: 'Original', open: true };
      let state = reducer(initialState, { type: 'ADD_TOAST', toast });

      state = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '2', title: 'Updated' },
      });

      expect(state.toasts[0].title).toBe('Original');
    });
  });

  describe('DISMISS_TOAST', () => {
    it('should set open to false for a specific toast', () => {
      const toast = { id: '1', title: 'Test', open: true };
      let state = reducer(initialState, { type: 'ADD_TOAST', toast });

      state = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' });

      expect(state.toasts[0].open).toBe(false);
    });

    it('should set open to false for all toasts when no toastId', () => {
      const toast = { id: '1', title: 'Test', open: true };
      let state = reducer(initialState, { type: 'ADD_TOAST', toast });

      state = reducer(state, { type: 'DISMISS_TOAST' });

      expect(state.toasts[0].open).toBe(false);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('should remove a specific toast', () => {
      const toast = { id: '1', title: 'Test', open: true };
      let state = reducer(initialState, { type: 'ADD_TOAST', toast });

      state = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' });

      expect(state.toasts).toHaveLength(0);
    });

    it('should remove all toasts when no toastId', () => {
      const toast = { id: '1', title: 'Test', open: true };
      let state = reducer(initialState, { type: 'ADD_TOAST', toast });

      state = reducer(state, { type: 'REMOVE_TOAST' });

      expect(state.toasts).toHaveLength(0);
    });
  });
});
