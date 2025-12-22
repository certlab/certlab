import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Initialize Mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

/**
 * Component to render Mermaid diagrams
 * Supports flowcharts, sequence diagrams, class diagrams, etc.
 */
export function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagramId] = useState(() => `mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !chart) return;

      try {
        setError(null);

        // Validate that the chart string looks like Mermaid syntax
        const trimmedChart = chart.trim();
        if (!trimmedChart) {
          setError('Empty diagram');
          return;
        }

        // Render the diagram
        const { svg } = await mermaid.render(diagramId, trimmedChart);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [chart, diagramId]);

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Diagram Error:</strong> {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`p-4 overflow-auto ${className}`}>
      <div ref={containerRef} className="mermaid-container flex justify-center items-center" />
    </Card>
  );
}

/**
 * Helper function to detect Mermaid diagram blocks in text
 * Looks for ```mermaid ... ``` code blocks
 */
export function parseMermaidDiagrams(
  text: string
): Array<{ type: 'text' | 'diagram'; content: string }> {
  const parts: Array<{ type: 'text' | 'diagram'; content: string }> = [];
  let currentIndex = 0;

  const regex = /```mermaid\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex, match.index),
      });
    }

    // Add the diagram
    parts.push({
      type: 'diagram',
      content: match[1].trim(),
    });

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(currentIndex),
    });
  }

  return parts;
}

/**
 * Example Mermaid diagram templates for common use cases
 */
export const mermaidTemplates = {
  flowchart: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,

  sequence: `sequenceDiagram
    participant User
    participant System
    User->>System: Request
    System->>User: Response`,

  classDiagram: `classDiagram
    class Animal {
      +String name
      +int age
      +makeSound()
    }
    class Dog {
      +String breed
      +bark()
    }
    Animal <|-- Dog`,

  stateDiagram: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing
    Processing --> Complete
    Processing --> Error
    Complete --> [*]
    Error --> Idle`,

  gantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1: 2024-01-01, 7d
    Task 2: 2024-01-08, 5d`,
};
