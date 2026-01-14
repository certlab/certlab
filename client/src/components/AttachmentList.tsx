/**
 * Attachment List Component
 *
 * Displays a list of attachments with preview, download, and remove actions.
 */

import { useState } from 'react';
import {
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  ExternalLink,
  Download,
  Trash2,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Attachment, AttachmentType } from '@shared/schema';

interface AttachmentListProps {
  attachments: Attachment[];
  onRemove?: (attachmentId: string) => void;
  onPreview?: (attachment: Attachment) => void;
  readonly?: boolean;
  className?: string;
}

export function AttachmentList({
  attachments,
  onRemove,
  onPreview,
  readonly = false,
  className,
}: AttachmentListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  const getAttachmentIcon = (type: AttachmentType) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-600" />;
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'pptx':
        return <FileText className="h-5 w-5 text-orange-600" />;
      case 'xlsx':
        return <FileText className="h-5 w-5 text-green-600" />;
      case 'image':
        return <Image className="h-5 w-5 text-purple-600" />;
      case 'video':
        return <Video className="h-5 w-5 text-pink-600" />;
      case 'audio':
        return <Music className="h-5 w-5 text-indigo-600" />;
      case 'zip':
        return <Archive className="h-5 w-5 text-gray-600" />;
      case 'link':
        return <ExternalLink className="h-5 w-5 text-blue-600" />;
      default:
        return <File className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAttachmentTypeBadge = (type: AttachmentType) => {
    const typeLabels: Record<AttachmentType, string> = {
      pdf: 'PDF',
      docx: 'Word',
      pptx: 'PowerPoint',
      xlsx: 'Excel',
      zip: 'Archive',
      image: 'Image',
      audio: 'Audio',
      video: 'Video',
      link: 'Link',
      other: 'File',
    };
    return typeLabels[type] || 'File';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDownload = (attachment: Attachment) => {
    // Open in new tab for download
    window.open(attachment.url, '_blank');
  };

  const handlePreview = (attachment: Attachment) => {
    if (onPreview) {
      onPreview(attachment);
    } else {
      // Default: open in new tab
      window.open(attachment.url, '_blank');
    }
  };

  const handleRemoveClick = (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setDeleteDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (selectedAttachment && onRemove) {
      onRemove(selectedAttachment.id);
      setDeleteDialogOpen(false);
      setSelectedAttachment(null);
    }
  };

  if (attachments.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-8 text-center">
            <File className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600">No attachments yet</p>
            {!readonly && (
              <p className="text-sm text-gray-500 mt-1">Upload files or add links to get started</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <Card key={attachment.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">{getAttachmentIcon(attachment.type)}</div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{attachment.name}</h4>
                      {attachment.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {attachment.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {getAttachmentTypeBadge(attachment.type)}
                        </Badge>
                        {attachment.fileSize && (
                          <span className="text-xs text-gray-500">
                            {formatFileSize(attachment.fileSize)}
                          </span>
                        )}
                        {attachment.isExternal && (
                          <Badge variant="outline" className="text-xs">
                            External
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(attachment.uploadedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Preview button for images and videos */}
                      {(attachment.type === 'image' || attachment.type === 'video') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(attachment)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Download button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        title="Download / Open"
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      {/* Remove button (owner only) */}
                      {!readonly && onRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveClick(attachment)}
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Attachment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{selectedAttachment?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
