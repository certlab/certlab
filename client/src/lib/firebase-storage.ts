/**
 * Firebase Storage Service
 *
 * Provides file upload, download, and deletion functionality for material attachments.
 * Files are stored in Firebase Storage and metadata is stored in Firestore.
 *
 * Storage Structure:
 * /attachments/{userId}/{resourceType}/{resourceId}/{attachmentId}/{filename}
 *
 * @module firebase-storage
 */

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  type UploadTask,
  type StorageReference,
} from 'firebase/storage';
import { getFirestoreInstance } from './firestore-service';
import {
  ATTACHMENT_CONFIG,
  getAttachmentTypeFromMimeType,
  isValidAttachmentType,
} from '@shared/schema';
import type { AttachmentType } from '@shared/schema';

/**
 * Upload progress callback
 */
export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
  state: 'running' | 'paused' | 'success' | 'error';
}

/**
 * Upload result
 */
export interface UploadResult {
  url: string; // Download URL
  storagePath: string; // Storage path for deletion
  fileSize: number;
  mimeType: string;
  type: AttachmentType;
}

/**
 * Get Firebase Storage instance
 */
export function getStorageInstance() {
  getFirestoreInstance(); // This ensures Firebase is initialized
  return getStorage();
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > ATTACHMENT_CONFIG.maxFileSize) {
    const maxSizeMB = ATTACHMENT_CONFIG.maxFileSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  // Check file type
  if (!isValidAttachmentType(file.type)) {
    return {
      valid: false,
      error: `File type '${file.type}' is not supported. Supported types: PDF, DOCX, PPTX, XLSX, ZIP, images, audio, video.`,
    };
  }

  return { valid: true };
}

/**
 * Generate storage path for an attachment
 */
export function generateStoragePath(
  userId: string,
  resourceType: 'lecture' | 'quiz' | 'material',
  resourceId: number,
  attachmentId: string,
  filename: string
): string {
  // Sanitize filename to remove special characters
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${ATTACHMENT_CONFIG.storageBasePath}/${userId}/${resourceType}/${resourceId}/${attachmentId}/${sanitizedFilename}`;
}

/**
 * Upload a file to Firebase Storage
 *
 * @param file File to upload
 * @param userId User ID of the uploader
 * @param resourceType Type of resource (lecture, quiz, material)
 * @param resourceId ID of the resource
 * @param attachmentId Unique attachment ID
 * @param onProgress Optional progress callback
 * @returns Promise that resolves to upload result
 */
export async function uploadFile(
  file: File,
  userId: string,
  resourceType: 'lecture' | 'quiz' | 'material',
  resourceId: number,
  attachmentId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const storage = getStorageInstance();
  const storagePath = generateStoragePath(
    userId,
    resourceType,
    resourceId,
    attachmentId,
    file.name
  );
  const storageRef = ref(storage, storagePath);

  // Start upload
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  return new Promise<UploadResult>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Progress callback
        if (onProgress) {
          const progress: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            state: snapshot.state as any,
          };
          onProgress(progress);
        }
      },
      (error) => {
        // Error callback
        console.error('[Firebase Storage] Upload error:', error);
        reject(new Error(`Upload failed: ${error.message}`));
      },
      async () => {
        // Success callback
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const result: UploadResult = {
            url: downloadURL,
            storagePath,
            fileSize: file.size,
            mimeType: file.type,
            type: getAttachmentTypeFromMimeType(file.type),
          };
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Delete a file from Firebase Storage
 *
 * @param storagePath Storage path of the file to delete
 */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const storage = getStorageInstance();
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    console.log('[Firebase Storage] File deleted:', storagePath);
  } catch (error: any) {
    // If file doesn't exist, consider it already deleted
    if (error.code === 'storage/object-not-found') {
      console.warn('[Firebase Storage] File not found, skipping deletion:', storagePath);
      return;
    }
    throw error;
  }
}

/**
 * Delete all attachments for a resource
 *
 * @param userId User ID
 * @param resourceType Type of resource
 * @param resourceId ID of the resource
 */
export async function deleteResourceAttachments(
  userId: string,
  resourceType: 'lecture' | 'quiz' | 'material',
  resourceId: number
): Promise<void> {
  try {
    const storage = getStorageInstance();
    const folderPath = `${ATTACHMENT_CONFIG.storageBasePath}/${userId}/${resourceType}/${resourceId}`;
    const folderRef = ref(storage, folderPath);

    // List all files and folders
    const listResult = await listAll(folderRef);

    // Delete all files directly in this folder
    const deleteFilePromises = listResult.items.map((itemRef) => deleteObject(itemRef));

    // Recursively delete all subfolders (attachmentId folders)
    const deleteSubfolderPromises = listResult.prefixes.map(async (folderRef) => {
      const subFolderResult = await listAll(folderRef);
      const deletePromises = subFolderResult.items.map((itemRef) => deleteObject(itemRef));
      await Promise.all(deletePromises);
    });

    await Promise.all([...deleteFilePromises, ...deleteSubfolderPromises]);

    console.log('[Firebase Storage] Deleted all attachments for resource:', {
      userId,
      resourceType,
      resourceId,
      filesDeleted: listResult.items.length,
      foldersProcessed: listResult.prefixes.length,
    });
  } catch (error: any) {
    // If folder doesn't exist, that's fine
    if (error.code === 'storage/object-not-found') {
      console.warn('[Firebase Storage] No attachments found for resource');
      return;
    }
    throw error;
  }
}

/**
 * Get download URL for a file
 * (Usually already stored in attachment metadata, but can be regenerated if needed)
 *
 * @param storagePath Storage path of the file
 * @returns Download URL
 */
export async function getFileDownloadURL(storagePath: string): Promise<string> {
  const storage = getStorageInstance();
  const storageRef = ref(storage, storagePath);
  return await getDownloadURL(storageRef);
}

/**
 * Validate external URL
 *
 * @param url URL to validate
 * @returns Validation result
 */
export function validateExternalURL(url: string): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        valid: false,
        error: 'Only HTTP and HTTPS URLs are allowed',
      };
    }

    // URL looks valid
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}
