import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { queryKeys } from '@/lib/queryClient';
import { PlayCircle, BookOpen } from 'lucide-react';
import type { Category } from '@shared/schema';

const LAST_CERTIFICATION_KEY = 'certlab_last_certification';

interface CertificationSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartQuiz: (categoryId: number, categoryName: string) => void;
  isLoading?: boolean;
}

export function CertificationSelectionDialog({
  open,
  onOpenChange,
  onStartQuiz,
  isLoading = false,
}: CertificationSelectionDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Load last selected certification from localStorage
  useEffect(() => {
    if (open && categories.length > 0) {
      const lastCertificationId = localStorage.getItem(LAST_CERTIFICATION_KEY);
      if (lastCertificationId && categories.some((c) => c.id.toString() === lastCertificationId)) {
        setSelectedCategoryId(lastCertificationId);
      } else if (categories.length > 0) {
        // Default to first category if no last selection or if the last selection is no longer valid
        setSelectedCategoryId(categories[0].id.toString());
      }
    }
  }, [open, categories]);

  const handleStartQuiz = () => {
    if (!selectedCategoryId) return;

    const categoryId = parseInt(selectedCategoryId, 10);
    if (isNaN(categoryId)) return;

    const selectedCategory = categories.find((c) => c.id === categoryId);

    if (selectedCategory) {
      // Save selection for next time
      localStorage.setItem(LAST_CERTIFICATION_KEY, selectedCategoryId);
      onStartQuiz(categoryId, selectedCategory.name);
    }
  };

  const selectedCategory = categories.find((c) => c.id.toString() === selectedCategoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Select Certification
          </DialogTitle>
          <DialogDescription>
            Choose which certification you want to practice. Your selection will be remembered for
            future sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label className="text-sm font-medium mb-3 block">Available Certifications</Label>

          {categories.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>No certifications available.</p>
              <p className="text-sm mt-1">Please add certifications first.</p>
            </div>
          ) : (
            <RadioGroup
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
              className="space-y-3"
            >
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCategoryId === category.id.toString()
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedCategoryId(category.id.toString())}
                >
                  <RadioGroupItem
                    value={category.id.toString()}
                    id={`cert-${category.id}`}
                    className="shrink-0"
                  />
                  <Label htmlFor={`cert-${category.id}`} className="flex-1 cursor-pointer">
                    <div className="font-medium">{category.name}</div>
                    {category.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {category.description}
                      </div>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">10 questions</span> will be selected from
            the{' '}
            <span className="font-medium text-foreground">
              {selectedCategory?.name || 'selected certification'}
            </span>{' '}
            category.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleStartQuiz}
            disabled={isLoading || !selectedCategoryId || categories.length === 0}
            className="gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            {isLoading ? 'Starting...' : 'Start Practice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
