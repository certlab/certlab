import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedExplanation } from '@/components/EnhancedExplanation';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { deterministicShuffle } from '@/lib/shuffle-utils';
import type { Question, QuizState } from './types';
import type { Question as SchemaQuestion, OrderingItem } from '@shared/schema';

interface OrderingQuestionProps {
  question: Question;
  state: QuizState;
  onAnswerChange: (value: number[]) => void;
}

export function OrderingQuestion({ question, state, onAnswerChange }: OrderingQuestionProps) {
  const orderingItems = (question.orderingItems || []) as OrderingItem[];

  // Initialize with shuffled order (consistent shuffle based on question id)
  const [orderedItems, setOrderedItems] = useState<OrderingItem[]>(() => {
    // If we have a saved answer, use that order
    if (Array.isArray(state.selectedAnswer)) {
      const savedOrder = state.selectedAnswer as number[];
      return savedOrder
        .map((id) => orderingItems.find((item) => item.id === id))
        .filter((item): item is OrderingItem => item !== undefined);
    }

    // Otherwise, shuffle the items deterministically
    return deterministicShuffle(orderingItems, question.id || 0);
  });

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Use ref to track previous order to avoid unnecessary updates
  const previousOrderRef = useRef<string>('');

  // Update parent when order changes
  useEffect(() => {
    const order = orderedItems.map((item) => item.id);
    const orderString = JSON.stringify(order);

    // Only call onAnswerChange if the order actually changed
    if (orderString !== previousOrderRef.current) {
      previousOrderRef.current = orderString;
      onAnswerChange(order);
    }
  }, [orderedItems, onAnswerChange]);

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (state.showFeedback) return;
      if (toIndex < 0 || toIndex >= orderedItems.length) return;

      const newItems = [...orderedItems];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      setOrderedItems(newItems);
      setSelectedIndex(toIndex);
    },
    [orderedItems, state.showFeedback]
  );

  const handleMoveUp = (index: number) => {
    moveItem(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    moveItem(index, index + 1);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (state.showFeedback || selectedIndex === null) return;

      switch (event.key) {
        case 'ArrowUp':
        case 'k':
        case 'K':
          if (selectedIndex > 0) {
            moveItem(selectedIndex, selectedIndex - 1);
          }
          event.preventDefault();
          break;
        case 'ArrowDown':
        case 'j':
        case 'J':
          if (selectedIndex < orderedItems.length - 1) {
            moveItem(selectedIndex, selectedIndex + 1);
          }
          event.preventDefault();
          break;
        case 'Escape':
          setSelectedIndex(null);
          event.preventDefault();
          break;
      }
    },
    [selectedIndex, orderedItems.length, state.showFeedback, moveItem]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getItemStatus = (item: OrderingItem, currentIndex: number) => {
    if (!state.showFeedback) return null;
    return item.correctPosition === currentIndex ? 'correct' : 'incorrect';
  };

  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-medium text-foreground mb-3 sm:mb-4">
        {question.text}
      </h3>

      <p className="text-sm text-muted-foreground mb-4">
        Arrange the items in the correct order. Use the arrow buttons or keyboard arrows (↑/↓) to
        reorder items.
      </p>

      {/* Ordering interface */}
      <div className="space-y-2">
        {orderedItems.map((item, index) => {
          const isSelected = selectedIndex === index;
          const status = getItemStatus(item, index);

          return (
            <div
              key={`item-${item.id}`}
              role="button"
              tabIndex={state.showFeedback ? -1 : 0}
              aria-label={`Item ${index + 1}: ${item.text}`}
              onClick={() => {
                if (!state.showFeedback) {
                  setSelectedIndex(index);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!state.showFeedback) {
                    setSelectedIndex(index);
                  }
                }
              }}
              className={`
                flex items-center gap-3 p-4 rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : status === 'correct'
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : status === 'incorrect'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        : 'border-gray-300'
                }
                ${state.showFeedback ? 'cursor-default' : 'cursor-pointer hover:border-gray-400'}
              `}
            >
              {/* Drag handle icon */}
              <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0" />

              {/* Position number */}
              <Badge
                variant={
                  status === 'correct'
                    ? 'default'
                    : status === 'incorrect'
                      ? 'destructive'
                      : 'secondary'
                }
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              >
                {index + 1}
              </Badge>

              {/* Item text */}
              <span className="text-sm flex-1">{item.text}</span>

              {/* Move buttons */}
              {!state.showFeedback && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveUp(index);
                    }}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveDown(index);
                    }}
                    disabled={index === orderedItems.length - 1}
                    className="h-8 w-8 p-0"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Feedback indicator */}
              {status && (
                <span className="text-lg flex-shrink-0">{status === 'correct' ? '✓' : '✗'}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Keyboard shortcuts hint */}
      {!state.showFeedback && (
        <p className="text-xs text-muted-foreground mt-3">
          Keyboard shortcuts: Select an item, then use ↑/↓ or J/K to move it
        </p>
      )}

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
