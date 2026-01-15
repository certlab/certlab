/**
 * Quiz Configuration Mode Toggle Component
 *
 * Provides a toggle switch to change between basic and advanced configuration modes
 * with localStorage persistence for user preference.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const VIEW_MODE_STORAGE_KEY = 'quiz-builder-view-mode';

export interface QuizConfigModeToggleProps {
  /** Current view mode */
  mode: 'basic' | 'advanced';
  /** Callback when mode changes */
  onModeChange: (mode: 'basic' | 'advanced') => void;
}

/**
 * QuizConfigModeToggle component
 *
 * Displays a toggle switch to switch between basic and advanced configuration modes.
 * Persists user preference in localStorage.
 *
 * @example
 * ```tsx
 * <QuizConfigModeToggle
 *   mode={viewMode}
 *   onModeChange={setViewMode}
 * />
 * ```
 */
export function QuizConfigModeToggle({ mode, onModeChange }: QuizConfigModeToggleProps) {
  const isAdvanced = mode === 'advanced';

  // Persist view mode changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save view mode preference:', error);
    }
  }, [mode]);

  const handleToggle = (checked: boolean) => {
    onModeChange(checked ? 'advanced' : 'basic');
  };

  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">Configuration Mode</h3>
            <p className="text-xs text-muted-foreground">
              {isAdvanced
                ? 'Advanced mode with all options and granular controls'
                : 'Basic mode with essential quiz settings only'}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <Label htmlFor="view-mode-toggle" className="text-sm">
              {isAdvanced ? 'Advanced' : 'Basic'}
            </Label>
            <Switch id="view-mode-toggle" checked={isAdvanced} onCheckedChange={handleToggle} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to get and manage quiz configuration view mode
 *
 * @returns Current mode and setter function
 *
 * @example
 * ```tsx
 * const [viewMode, setViewMode] = useQuizConfigMode();
 * ```
 */
export function useQuizConfigMode(): ['basic' | 'advanced', (mode: 'basic' | 'advanced') => void] {
  const [mode, setMode] = useState<'basic' | 'advanced'>(() => {
    // Load saved preference from localStorage
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return saved === 'advanced' ? 'advanced' : 'basic';
    } catch {
      return 'basic'; // Default to basic view
    }
  });

  return [mode, setMode];
}
