/**
 * Learning Materials Selector Component
 *
 * Displays available learning materials for selected categories and allows
 * users to select them for association with a quiz.
 */

import { Loader2, AlertCircle, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Lecture } from '@shared/schema';

export interface LearningMaterialsSelectorProps {
  /** Array of available learning materials */
  materials: Lecture[];
  /** Currently selected material IDs */
  selectedIds: number[];
  /** Callback when selection changes */
  onSelectionChange: (ids: number[]) => void;
  /** Whether materials are loading */
  isLoading?: boolean;
  /** Error state */
  isError?: boolean;
  /** Whether any categories are selected (controls visibility) */
  hasCategoriesSelected: boolean;
}

/**
 * LearningMaterialsSelector component
 *
 * Displays a list of learning materials that can be selected for a quiz.
 * Only shown when categories are selected.
 *
 * @example
 * ```tsx
 * <LearningMaterialsSelector
 *   materials={learningMaterials}
 *   selectedIds={selectedMaterialIds}
 *   onSelectionChange={setSelectedMaterialIds}
 *   isLoading={materialsLoading}
 *   isError={materialsError}
 *   hasCategoriesSelected={selectedCategories.length > 0}
 * />
 * ```
 */
export function LearningMaterialsSelector({
  materials,
  selectedIds,
  onSelectionChange,
  isLoading = false,
  isError = false,
  hasCategoriesSelected,
}: LearningMaterialsSelectorProps) {
  // Don't render if no categories selected
  if (!hasCategoriesSelected) {
    return null;
  }

  const handleToggle = (materialId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, materialId]);
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== materialId));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Materials (Optional)</CardTitle>
        <CardDescription>
          Select study materials to associate with this quiz. Materials help guide question
          selection and provide context for learners.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading learning materials...
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load learning materials. You can still create the quiz without selecting
              materials.
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !isError && materials.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No learning materials available for the selected categories.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You can still create the quiz without materials.
            </p>
          </div>
        )}

        {/* Materials List */}
        {!isLoading && !isError && materials.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Found {materials.length} learning material
              {materials.length !== 1 ? 's' : ''} for the selected categories.
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded-lg p-2">
              {materials.map((material) => (
                <label
                  key={material.id}
                  className="flex items-start space-x-3 p-3 border rounded cursor-pointer hover:bg-accent transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.includes(material.id!)}
                    onCheckedChange={(checked) => handleToggle(material.id!, checked as boolean)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{material.title}</div>
                    {material.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {material.description}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {material.difficultyLevel && (
                        <Badge variant="outline" className="text-xs">
                          Level {material.difficultyLevel}
                        </Badge>
                      )}
                      {material.contentType && (
                        <Badge variant="secondary" className="text-xs">
                          {material.contentType}
                        </Badge>
                      )}
                      {material.isRead && (
                        <Badge variant="default" className="text-xs">
                          Read
                        </Badge>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {selectedIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedIds.length} material{selectedIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
