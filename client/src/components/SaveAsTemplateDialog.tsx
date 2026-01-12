import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import type {
  QuizTemplateLibrary,
  MaterialTemplateLibrary,
  TemplateVisibility,
} from '@shared/schema';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateType: 'quiz' | 'material';
  templateData:
    | Omit<QuizTemplateLibrary, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'visibility'>
    | Omit<MaterialTemplateLibrary, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'visibility'>;
  onSuccess?: () => void;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  templateType,
  templateData,
  onSuccess,
}: SaveAsTemplateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(templateData.title);
  const [description, setDescription] = useState(templateData.description);
  const [visibility, setVisibility] = useState<TemplateVisibility>('private');
  const [duplicateCheck, setDuplicateCheck] = useState<{
    isDuplicate: boolean;
    existingTemplateId?: number;
  } | null>(null);

  // Check for duplicates when title changes
  const checkDuplicateMutation = useMutation({
    mutationFn: async (checkTitle: string) => {
      if (!user) throw new Error('User not authenticated');
      return storage.checkTemplateDuplicate(checkTitle, templateType, user.id, user.tenantId);
    },
    onSuccess: (result) => {
      setDuplicateCheck(result);
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const baseTemplate = {
        ...templateData,
        title,
        description,
        visibility,
        userId: user.id,
        tenantId: user.tenantId,
      };

      if (templateType === 'quiz') {
        return storage.createQuizTemplateLibrary(
          baseTemplate as Omit<QuizTemplateLibrary, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
        );
      } else {
        return storage.createMaterialTemplateLibrary(
          baseTemplate as Omit<
            MaterialTemplateLibrary,
            'id' | 'createdAt' | 'updatedAt' | 'usageCount'
          >
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: 'Template saved',
        description: 'Your template has been saved to the library.',
      });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleTitleBlur = () => {
    if (title && title !== templateData.title) {
      checkDuplicateMutation.mutate(title);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your template.',
        variant: 'destructive',
      });
      return;
    }

    saveTemplateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this {templateType} as a reusable template in your library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Template Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Enter a descriptive title"
            />
            {duplicateCheck?.isDuplicate && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A template with this title already exists in your library.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description to help you remember what this template is for"
              rows={3}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as TemplateVisibility)}
            >
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Private</span>
                    <span className="text-xs text-muted-foreground">Only visible to you</span>
                  </div>
                </SelectItem>
                <SelectItem value="org">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Organization</span>
                    <span className="text-xs text-muted-foreground">
                      Visible to your organization
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Public</span>
                    <span className="text-xs text-muted-foreground">Visible to everyone</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saveTemplateMutation.isPending ||
              !title.trim() ||
              duplicateCheck?.isDuplicate ||
              checkDuplicateMutation.isPending
            }
          >
            {saveTemplateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
