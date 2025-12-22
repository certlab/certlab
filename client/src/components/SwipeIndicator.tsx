/**
 * Swipe Indicator Component
 *
 * Provides visual feedback during swipe gestures to improve user experience.
 * Shows subtle animation when user swipes left or right.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwipeIndicatorProps {
  direction: 'left' | 'right' | null;
  duration?: number; // How long to show the indicator (ms)
}

export function SwipeIndicator({ direction, duration = 500 }: SwipeIndicatorProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (direction) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [direction, duration]);

  return (
    <AnimatePresence>
      {show && direction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        >
          <div className="bg-primary/90 text-primary-foreground rounded-full p-4 shadow-2xl">
            {direction === 'left' ? (
              <ChevronLeft className="w-8 h-8" />
            ) : (
              <ChevronRight className="w-8 h-8" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage swipe indicator state
 * Use this with the useSwipe hook to show visual feedback
 */
export function useSwipeIndicator() {
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const showSwipeLeft = () => setSwipeDirection('left');
  const showSwipeRight = () => setSwipeDirection('right');

  return {
    swipeDirection,
    showSwipeLeft,
    showSwipeRight,
  };
}
