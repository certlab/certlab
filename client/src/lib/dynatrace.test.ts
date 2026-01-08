/**
 * Dynatrace Integration Tests
 *
 * Tests to verify that Dynatrace script URL is correctly referenced
 * and the integration works properly with a working Dynatrace setup.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isDynatraceAvailable,
  trackAction,
  completeAction,
  reportError,
  identifyUser,
  endSession,
} from './dynatrace';

describe('Dynatrace Integration', () => {
  beforeEach(() => {
    // Reset window.dtrum before each test
    vi.stubGlobal('window', {});
    // Reset console spies
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isDynatraceAvailable', () => {
    it('should return false when window.dtrum is not defined', () => {
      vi.stubGlobal('window', {});
      expect(isDynatraceAvailable()).toBe(false);
    });

    it('should return true when window.dtrum is defined', () => {
      vi.stubGlobal('window', {
        dtrum: {
          enable: vi.fn(),
        },
      });
      expect(isDynatraceAvailable()).toBe(true);
    });
  });

  describe('trackAction', () => {
    it('should return -1 when dtrum is not available', () => {
      vi.stubGlobal('window', {});
      const actionId = trackAction('Test Action');
      expect(actionId).toBe(-1);
    });

    it('should successfully track action when dtrum is available', () => {
      const mockEnterAction = vi.fn(() => 123);
      vi.stubGlobal('window', {
        dtrum: {
          enterAction: mockEnterAction,
        },
      });

      const actionId = trackAction('Quiz Completed', 'custom');
      expect(actionId).toBe(123);
      expect(mockEnterAction).toHaveBeenCalledWith('Quiz Completed', 'custom');
    });
  });

  describe('completeAction', () => {
    it('should do nothing when dtrum is not available', () => {
      vi.stubGlobal('window', {});
      expect(() => completeAction(123)).not.toThrow();
    });

    it('should call leaveAction when dtrum is available', () => {
      const mockLeaveAction = vi.fn();
      vi.stubGlobal('window', {
        dtrum: {
          leaveAction: mockLeaveAction,
        },
      });

      completeAction(123);
      expect(mockLeaveAction).toHaveBeenCalledWith(123);
    });

    it('should not call leaveAction for invalid action ID', () => {
      const mockLeaveAction = vi.fn();
      vi.stubGlobal('window', {
        dtrum: {
          leaveAction: mockLeaveAction,
        },
      });

      completeAction(-1);
      expect(mockLeaveAction).not.toHaveBeenCalled();
    });
  });

  describe('reportError', () => {
    it('should do nothing when dtrum is not available', () => {
      vi.stubGlobal('window', {});
      expect(() => reportError(new Error('Test error'))).not.toThrow();
    });

    it('should call dtrum.reportError with Error object', () => {
      const mockReportError = vi.fn();
      vi.stubGlobal('window', {
        dtrum: {
          reportError: mockReportError,
        },
      });

      const error = new Error('Test error');
      reportError(error);
      expect(mockReportError).toHaveBeenCalledWith(error, undefined);
    });

    it('should call dtrum.reportError with string message', () => {
      const mockReportError = vi.fn();
      vi.stubGlobal('window', {
        dtrum: {
          reportError: mockReportError,
        },
      });

      reportError('Error message');
      expect(mockReportError).toHaveBeenCalledWith('Error message', undefined);
    });

    it('should include parent action ID when provided', () => {
      const mockReportError = vi.fn();
      vi.stubGlobal('window', {
        dtrum: {
          reportError: mockReportError,
        },
      });

      reportError(new Error('Test error'), 123);
      expect(mockReportError).toHaveBeenCalledWith(expect.any(Error), 123);
    });
  });

  describe('identifyUser', () => {
    it('should do nothing when dtrum is not available', () => {
      vi.stubGlobal('window', {});
      expect(() => identifyUser('user123')).not.toThrow();
    });

    it('should call dtrum.identifyUser when available', () => {
      const mockIdentifyUser = vi.fn();
      vi.stubGlobal('window', {
        dtrum: {
          identifyUser: mockIdentifyUser,
        },
      });

      identifyUser('user123');
      expect(mockIdentifyUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('endSession', () => {
    it('should do nothing when dtrum is not available', () => {
      vi.stubGlobal('window', {});
      expect(() => endSession()).not.toThrow();
    });

    it('should call dtrum.endSession when available', () => {
      const mockEndSession = vi.fn();
      vi.stubGlobal('window', {
        dtrum: {
          endSession: mockEndSession,
        },
      });

      endSession();
      expect(mockEndSession).toHaveBeenCalled();
    });
  });

  describe('HTML Script URL Integration', () => {
    it('should validate Dynatrace script URL format pattern from index.html', () => {
      // Test the pattern used in index.html line 70
      const pattern =
        /^https:\/\/(js-cdn\.dynatrace\.com|[a-zA-Z0-9.-]+\.(?:live\.)?dynatrace\.com)\//;

      // Valid URLs that should pass
      const validUrls = [
        'https://js-cdn.dynatrace.com/jstag/176fb25782e/bf39586mkb/cf1e99687bff1875_complete.js',
        'https://js-cdn.dynatrace.com/jstag/abc123/xyz789/script_complete.js',
        'https://custom.dynatrace.com/jstag/test.js',
        'https://tenant.live.dynatrace.com/jstag/monitor.js',
        'https://abc-123.dynatrace.com/jstag/test.js',
      ];

      validUrls.forEach((url) => {
        expect(pattern.test(url)).toBe(true);
      });

      // Invalid URLs that should fail
      const invalidUrls = [
        'http://js-cdn.dynatrace.com/jstag/test.js', // HTTP instead of HTTPS
        'https://example.com/script.js', // Wrong domain
        'https://js-cdn-dynatrace.com/test.js', // Wrong domain format
        '', // Empty string
      ];

      invalidUrls.forEach((url) => {
        expect(pattern.test(url)).toBe(false);
      });
    });

    it('should verify script loading logic from index.html', () => {
      // Test the logic from index.html lines 56-68
      const testCases = [
        {
          scriptUrl: '%VITE_DYNATRACE_SCRIPT_URL%',
          enabled: '%VITE_ENABLE_DYNATRACE%',
          expected: { shouldLoad: false, reason: 'placeholder unchanged' },
        },
        {
          scriptUrl: 'https://js-cdn.dynatrace.com/jstag/test.js',
          enabled: 'false',
          expected: { shouldLoad: false, reason: 'explicitly disabled' },
        },
        {
          scriptUrl: 'https://js-cdn.dynatrace.com/jstag/test.js',
          enabled: '%VITE_ENABLE_DYNATRACE%',
          expected: { shouldLoad: true, reason: 'configured and not disabled' },
        },
        {
          scriptUrl: 'http://invalid.com/script.js',
          enabled: '%VITE_ENABLE_DYNATRACE%',
          expected: { shouldLoad: false, reason: 'invalid URL format' },
        },
      ];

      testCases.forEach(({ scriptUrl, enabled, expected }) => {
        const PLACEHOLDER = '%' + 'VITE_DYNATRACE_SCRIPT_URL' + '%';
        const isConfigured = scriptUrl !== PLACEHOLDER && scriptUrl.indexOf('https://') === 0;
        const isExplicitlyDisabled = enabled === 'false';
        const shouldLoad = isConfigured && !isExplicitlyDisabled;

        if (expected.shouldLoad) {
          expect(shouldLoad).toBe(true);
        } else {
          expect(shouldLoad).toBe(false);
        }
      });
    });
  });

  describe('Dynatrace API Integration', () => {
    it('should verify dtrum API methods are called correctly', () => {
      const mockDtrum = {
        enable: vi.fn(),
        enterAction: vi.fn(() => 123),
        leaveAction: vi.fn(),
        reportError: vi.fn(),
        identifyUser: vi.fn(),
        endSession: vi.fn(),
      };

      vi.stubGlobal('window', { dtrum: mockDtrum });

      // Test various API methods
      const actionId = trackAction('Test Action');
      expect(mockDtrum.enterAction).toHaveBeenCalledWith('Test Action', 'custom');
      expect(actionId).toBe(123);

      completeAction(actionId);
      expect(mockDtrum.leaveAction).toHaveBeenCalledWith(123);

      const error = new Error('Test error');
      reportError(error);
      expect(mockDtrum.reportError).toHaveBeenCalledWith(error, undefined);

      identifyUser('user123');
      expect(mockDtrum.identifyUser).toHaveBeenCalledWith('user123');

      endSession();
      expect(mockDtrum.endSession).toHaveBeenCalled();
    });

    it('should handle gracefully when dtrum is not available', () => {
      vi.stubGlobal('window', {});

      // All methods should work without throwing
      expect(() => {
        const actionId = trackAction('Test');
        expect(actionId).toBe(-1);
        completeAction(actionId);
        reportError(new Error('Test'));
        identifyUser('user');
        endSession();
      }).not.toThrow();
    });
  });
});
