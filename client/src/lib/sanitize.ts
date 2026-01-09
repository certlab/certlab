/**
 * HTML Sanitization and Safe Markdown Rendering Utilities
 *
 * These utilities help prevent XSS attacks when rendering user-generated content
 * by escaping HTML entities before applying any transformations.
 */

/**
 * Safely escapes HTML entities in a string to prevent XSS attacks.
 * This function creates a text node and extracts its escaped content,
 * ensuring all HTML special characters are properly encoded.
 *
 * @param text - The raw text to escape
 * @returns The escaped text safe for HTML insertion
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert("xss")&lt;/script&gt;'
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitizes user input by escaping HTML and trimming whitespace.
 * Use this for all user-submitted text before storage or display.
 *
 * @param input - The user input to sanitize
 * @param maxLength - Optional maximum length (truncates if exceeded)
 * @returns Sanitized text safe for storage and display
 *
 * @example
 * sanitizeInput('<script>alert("xss")</script>', 100)
 * // Returns: '&lt;script&gt;alert("xss")&lt;/script&gt;'
 */
export function sanitizeInput(input: string, maxLength?: number): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Truncate if needed
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Escape HTML to prevent XSS
  return escapeHtml(sanitized);
}

/**
 * Sanitizes an array of strings (e.g., tags, topics).
 * Filters out empty strings and escapes HTML in each item.
 *
 * @param items - Array of strings to sanitize
 * @param maxLength - Optional maximum length for each item
 * @returns Sanitized array
 *
 * @example
 * sanitizeArray(['<script>xss</script>', 'valid-tag', '  '], 50)
 * // Returns: ['&lt;script&gt;xss&lt;/script&gt;', 'valid-tag']
 */
export function sanitizeArray(items: string[], maxLength?: number): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => sanitizeInput(item, maxLength)).filter((item) => item.length > 0);
}

/**
 * Safely converts markdown-like content to HTML by first escaping all HTML
 * entities, then applying safe markdown transformations.
 *
 * Supports:
 * - Line breaks (\n → <br>)
 * - Bold text (**text** → <strong>text</strong>)
 * - Italic text (*text* → <em>text</em>)
 *
 * @param content - The markdown-like content to convert
 * @returns HTML string safe for dangerouslySetInnerHTML
 *
 * @example
 * safeMarkdownToHtml('**Hello** *World*')
 * // Returns: '<strong>Hello</strong> <em>World</em>'
 */
export function safeMarkdownToHtml(content: string): string {
  // First escape all HTML to prevent XSS
  let safe = escapeHtml(content);
  // Then apply markdown transformations on the escaped content
  safe = safe.replace(/\n/g, '<br>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return safe;
}

/**
 * Converts markdown-like content to HTML for PDF export with proper escaping.
 * This function provides more extensive markdown support for document formatting.
 *
 * Supports:
 * - Headers (# ## ###)
 * - Bold and italic text
 * - Lists (- and numbered)
 * - Horizontal rules (---)
 * - Paragraphs
 *
 * @param content - The markdown content to convert
 * @returns HTML string safe for PDF document body
 */
export function markdownToPdfHtml(content: string): string {
  // First escape all HTML to prevent XSS
  const escaped = escapeHtml(content);

  return escaped
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium mt-3 mb-1">$1</h3>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/---/g, '<hr class="my-4 border-gray-300">')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br>');
}

/**
 * Options for generating a study notes PDF
 */
export interface StudyNotesPdfOptions {
  /** Title for the PDF document */
  title: string;
  /** Category names to display in the header */
  categoryNames: string;
  /** Date string to display in the header */
  dateStr: string;
  /** Quiz score to display (null if no score) */
  score: number | null;
  /** The markdown content to include in the PDF */
  content: string;
}

/**
 * Generates HTML for a printable study notes PDF.
 * All user-provided content is properly escaped to prevent XSS.
 *
 * @param options - Configuration for the PDF generation
 * @returns Complete HTML document string for the print window
 */
export function generateStudyNotesPdfHtml(options: StudyNotesPdfOptions): string {
  const { title, categoryNames, dateStr, score, content } = options;
  const htmlContent = markdownToPdfHtml(content);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)} - CertLab Study Notes</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            line-height: 1.6;
          }
          h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
          h2 { color: #1e3a8a; margin-top: 24px; }
          h3 { color: #1e40af; }
          .header-info { 
            background: #f0f9ff; 
            padding: 16px; 
            border-radius: 8px; 
            margin-bottom: 24px;
            border-left: 4px solid #3b82f6;
          }
          .header-info p { margin: 4px 0; }
          strong { color: #1e40af; }
          hr { margin: 24px 0; border: none; border-top: 1px solid #e5e7eb; }
          li { margin-bottom: 4px; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-info">
          <p><strong>Category:</strong> ${escapeHtml(categoryNames)}</p>
          <p><strong>Generated:</strong> ${escapeHtml(dateStr)}</p>
          ${score !== null ? `<p><strong>Quiz Score:</strong> ${escapeHtml(String(score))}%</p>` : ''}
        </div>
        <div class="content">
          <p class="mb-2">${htmlContent}</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;
}
