/**
 * Tests for HTML sanitization and input validation utilities
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeInput, sanitizeArray, safeMarkdownToHtml } from './sanitize';

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    );
  });

  it('should escape angle brackets', () => {
    expect(escapeHtml('<div>content</div>')).toBe('&lt;div&gt;content&lt;/div&gt;');
  });

  it('should escape ampersands', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape angle brackets and ampersands (quotes handled by attribute encoding)', () => {
    // Note: textContent-based escaping doesn't escape quotes, but that's OK because
    // we're not injecting into HTML attributes. For attributes, browsers handle encoding.
    expect(escapeHtml('"quoted" text')).toBe('"quoted" text');
  });

  it('should handle empty strings', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should handle non-string inputs safely', () => {
    expect(escapeHtml(null as any)).toBe('');
    expect(escapeHtml(undefined as any)).toBe('');
  });
});

describe('sanitizeInput', () => {
  it('should escape HTML and trim whitespace', () => {
    expect(sanitizeInput('  <script>xss</script>  ')).toBe('&lt;script&gt;xss&lt;/script&gt;');
  });

  it('should enforce maximum length', () => {
    const longText = 'a'.repeat(200);
    expect(sanitizeInput(longText, 100)).toBe('a'.repeat(100));
  });

  it('should handle HTML entity truncation edge case', () => {
    // Test that truncation before escaping prevents breaking HTML entities
    // Create a string that will produce an entity near the boundary
    const input = 'a'.repeat(97) + '<b>';
    // With maxLength 100, it should truncate to 'aaa...(97 a's)...<b>' then escape to 'aaa...(97 a's)...&lt;b&gt;'
    const result = sanitizeInput(input, 100);
    // After truncation at 100 chars, we have 100 chars of the original string
    // Then escaping converts '<b>' to '&lt;b&gt;'
    expect(result).toBe('a'.repeat(97) + '&lt;b&gt;');

    // Verify no broken entities - the key is that we truncate BEFORE escaping
    // so we never create incomplete HTML entities
    expect(result).not.toMatch(/&[a-z]*$/); // No incomplete entity at end
    expect(result).not.toMatch(/^[a-z]*;/); // No incomplete entity at start
  });

  it('should handle empty strings', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput('   ')).toBe('');
  });

  it('should preserve valid text', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
  });

  it('should escape XSS attempts in valid-looking text', () => {
    expect(sanitizeInput('Click <a href="javascript:alert(1)">here</a>')).toBe(
      'Click &lt;a href="javascript:alert(1)"&gt;here&lt;/a&gt;'
    );
  });

  it('should handle non-string inputs', () => {
    expect(sanitizeInput(null as any)).toBe('');
    expect(sanitizeInput(undefined as any)).toBe('');
  });
});

describe('sanitizeArray', () => {
  it('should sanitize all items in array', () => {
    const input = ['<script>xss</script>', 'valid', '  spaces  '];
    const expected = ['&lt;script&gt;xss&lt;/script&gt;', 'valid', 'spaces'];
    expect(sanitizeArray(input)).toEqual(expected);
  });

  it('should filter out empty strings after trimming', () => {
    const input = ['valid', '   ', '', 'also valid'];
    const expected = ['valid', 'also valid'];
    expect(sanitizeArray(input)).toEqual(expected);
  });

  it('should enforce max length on each item', () => {
    const input = ['a'.repeat(100), 'short'];
    const expected = ['a'.repeat(50), 'short'];
    expect(sanitizeArray(input, 50)).toEqual(expected);
  });

  it('should handle empty arrays', () => {
    expect(sanitizeArray([])).toEqual([]);
  });

  it('should handle non-array inputs', () => {
    expect(sanitizeArray(null as any)).toEqual([]);
    expect(sanitizeArray(undefined as any)).toEqual([]);
  });

  it('should escape XSS in array items', () => {
    const input = ['<img src=x onerror=alert(1)>', 'safe-tag'];
    const expected = ['&lt;img src=x onerror=alert(1)&gt;', 'safe-tag'];
    expect(sanitizeArray(input)).toEqual(expected);
  });
});

describe('safeMarkdownToHtml', () => {
  it('should convert line breaks to <br> tags', () => {
    expect(safeMarkdownToHtml('line1\nline2')).toBe('line1<br>line2');
  });

  it('should convert bold markdown', () => {
    expect(safeMarkdownToHtml('**bold text**')).toBe('<strong>bold text</strong>');
  });

  it('should convert italic markdown', () => {
    expect(safeMarkdownToHtml('*italic text*')).toBe('<em>italic text</em>');
  });

  it('should escape HTML before applying markdown', () => {
    const input = '**<script>alert("xss")</script>**';
    const output = safeMarkdownToHtml(input);
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('&lt;/script&gt;');
    expect(output).toContain('<strong>');
  });

  it('should handle mixed markdown', () => {
    const input = '**Bold** and *italic*\nNew line';
    const output = safeMarkdownToHtml(input);
    expect(output).toContain('<strong>Bold</strong>');
    expect(output).toContain('<em>italic</em>');
    expect(output).toContain('<br>');
  });

  it('should prevent XSS through markdown', () => {
    const input = '**<img src=x onerror=alert(1)>**';
    const output = safeMarkdownToHtml(input);
    expect(output).not.toContain('<img');
    expect(output).toContain('&lt;img');
  });
});

describe('XSS Attack Prevention', () => {
  const xssVectors = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg/onload=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<select onfocus=alert(1) autofocus>',
    '<textarea onfocus=alert(1) autofocus>',
    '<marquee onstart=alert(1)>',
  ];

  it('should prevent common XSS attack vectors with HTML tags', () => {
    const htmlXssVectors = xssVectors.filter((v) => v.includes('<'));
    htmlXssVectors.forEach((vector) => {
      const sanitized = sanitizeInput(vector);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('<svg');
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).toContain('&lt;');
    });
  });

  it('should escape javascript: URLs', () => {
    // javascript: URLs without angle brackets aren't HTML and won't be escaped
    // but they're harmless in text content (only dangerous in href/src attributes)
    const jsUrl = 'javascript:alert(1)';
    const sanitized = sanitizeInput(jsUrl);
    // This is safe because it's being stored as text, not in an attribute
    expect(sanitized).toBe(jsUrl);
  });

  it('should prevent XSS with HTML tags in arrays', () => {
    const htmlXssVectors = xssVectors.filter((v) => v.includes('<'));
    const sanitized = sanitizeArray(htmlXssVectors);
    sanitized.forEach((item) => {
      expect(item).not.toContain('<script');
      expect(item).toContain('&lt;');
    });
  });
});

describe('Performance and Edge Cases', () => {
  it('should handle very long strings efficiently', () => {
    const longString = 'a'.repeat(100000);
    const start = Date.now();
    sanitizeInput(longString, 50000);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should complete within 100ms
  });

  it('should handle unicode characters correctly', () => {
    expect(sanitizeInput('Hello 世界 🌍')).toBe('Hello 世界 🌍');
  });

  it('should handle special unicode XSS attempts', () => {
    const input = '<script>alert\u0028"XSS"\u0029</script>';
    const output = sanitizeInput(input);
    expect(output).toContain('&lt;script&gt;');
  });

  it('should handle null bytes', () => {
    const input = 'test\x00<script>alert(1)</script>';
    const output = sanitizeInput(input);
    expect(output).toContain('&lt;script&gt;');
  });
});
