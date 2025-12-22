import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  formula: string;
  displayMode?: boolean; // true for block display, false for inline
  className?: string;
}

/**
 * Component to render LaTeX math formulas using KaTeX
 * Supports both inline and block display modes
 */
export function MathRenderer({ formula, displayMode = false, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && formula) {
      try {
        katex.render(formula, containerRef.current, {
          displayMode,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false,
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        if (containerRef.current) {
          containerRef.current.textContent = formula;
        }
      }
    }
  }, [formula, displayMode]);

  return (
    <div
      ref={containerRef}
      className={`math-renderer ${displayMode ? 'block my-4' : 'inline'} ${className}`}
    />
  );
}

/**
 * Helper function to detect and parse LaTeX formulas from text
 * Supports both $...$ (inline) and $$...$$ (block) syntax
 */
export function parseLatexFormulas(
  text: string
): Array<{ type: 'text' | 'math'; content: string; displayMode: boolean }> {
  const parts: Array<{ type: 'text' | 'math'; content: string; displayMode: boolean }> = [];
  let currentIndex = 0;

  // Match both $$ and $ (must check $$ first)
  const regex = /\$\$(.*?)\$\$|\$(.*?)\$/gs;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex, match.index),
        displayMode: false,
      });
    }

    // Add the formula
    const isBlock = match[0].startsWith('$$');
    parts.push({
      type: 'math',
      content: isBlock ? match[1] : match[2],
      displayMode: isBlock,
    });

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(currentIndex),
      displayMode: false,
    });
  }

  return parts;
}

/**
 * Component to render text with embedded LaTeX formulas
 */
interface TextWithMathProps {
  text: string;
  className?: string;
}

export function TextWithMath({ text, className = '' }: TextWithMathProps) {
  const parts = parseLatexFormulas(text);

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (part.type === 'math') {
          return <MathRenderer key={index} formula={part.content} displayMode={part.displayMode} />;
        }
        return <span key={index}>{part.content}</span>;
      })}
    </div>
  );
}
