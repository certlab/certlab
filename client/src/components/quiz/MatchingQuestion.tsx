import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedExplanation } from '@/components/EnhancedExplanation';
import { X } from 'lucide-react';
import { deterministicShuffle } from '@/lib/shuffle-utils';
import type { Question, QuizState } from './types';
import type { Question as SchemaQuestion, MatchingPair } from '@shared/schema';

interface MatchingQuestionProps {
  question: Question;
  state: QuizState;
  onAnswerChange: (value: Record<number, number>) => void;
}

export function MatchingQuestion({ question, state, onAnswerChange }: MatchingQuestionProps) {
  const matchingPairs = useMemo(
    () => (question.matchingPairs || []) as MatchingPair[],
    [question.matchingPairs]
  );
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>(
    typeof state.selectedAnswer === 'object' && !Array.isArray(state.selectedAnswer)
      ? (state.selectedAnswer as Record<number, number>)
      : {}
  );

  // Shuffle right side items for display (consistent shuffle based on question id)
  const [shuffledRightItems] = useState(() => {
    return deterministicShuffle(matchingPairs, question.id || 0);
  });

  // Use ref to track previous matches to avoid unnecessary updates
  const previousMatchesRef = useRef<string>('');

  // Update parent when matches change
  useEffect(() => {
    const matchesString = JSON.stringify(matches);

    // Only call onAnswerChange if matches actually changed
    if (matchesString !== previousMatchesRef.current) {
      previousMatchesRef.current = matchesString;
      onAnswerChange(matches);
    }
  }, [matches, onAnswerChange]);

  const handleLeftClick = (leftId: number) => {
    if (state.showFeedback) return;
    setSelectedLeft(selectedLeft === leftId ? null : leftId);
  };

  const handleRightClick = (rightId: number) => {
    if (state.showFeedback || selectedLeft === null) return;

    // Create new match
    const newMatches = { ...matches, [selectedLeft]: rightId };
    setMatches(newMatches);
    setSelectedLeft(null);
  };

  const handleRemoveMatch = (leftId: number) => {
    if (state.showFeedback) return;
    const newMatches = { ...matches };
    delete newMatches[leftId];
    setMatches(newMatches);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (state.showFeedback) return;

      const leftIds = matchingPairs.map((p) => p.id);

      if (event.key === 'Escape' && selectedLeft !== null) {
        setSelectedLeft(null);
        event.preventDefault();
      }

      // Navigate through left items with ArrowUp/ArrowDown
      if (selectedLeft !== null && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        const currentIndex = leftIds.indexOf(selectedLeft);
        if (event.key === 'ArrowDown' && currentIndex < leftIds.length - 1) {
          setSelectedLeft(leftIds[currentIndex + 1]);
        } else if (event.key === 'ArrowUp' && currentIndex > 0) {
          setSelectedLeft(leftIds[currentIndex - 1]);
        }
        event.preventDefault();
      }
    },
    [selectedLeft, matchingPairs, state.showFeedback]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isCorrectMatch = (leftId: number, rightId: number) => {
    const leftPair = matchingPairs.find((p) => p.id === leftId);
    const rightPair = matchingPairs.find((p) => p.id === rightId);

    // Check if the right text of the left pair matches the right text of the selected right pair
    return leftPair && rightPair && leftPair.right === rightPair.right;
  };

  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-medium text-foreground mb-3 sm:mb-4">
        {question.text}
      </h3>

      <p className="text-sm text-muted-foreground mb-4">
        Match each item on the left with its corresponding item on the right. Click an item on the
        left, then click its match on the right.
      </p>

      {/* Matching interface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Items</h4>
          {matchingPairs.map((pair) => {
            const isSelected = selectedLeft === pair.id;
            const hasMatch = matches[pair.id] !== undefined;
            const showCorrect = state.showFeedback && hasMatch;
            const isCorrect = showCorrect && isCorrectMatch(pair.id, matches[pair.id]);

            return (
              <div
                key={`left-${pair.id}`}
                role="button"
                tabIndex={state.showFeedback ? -1 : 0}
                aria-label={`Left item: ${pair.left}`}
                onClick={() => handleLeftClick(pair.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLeftClick(pair.id);
                  }
                }}
                className={`
                  p-3 rounded-lg border-2 transition-all cursor-pointer
                  ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : hasMatch
                        ? showCorrect
                          ? isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                            : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : 'border-gray-300 bg-gray-50 dark:bg-gray-800'
                        : 'border-gray-300 hover:border-gray-400'
                  }
                  ${state.showFeedback ? 'cursor-default' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{pair.left}</span>
                  {hasMatch && !state.showFeedback && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMatch(pair.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {showCorrect && <span className="text-lg">{isCorrect ? '✓' : '✗'}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Matches</h4>
          {shuffledRightItems.map((pair) => {
            const isMatched = Object.values(matches).includes(pair.id);

            return (
              <div
                key={`right-${pair.id}`}
                role="button"
                tabIndex={state.showFeedback || selectedLeft === null ? -1 : 0}
                aria-label={`Right item: ${pair.right}`}
                onClick={() => handleRightClick(pair.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRightClick(pair.id);
                  }
                }}
                className={`
                  p-3 rounded-lg border-2 transition-all
                  ${
                    selectedLeft !== null && !isMatched && !state.showFeedback
                      ? 'cursor-pointer border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/10'
                      : 'cursor-default border-gray-300'
                  }
                  ${isMatched ? 'bg-gray-100 dark:bg-gray-800 opacity-50' : ''}
                `}
              >
                <span className="text-sm">{pair.right}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-4">
        <Badge variant="secondary">
          {Object.keys(matches).length} of {matchingPairs.length} matched
        </Badge>
      </div>

      {/* Immediate Feedback Explanation */}
      {question.explanation && (
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            state.showFeedback
              ? 'max-h-[2000px] opacity-100 mt-4 sm:mt-6'
              : 'max-h-0 opacity-0 mt-0'
          }`}
          aria-hidden={!state.showFeedback}
        >
          <EnhancedExplanation question={question as SchemaQuestion} isCorrect={state.isCorrect} />
        </div>
      )}
    </div>
  );
}
