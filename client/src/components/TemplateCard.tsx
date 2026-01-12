import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileQuestion, FileText, Eye, Globe, Lock, Users, TrendingUp } from 'lucide-react';
import type { TemplateLibraryItem } from '@shared/schema';

interface TemplateCardProps {
  template: TemplateLibraryItem;
  onSelect: (template: TemplateLibraryItem) => void;
  onPreview?: (template: TemplateLibraryItem) => void;
  currentUserId?: string;
}

export function TemplateCard({ template, onSelect, onPreview, currentUserId }: TemplateCardProps) {
  const isOwner = currentUserId === template.userId;

  const getVisibilityIcon = () => {
    switch (template.visibility) {
      case 'public':
        return <Globe className="h-3 w-3" />;
      case 'org':
        return <Users className="h-3 w-3" />;
      case 'private':
        return <Lock className="h-3 w-3" />;
    }
  };

  const getVisibilityLabel = () => {
    switch (template.visibility) {
      case 'public':
        return 'Public';
      case 'org':
        return 'Organization';
      case 'private':
        return 'Private';
    }
  };

  const getDifficultyLabel = (level: number) => {
    const labels = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'];
    return labels[level] || 'Unknown';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            {template.templateType === 'quiz' ? (
              <FileQuestion className="h-5 w-5 text-primary mt-0.5" />
            ) : (
              <FileText className="h-5 w-5 text-primary mt-0.5" />
            )}
            <div className="flex-1">
              <CardTitle className="text-lg">{template.title}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {template.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 5).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{template.tags.length - 5} more
                </Badge>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {/* Visibility */}
            <div className="flex items-center gap-1">
              {getVisibilityIcon()}
              <span>{getVisibilityLabel()}</span>
            </div>

            {/* Difficulty */}
            <div className="flex items-center gap-1">
              <span className="font-medium">Difficulty:</span>
              <span>{getDifficultyLabel(template.difficultyLevel)}</span>
            </div>

            {/* Usage Count */}
            {template.usageCount > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Used {template.usageCount}x</span>
              </div>
            )}

            {/* Type-specific info */}
            {template.templateType === 'quiz' && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Questions:</span>
                <span>{template.questionCount}</span>
              </div>
            )}
          </div>

          {/* Owner indicator */}
          {isOwner && (
            <Badge variant="outline" className="text-xs">
              Your Template
            </Badge>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button onClick={() => onSelect(template)} className="flex-1" size="sm">
              Use Template
            </Button>
            {onPreview && (
              <Button onClick={() => onPreview(template)} variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
