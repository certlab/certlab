import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Video, FileType, Code, Play, Plus, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Lecture } from '@shared/schema';

interface MaterialEditorProps {
  initialData?: Partial<Lecture>;
  onSave: (data: Partial<Lecture>) => Promise<void>;
  onCancel: () => void;
  categories: Array<{ id: number; name: string }>;
  subcategories: Array<{ id: number; name: string; categoryId: number }>;
}

const contentTypeOptions = [
  { value: 'text', label: 'Text (Markdown)', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'pdf', label: 'PDF Document', icon: FileType },
  { value: 'interactive', label: 'Interactive Content', icon: Play },
  { value: 'code', label: 'Code Example', icon: Code },
];

const videoProviders = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'upload', label: 'Uploaded Video' },
];

const interactiveTypes = [
  { value: 'code', label: 'Interactive Code' },
  { value: 'widget', label: 'Interactive Widget' },
  { value: 'quiz', label: 'Embedded Quiz' },
];

const codeLanguages = [
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'sql',
  'bash',
  'html',
  'css',
  'json',
  'xml',
  'yaml',
];

/**
 * MaterialEditor component for creating and editing learning materials
 * Supports all content types: Text, Video, PDF, Interactive, and Code
 */
export function MaterialEditor({
  initialData,
  onSave,
  onCancel,
  categories,
  subcategories,
}: MaterialEditorProps) {
  const [formData, setFormData] = useState<Partial<Lecture>>({
    contentType: 'text',
    title: '',
    description: '',
    content: '',
    categoryId: 0,
    subcategoryId: undefined,
    difficultyLevel: 1,
    tags: [],
    topics: [],
    ...initialData,
  });

  const [tagInput, setTagInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredSubcategories = subcategories.filter(
    (sub) => sub.categoryId === formData.categoryId
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.categoryId || formData.categoryId === 0) {
      newErrors.categoryId = 'Category is required';
    }

    if (!formData.content?.trim() && formData.contentType === 'text') {
      newErrors.content = 'Content is required for text materials';
    }

    if (formData.contentType === 'video' && !formData.videoUrl?.trim()) {
      newErrors.videoUrl = 'Video URL is required';
    }

    if (formData.contentType === 'pdf' && !formData.pdfUrl?.trim()) {
      newErrors.pdfUrl = 'PDF URL is required';
    }

    if (formData.contentType === 'interactive' && !formData.interactiveUrl?.trim()) {
      newErrors.interactiveUrl = 'Interactive content URL is required';
    }

    if (formData.contentType === 'code' && !formData.codeContent?.trim()) {
      newErrors.codeContent = 'Code content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving material:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to save material. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          errorMessage = 'Validation error. Please check your input and try again.';
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = 'Permission denied. Please check your access rights.';
        }
      }

      setErrors({ general: errorMessage });
      // TODO: Add toast notification for better UX
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const addTopic = () => {
    const topics = (formData.topics || []) as string[];
    if (topicInput.trim() && !topics.includes(topicInput.trim())) {
      setFormData({
        ...formData,
        topics: [...topics, topicInput.trim()],
      });
      setTopicInput('');
    }
  };

  const removeTopic = (topic: string) => {
    const topics = (formData.topics || []) as string[];
    setFormData({
      ...formData,
      topics: topics.filter((t: string) => t !== topic),
    });
  };

  const renderContentTypeFields = () => {
    switch (formData.contentType) {
      case 'video':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="videoProvider">Video Provider *</Label>
              <Select
                value={formData.videoProvider || 'youtube'}
                onValueChange={(value) => setFormData({ ...formData, videoProvider: value as any })}
              >
                <SelectTrigger id="videoProvider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {videoProviders.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="videoUrl">Video URL *</Label>
              <Input
                id="videoUrl"
                value={formData.videoUrl || ''}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className={errors.videoUrl ? 'border-red-500' : ''}
              />
              {errors.videoUrl && <p className="text-sm text-red-500 mt-1">{errors.videoUrl}</p>}
            </div>

            <div>
              <Label htmlFor="videoDuration">Duration (seconds)</Label>
              <Input
                id="videoDuration"
                type="number"
                value={formData.videoDuration || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const num = Number(value);
                  setFormData({
                    ...formData,
                    videoDuration: value === '' ? null : isNaN(num) ? 0 : Math.floor(num),
                  });
                }}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
              <Input
                id="thumbnailUrl"
                value={formData.thumbnailUrl || ''}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label>Accessibility Features</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.accessibilityFeatures?.hasClosedCaptions || false}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        accessibilityFeatures: {
                          ...formData.accessibilityFeatures,
                          hasClosedCaptions: checked as boolean,
                        },
                      })
                    }
                  />
                  <span className="text-sm">Has Closed Captions</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.accessibilityFeatures?.hasTranscript || false}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        accessibilityFeatures: {
                          ...formData.accessibilityFeatures,
                          hasTranscript: checked as boolean,
                        },
                      })
                    }
                  />
                  <span className="text-sm">Has Transcript</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.accessibilityFeatures?.hasAudioDescription || false}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        accessibilityFeatures: {
                          ...formData.accessibilityFeatures,
                          hasAudioDescription: checked as boolean,
                        },
                      })
                    }
                  />
                  <span className="text-sm">Has Audio Description</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="content">Transcript/Description</Label>
              <Textarea
                id="content"
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter video transcript or description..."
                rows={6}
              />
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pdfUrl">PDF URL *</Label>
              <Input
                id="pdfUrl"
                value={formData.pdfUrl || ''}
                onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                placeholder="https://example.com/document.pdf"
                className={errors.pdfUrl ? 'border-red-500' : ''}
              />
              {errors.pdfUrl && <p className="text-sm text-red-500 mt-1">{errors.pdfUrl}</p>}
            </div>

            <div>
              <Label htmlFor="pdfPages">Number of Pages</Label>
              <Input
                id="pdfPages"
                type="number"
                value={formData.pdfPages || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const num = Number(value);
                  setFormData({
                    ...formData,
                    pdfPages: value === '' ? null : isNaN(num) ? 0 : Math.floor(num),
                  });
                }}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="fileSize">File Size (bytes)</Label>
              <Input
                id="fileSize"
                type="number"
                value={formData.fileSize || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const num = Number(value);
                  setFormData({
                    ...formData,
                    fileSize: value === '' ? null : isNaN(num) ? 0 : Math.floor(num),
                  });
                }}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
              <Input
                id="thumbnailUrl"
                value={formData.thumbnailUrl || ''}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>

            <div>
              <Label htmlFor="altText">Alt Text (for accessibility)</Label>
              <Input
                id="altText"
                value={formData.accessibilityFeatures?.altText || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accessibilityFeatures: {
                      ...formData.accessibilityFeatures,
                      altText: e.target.value,
                    },
                  })
                }
                placeholder="Brief description of PDF content"
              />
            </div>
          </div>
        );

      case 'interactive':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="interactiveType">Interactive Type</Label>
              <Select
                value={formData.interactiveType || 'code'}
                onValueChange={(value) =>
                  setFormData({ ...formData, interactiveType: value as any })
                }
              >
                <SelectTrigger id="interactiveType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {interactiveTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="interactiveUrl">Interactive Content URL *</Label>
              <Input
                id="interactiveUrl"
                value={formData.interactiveUrl || ''}
                onChange={(e) => setFormData({ ...formData, interactiveUrl: e.target.value })}
                placeholder="https://example.com/interactive-widget"
                className={errors.interactiveUrl ? 'border-red-500' : ''}
              />
              {errors.interactiveUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.interactiveUrl}</p>
              )}
            </div>

            <div>
              <Label htmlFor="content">Instructions/Description</Label>
              <Textarea
                id="content"
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter instructions for using the interactive content..."
                rows={6}
              />
            </div>
          </div>
        );

      case 'code':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="codeLanguage">Programming Language *</Label>
              <Select
                value={formData.codeLanguage || 'javascript'}
                onValueChange={(value) => setFormData({ ...formData, codeLanguage: value })}
              >
                <SelectTrigger id="codeLanguage">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {codeLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="codeContent">Code Content *</Label>
              <Textarea
                id="codeContent"
                value={formData.codeContent || ''}
                onChange={(e) => setFormData({ ...formData, codeContent: e.target.value })}
                placeholder="Enter your code here..."
                rows={12}
                className={`font-mono ${errors.codeContent ? 'border-red-500' : ''}`}
              />
              {errors.codeContent && (
                <p className="text-sm text-red-500 mt-1">{errors.codeContent}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.hasCodeHighlighting || false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasCodeHighlighting: checked as boolean })
                  }
                />
                <span className="text-sm">Enable Syntax Highlighting</span>
              </label>
            </div>
          </div>
        );

      case 'text':
      default:
        return (
          <div>
            <Label htmlFor="content">Content (Markdown) *</Label>
            <Textarea
              id="content"
              value={formData.content || ''}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter markdown content..."
              rows={16}
              className={errors.content ? 'border-red-500' : ''}
            />
            {errors.content && <p className="text-sm text-red-500 mt-1">{errors.content}</p>}
          </div>
        );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {initialData?.id ? 'Edit' : 'Create'} Learning Material
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{errors.general}</p>
          </div>
        )}

        {/* Content Type Selection */}
        <div>
          <Label>Content Type *</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
            {contentTypeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={formData.contentType === option.value ? 'default' : 'outline'}
                  className="flex flex-col items-center gap-2 h-auto py-3"
                  onClick={() => {
                    const newContentType = option.value as any;
                    // Clear type-specific fields when content type changes
                    const clearedData = { ...formData, contentType: newContentType };

                    if (newContentType !== 'video') {
                      clearedData.videoUrl = null;
                      clearedData.videoProvider = null;
                      clearedData.videoDuration = null;
                    }
                    if (newContentType !== 'pdf') {
                      clearedData.pdfUrl = null;
                      clearedData.pdfPages = null;
                    }
                    if (newContentType !== 'interactive') {
                      clearedData.interactiveUrl = null;
                      clearedData.interactiveType = null;
                    }
                    if (newContentType !== 'code') {
                      clearedData.codeLanguage = null;
                      clearedData.codeContent = null;
                      clearedData.hasCodeHighlighting = false;
                    }

                    setFormData(clearedData);
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{option.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter material title..."
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this material..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoryId">Category *</Label>
              <Select
                value={formData.categoryId?.toString() || '0'}
                onValueChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}
              >
                <SelectTrigger
                  id="categoryId"
                  className={errors.categoryId ? 'border-red-500' : ''}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-red-500 mt-1">{errors.categoryId}</p>
              )}
            </div>

            <div>
              <Label htmlFor="subcategoryId">Subcategory</Label>
              <Select
                value={formData.subcategoryId?.toString() || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, subcategoryId: value ? parseInt(value) : undefined })
                }
                disabled={!formData.categoryId || filteredSubcategories.length === 0}
              >
                <SelectTrigger id="subcategoryId">
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id.toString()}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="difficultyLevel">Difficulty Level</Label>
            <Select
              value={formData.difficultyLevel?.toString() || '1'}
              onValueChange={(value) =>
                setFormData({ ...formData, difficultyLevel: parseInt(value) })
              }
            >
              <SelectTrigger id="difficultyLevel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Beginner</SelectItem>
                <SelectItem value="2">2 - Elementary</SelectItem>
                <SelectItem value="3">3 - Intermediate</SelectItem>
                <SelectItem value="4">4 - Advanced</SelectItem>
                <SelectItem value="5">5 - Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Type Specific Fields */}
        {renderContentTypeFields()}

        {/* Tags */}
        <div>
          <Label htmlFor="tags">Tags</Label>
          <div className="flex gap-2 mb-2">
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tags..."
            />
            <Button type="button" onClick={addTag} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div>
          <Label htmlFor="topics">Topics</Label>
          <div className="flex gap-2 mb-2">
            <Input
              id="topics"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
              placeholder="Add topics..."
            />
            <Button type="button" onClick={addTopic} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {((formData.topics || []) as string[]).map((topic: string) => (
              <Badge key={topic} variant="outline" className="gap-1">
                {topic}
                <button type="button" onClick={() => removeTopic(topic)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Material'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
