/**
 * VisibilitySelector Component
 *
 * Provides a UI for selecting the visibility level of quizzes, lectures, and other learning materials.
 * Supports three visibility levels: private, shared, and public.
 */

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lock, Users, Globe } from 'lucide-react';
import type { VisibilityLevel } from '@shared/schema';

interface VisibilitySelectorProps {
  value: VisibilityLevel;
  onChange: (value: VisibilityLevel) => void;
  disabled?: boolean;
  showDescriptions?: boolean;
}

export function VisibilitySelector({
  value,
  onChange,
  disabled = false,
  showDescriptions = true,
}: VisibilitySelectorProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="visibility-selector">Visibility</Label>
      <RadioGroup
        id="visibility-selector"
        value={value}
        onValueChange={(val) => onChange(val as VisibilityLevel)}
        disabled={disabled}
        className="space-y-3"
      >
        {/* Private */}
        <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="private" id="visibility-private" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="visibility-private" className="font-medium cursor-pointer text-base">
                Private
              </Label>
            </div>
            {showDescriptions && (
              <p className="text-sm text-muted-foreground mt-1">
                Only you can access this content. Others cannot see or access it.
              </p>
            )}
          </div>
        </div>

        {/* Shared */}
        <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="shared" id="visibility-shared" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="visibility-shared" className="font-medium cursor-pointer text-base">
                Shared
              </Label>
            </div>
            {showDescriptions && (
              <p className="text-sm text-muted-foreground mt-1">
                Share with specific users or groups. You control who has access.
              </p>
            )}
          </div>
        </div>

        {/* Public */}
        <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="public" id="visibility-public" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="visibility-public" className="font-medium cursor-pointer text-base">
                Public
              </Label>
            </div>
            {showDescriptions && (
              <p className="text-sm text-muted-foreground mt-1">
                Anyone with an account can access this content.
              </p>
            )}
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
