/**
 * Attachment Manager Component
 *
 * Complete attachment management for materials and quizzes.
 * Handles file uploads, external links, and attachment display.
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload } from './FileUpload';
import { ExternalLinkInput } from './ExternalLinkInput';
import { AttachmentList } from './AttachmentList';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage-factory';
import { deleteFile } from '@/lib/firebase-storage';
import { queryKeys } from '@/lib/queryClient';
import type { Attachment, AttachmentType, InsertAttachment } from '@shared/schema';

interface AttachmentManagerProps {
  resourceType: 'lecture' | 'quiz' | 'material';
  resourceId: number;
  readonly?: boolean;
  className?: string;
}

export function AttachmentManager({
  resourceType,
  resourceId,
  readonly = false,
  className,
}: AttachmentManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');

  // Fetch attachments
  const {
    data: attachments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.attachments(user?.id || '', resourceType, resourceId),
    queryFn: async () => {
      if (!user?.id) return [];
      return await storage.getResourceAttachments(user.id, resourceType, resourceId);
    },
    enabled: !!user?.id,
  });

  // Add attachment mutation
  const addAttachmentMutation = useMutation({
    mutationFn: async (attachment: InsertAttachment) => {
      if (!user?.id) throw new Error('Not authenticated');
      return await storage.addAttachment(user.id, attachment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.attachments(user?.id || '', resourceType, resourceId),
      });
      toast({
        title: 'Attachment Added',
        description: 'The attachment has been added successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Add Attachment',
        description: error.message || 'An error occurred while adding the attachment.',
        variant: 'destructive',
      });
    },
  });

  // Remove attachment mutation
  const removeAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Find the attachment to get storage path
      const attachment = attachments.find((a: Attachment) => a.id === attachmentId);
      if (!attachment) throw new Error('Attachment not found');

      // Delete from Firebase Storage if it's a file (not external link)
      if (!attachment.isExternal && attachment.storagePath) {
        await deleteFile(attachment.storagePath);
      }

      // Delete from Firestore
      await storage.deleteAttachment(user.id, resourceType, resourceId, attachmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.attachments(user?.id || '', resourceType, resourceId),
      });
      toast({
        title: 'Attachment Removed',
        description: 'The attachment has been removed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Remove Attachment',
        description: error.message || 'An error occurred while removing the attachment.',
        variant: 'destructive',
      });
    },
  });

  // Handle file upload complete
  const handleFileUploadComplete = (result: {
    url: string;
    storagePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    type: AttachmentType;
  }) => {
    if (!user?.id) return;

    const attachment: InsertAttachment = {
      resourceType,
      resourceId,
      type: result.type,
      name: result.fileName,
      url: result.url,
      storagePath: result.storagePath,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      uploadedBy: user.id,
      isExternal: false,
    };

    addAttachmentMutation.mutate(attachment);
  };

  // Handle external link add
  const handleAddLink = (linkData: { name: string; url: string; description?: string }) => {
    if (!user?.id) return;

    const attachment: InsertAttachment = {
      resourceType,
      resourceId,
      type: 'link',
      name: linkData.name,
      description: linkData.description,
      url: linkData.url,
      uploadedBy: user.id,
      isExternal: true,
    };

    addAttachmentMutation.mutate(attachment);
    setActiveTab('upload'); // Switch back to upload tab
  };

  // Handle attachment remove
  const handleRemoveAttachment = (attachmentId: string) => {
    removeAttachmentMutation.mutate(attachmentId);
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">Loading attachments...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>
          Failed to load attachments. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-sm font-normal text-gray-500">({attachments.length})</span>
          )}
        </CardTitle>
        <CardDescription>Upload files or add links to supplemental resources</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Attachment list */}
        <AttachmentList
          attachments={attachments}
          onRemove={readonly ? undefined : handleRemoveAttachment}
          readonly={readonly}
        />

        {/* Add new attachments (owner only) */}
        {!readonly && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Plus className="h-4 w-4 mr-2" />
                Upload Files
              </TabsTrigger>
              <TabsTrigger value="link">
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-4">
              <FileUpload
                userId={user.id}
                resourceType={resourceType}
                resourceId={resourceId}
                onUploadComplete={handleFileUploadComplete}
                onUploadError={(error) => {
                  toast({
                    title: 'Upload Error',
                    description: error,
                    variant: 'destructive',
                  });
                }}
              />
            </TabsContent>
            <TabsContent value="link" className="mt-4">
              <ExternalLinkInput onAddLink={handleAddLink} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
