/**
 * Tests for attachment validation and helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  getAttachmentTypeFromMimeType,
  isValidAttachmentType,
  ATTACHMENT_CONFIG,
} from '@shared/schema';

describe('Attachment Validation', () => {
  describe('getAttachmentTypeFromMimeType', () => {
    it('should identify PDF files', () => {
      expect(getAttachmentTypeFromMimeType('application/pdf')).toBe('pdf');
    });

    it('should identify Word documents', () => {
      expect(
        getAttachmentTypeFromMimeType(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).toBe('docx');
      expect(getAttachmentTypeFromMimeType('application/msword')).toBe('docx');
    });

    it('should identify PowerPoint files', () => {
      expect(
        getAttachmentTypeFromMimeType(
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
      ).toBe('pptx');
      expect(getAttachmentTypeFromMimeType('application/vnd.ms-powerpoint')).toBe('pptx');
    });

    it('should identify Excel files', () => {
      expect(
        getAttachmentTypeFromMimeType(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      ).toBe('xlsx');
      expect(getAttachmentTypeFromMimeType('application/vnd.ms-excel')).toBe('xlsx');
    });

    it('should identify ZIP archives', () => {
      expect(getAttachmentTypeFromMimeType('application/zip')).toBe('zip');
      expect(getAttachmentTypeFromMimeType('application/x-zip-compressed')).toBe('zip');
    });

    it('should identify images', () => {
      expect(getAttachmentTypeFromMimeType('image/jpeg')).toBe('image');
      expect(getAttachmentTypeFromMimeType('image/png')).toBe('image');
      expect(getAttachmentTypeFromMimeType('image/gif')).toBe('image');
      expect(getAttachmentTypeFromMimeType('image/webp')).toBe('image');
      expect(getAttachmentTypeFromMimeType('image/svg+xml')).toBe('image');
    });

    it('should identify audio files', () => {
      expect(getAttachmentTypeFromMimeType('audio/mpeg')).toBe('audio');
      expect(getAttachmentTypeFromMimeType('audio/wav')).toBe('audio');
      expect(getAttachmentTypeFromMimeType('audio/ogg')).toBe('audio');
      expect(getAttachmentTypeFromMimeType('audio/mp4')).toBe('audio');
    });

    it('should identify video files', () => {
      expect(getAttachmentTypeFromMimeType('video/mp4')).toBe('video');
      expect(getAttachmentTypeFromMimeType('video/webm')).toBe('video');
      expect(getAttachmentTypeFromMimeType('video/ogg')).toBe('video');
      expect(getAttachmentTypeFromMimeType('video/quicktime')).toBe('video');
    });

    it('should handle case-insensitive MIME types', () => {
      expect(getAttachmentTypeFromMimeType('APPLICATION/PDF')).toBe('pdf');
      expect(getAttachmentTypeFromMimeType('Image/JPEG')).toBe('image');
      expect(getAttachmentTypeFromMimeType('VIDEO/MP4')).toBe('video');
    });

    it('should return "other" for unknown MIME types', () => {
      expect(getAttachmentTypeFromMimeType('application/octet-stream')).toBe('other');
      expect(getAttachmentTypeFromMimeType('text/plain')).toBe('other');
      expect(getAttachmentTypeFromMimeType('application/json')).toBe('other');
    });
  });

  describe('isValidAttachmentType', () => {
    it('should accept valid document types', () => {
      expect(isValidAttachmentType('application/pdf')).toBe(true);
      expect(
        isValidAttachmentType(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).toBe(true);
      expect(isValidAttachmentType('application/msword')).toBe(true);
    });

    it('should accept valid image types', () => {
      expect(isValidAttachmentType('image/jpeg')).toBe(true);
      expect(isValidAttachmentType('image/png')).toBe(true);
      expect(isValidAttachmentType('image/gif')).toBe(true);
      expect(isValidAttachmentType('image/webp')).toBe(true);
    });

    it('should accept valid audio types', () => {
      expect(isValidAttachmentType('audio/mpeg')).toBe(true);
      expect(isValidAttachmentType('audio/wav')).toBe(true);
      expect(isValidAttachmentType('audio/ogg')).toBe(true);
    });

    it('should accept valid video types', () => {
      expect(isValidAttachmentType('video/mp4')).toBe(true);
      expect(isValidAttachmentType('video/webm')).toBe(true);
      expect(isValidAttachmentType('video/quicktime')).toBe(true);
    });

    it('should accept valid archive types', () => {
      expect(isValidAttachmentType('application/zip')).toBe(true);
      expect(isValidAttachmentType('application/x-zip-compressed')).toBe(true);
    });

    it('should reject invalid file types', () => {
      expect(isValidAttachmentType('application/x-executable')).toBe(false);
      expect(isValidAttachmentType('application/x-msdownload')).toBe(false);
      expect(isValidAttachmentType('text/html')).toBe(false);
      expect(isValidAttachmentType('application/javascript')).toBe(false);
    });

    it('should handle case-insensitive MIME types', () => {
      expect(isValidAttachmentType('APPLICATION/PDF')).toBe(true);
      expect(isValidAttachmentType('Image/JPEG')).toBe(true);
      expect(isValidAttachmentType('VIDEO/MP4')).toBe(true);
    });
  });

  describe('ATTACHMENT_CONFIG', () => {
    it('should define reasonable file size limit', () => {
      expect(ATTACHMENT_CONFIG.maxFileSize).toBe(100 * 1024 * 1024); // 100MB
    });

    it('should define reasonable max attachments per resource', () => {
      expect(ATTACHMENT_CONFIG.maxAttachmentsPerResource).toBe(20);
    });

    it('should define storage base path', () => {
      expect(ATTACHMENT_CONFIG.storageBasePath).toBe('attachments');
    });

    it('should include all required MIME type categories', () => {
      expect(ATTACHMENT_CONFIG.allowedMimeTypes).toHaveProperty('pdf');
      expect(ATTACHMENT_CONFIG.allowedMimeTypes).toHaveProperty('docx');
      expect(ATTACHMENT_CONFIG.allowedMimeTypes).toHaveProperty('pptx');
      expect(ATTACHMENT_CONFIG.allowedMimeTypes).toHaveProperty('xlsx');
      expect(ATTACHMENT_CONFIG.allowedMimeTypes).toHaveProperty('zip');
      expect(ATTACHMENT_CONFIG.allowedMimeTypes).toHaveProperty('image');
      expect(ATTACHMENT_CONFIG.allowedMimeTypes).toHaveProperty('audio');
      expect(ATTACHMENT_CONFIG.allowedMimeTypes).toHaveProperty('video');
    });
  });
});
