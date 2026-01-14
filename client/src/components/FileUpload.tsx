/**
 * File Upload Component
 *
 * Provides drag-and-drop and browse-based file upload functionality
 * for material attachments with progress tracking.
 */

import { useCallback, useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, File, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadFile, validateFile, type UploadProgress } from '@/lib/firebase-storage';
import { generateId } from '@/lib/firestore-storage';
import { ATTACHMENT_CONFIG } from '@shared/schema';
import type { AttachmentType } from '@shared/schema';

interface FileUploadProps {
  userId: string;
  resourceType: 'lecture' | 'quiz' | 'material';
  resourceId: number;
  onUploadComplete: (result: {
    url: string;
    storagePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    type: AttachmentType;
  }) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  acceptedFileTypes?: string[];
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  attachmentId: string;
}

export function FileUpload({
  userId,
  resourceType,
  resourceId,
  onUploadComplete,
  onUploadError,
  maxFiles = 20,
  acceptedFileTypes,
  className,
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      // Generate unique attachment ID using shared utility
      const attachmentId = generateId();

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        if (onUploadError) {
          onUploadError(validation.error || 'Invalid file');
        }
        return;
      }

      // Add to uploading files
      const newUploadingFile: UploadingFile = {
        file,
        progress: 0,
        status: 'uploading',
        attachmentId,
      };
      setUploadingFiles((prev) => [...prev, newUploadingFile]);

      try {
        // Upload file
        const result = await uploadFile(
          file,
          userId,
          resourceType,
          resourceId,
          attachmentId,
          (progress: UploadProgress) => {
            // Update progress
            setUploadingFiles((prev) =>
              prev.map((uf) =>
                uf.attachmentId === attachmentId ? { ...uf, progress: progress.progress } : uf
              )
            );
          }
        );

        // Mark as success
        setUploadingFiles((prev) =>
          prev.map((uf) =>
            uf.attachmentId === attachmentId ? { ...uf, status: 'success', progress: 100 } : uf
          )
        );

        // Notify parent
        onUploadComplete({
          url: result.url,
          storagePath: result.storagePath,
          fileName: file.name,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          type: result.type,
        });

        // Remove from list after 2 seconds
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((uf) => uf.attachmentId !== attachmentId));
        }, 2000);
      } catch (err: any) {
        // Mark as error
        const errorMessage = err.message || 'Upload failed';
        setUploadingFiles((prev) =>
          prev.map((uf) =>
            uf.attachmentId === attachmentId ? { ...uf, status: 'error', error: errorMessage } : uf
          )
        );
        if (onUploadError) {
          onUploadError(errorMessage);
        }
      }
    },
    [userId, resourceType, resourceId, onUploadComplete, onUploadError]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError(null);

      // Convert FileList to array
      const filesArray = Array.from(files);

      // Check max files
      if (filesArray.length + uploadingFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Upload each file
      filesArray.forEach((file) => handleUpload(file));
    },
    [handleUpload, uploadingFiles.length, maxFiles]
  );

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = e.dataTransfer.files;
      handleFiles(files);
    },
    [handleFiles]
  );

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input value so the same file can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (attachmentId: string) => {
    setUploadingFiles((prev) => prev.filter((uf) => uf.attachmentId !== attachmentId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const maxSizeMB = ATTACHMENT_CONFIG.maxFileSize / (1024 * 1024);

  return (
    <div className={className}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes?.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 font-medium mb-2">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supported: PDF, DOCX, PPTX, XLSX, ZIP, images, audio, video
            </p>
            <p className="text-sm text-gray-500">
              Maximum file size: {maxSizeMB}MB | Maximum {maxFiles} files
            </p>
          </div>
        )}
      </div>

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((uploadingFile) => (
            <Card key={uploadingFile.attachmentId}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <File className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                      <div className="flex items-center gap-2">
                        {uploadingFile.status === 'success' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {uploadingFile.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadingFile.attachmentId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>{formatFileSize(uploadingFile.file.size)}</span>
                      <span>•</span>
                      <span>{uploadingFile.file.type}</span>
                    </div>
                    {uploadingFile.status === 'uploading' && (
                      <Progress value={uploadingFile.progress} className="h-1" />
                    )}
                    {uploadingFile.status === 'error' && (
                      <p className="text-xs text-red-600">{uploadingFile.error}</p>
                    )}
                    {uploadingFile.status === 'success' && (
                      <p className="text-xs text-green-600">Upload complete</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
