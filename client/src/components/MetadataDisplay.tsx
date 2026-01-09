import { Badge } from '@/components/ui/badge';
import { Calendar, Star, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MetadataDisplayProps {
  tags?: string[] | null;
  difficultyLevel?: number | null;
  authorName?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  compact?: boolean;
}

const difficultyLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Beginner', color: 'bg-green-100 text-green-800 border-green-300' },
  2: { label: 'Intermediate', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  3: { label: 'Advanced', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  4: { label: 'Expert', color: 'bg-red-100 text-red-800 border-red-300' },
  5: { label: 'Master', color: 'bg-purple-100 text-purple-800 border-purple-300' },
};

export function MetadataDisplay({
  tags,
  difficultyLevel,
  authorName,
  createdAt,
  updatedAt,
  compact = false,
}: MetadataDisplayProps) {
  const hasMetadata =
    (tags && tags.length > 0) || difficultyLevel || authorName || createdAt || updatedAt;

  if (!hasMetadata) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Difficulty Badge */}
      {difficultyLevel && difficultyLevel >= 1 && difficultyLevel <= 5 && (
        <Badge
          variant="outline"
          className={`${difficultyLabels[difficultyLevel].color} ${compact ? 'text-xs py-0' : ''}`}
        >
          <Star className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-1`} />
          {difficultyLabels[difficultyLevel].label}
        </Badge>
      )}

      {/* Author Badge */}
      {authorName && (
        <Badge variant="outline" className={compact ? 'text-xs py-0' : ''}>
          <User className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-1`} />
          {authorName}
        </Badge>
      )}

      {/* Date Badge */}
      {(updatedAt || createdAt) && (
        <Badge
          variant="outline"
          className={`text-muted-foreground ${compact ? 'text-xs py-0' : ''}`}
        >
          <Calendar className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-1`} />
          {updatedAt
            ? `Updated ${formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}`
            : createdAt
              ? `Created ${formatDistanceToNow(new Date(createdAt), { addSuffix: true })}`
              : null}
        </Badge>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <>
          {tags.slice(0, compact ? 3 : 5).map((tag, index) => (
            <Badge key={index} variant="secondary" className={compact ? 'text-xs py-0' : ''}>
              {tag}
            </Badge>
          ))}
          {tags.length > (compact ? 3 : 5) && (
            <Badge variant="secondary" className={compact ? 'text-xs py-0' : ''}>
              +{tags.length - (compact ? 3 : 5)} more
            </Badge>
          )}
        </>
      )}
    </div>
  );
}

// Compact version for use in smaller cards
export function MetadataDisplayCompact(props: MetadataDisplayProps) {
  return <MetadataDisplay {...props} compact={true} />;
}
