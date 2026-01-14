/**
 * External Link Input Component
 *
 * Allows users to add external links as attachments with URL validation.
 */

import { useState } from 'react';
import { Link as LinkIcon, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateExternalURL } from '@/lib/firebase-storage';

interface ExternalLinkInputProps {
  onAddLink: (linkData: { name: string; url: string; description?: string }) => void;
  className?: string;
}

export function ExternalLinkInput({ onAddLink, className }: ExternalLinkInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    // Validate inputs
    if (!name.trim()) {
      setError('Please enter a link title');
      return;
    }

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Validate URL
    const validation = validateExternalURL(url.trim());
    if (!validation.valid) {
      setError(validation.error || 'Invalid URL');
      return;
    }

    // Add link
    onAddLink({
      name: name.trim(),
      url: url.trim(),
      description: description.trim() || undefined,
    });

    // Reset form
    setName('');
    setUrl('');
    setDescription('');
    setError(null);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setName('');
    setUrl('');
    setDescription('');
    setError(null);
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <div className={className}>
        <Button variant="outline" onClick={() => setIsExpanded(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add External Link
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LinkIcon className="h-5 w-5" />
          Add External Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Link title */}
        <div className="space-y-2">
          <Label htmlFor="link-name">
            Link Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="link-name"
            placeholder="e.g., Official Documentation, Tutorial Video"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
          />
        </div>

        {/* URL */}
        <div className="space-y-2">
          <Label htmlFor="link-url">
            URL <span className="text-red-500">*</span>
          </Label>
          <Input
            id="link-url"
            type="url"
            placeholder="https://example.com/resource"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={2000}
          />
          <p className="text-xs text-gray-500">Only HTTP and HTTPS URLs are allowed</p>
        </div>

        {/* Description (optional) */}
        <div className="space-y-2">
          <Label htmlFor="link-description">Description (optional)</Label>
          <Textarea
            id="link-description"
            placeholder="Brief description of this resource..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
