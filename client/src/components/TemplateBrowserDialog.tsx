import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TemplateBrowser } from '@/components/TemplateBrowser';
import type { TemplateLibraryItem } from '@shared/schema';

interface TemplateBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateType?: 'quiz' | 'material';
  onSelect: (template: TemplateLibraryItem) => void;
}

export function TemplateBrowserDialog({
  open,
  onOpenChange,
  templateType,
  onSelect,
}: TemplateBrowserDialogProps) {
  const handleSelect = (template: TemplateLibraryItem) => {
    onSelect(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {templateType === 'quiz'
              ? 'Browse Quiz Templates'
              : templateType === 'material'
                ? 'Browse Study Material Templates'
                : 'Browse Templates'}
          </DialogTitle>
        </DialogHeader>
        <TemplateBrowser
          templateType={templateType}
          onSelect={handleSelect}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
