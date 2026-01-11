/**
 * CollaborativeEditors Component
 *
 * Displays presence indicators for active editors on a document.
 * Shows avatars with colored borders and names.
 */

import { Users, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { EditorPresence } from '@shared/schema';

interface CollaborativeEditorsProps {
  editors: EditorPresence[];
  currentUserId: string;
  isOnline: boolean;
  hasConflict?: boolean;
  className?: string;
}

export function CollaborativeEditors({
  editors,
  currentUserId,
  isOnline,
  hasConflict = false,
  className = '',
}: CollaborativeEditorsProps) {
  // Filter out current user and inactive editors
  const otherEditors = editors.filter(
    (editor) => editor.userId !== currentUserId && editor.isActive
  );

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastSeen = (lastSeen: Date): string => {
    const seconds = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Online/Offline indicator */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}
        <span className="text-sm text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* Active editors count */}
      {otherEditors.length > 0 && (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {otherEditors.length} {otherEditors.length === 1 ? 'editor' : 'editors'} active
          </span>
        </div>
      )}

      {/* Editor avatars */}
      {otherEditors.length > 0 && (
        <TooltipProvider>
          <div className="flex -space-x-2">
            {otherEditors.slice(0, 5).map((editor) => (
              <Tooltip key={editor.userId}>
                <TooltipTrigger asChild>
                  <div
                    className="relative ring-2 ring-background rounded-full"
                    style={{ borderColor: editor.color }}
                  >
                    <Avatar className="h-8 w-8">
                      {editor.profileImageUrl && (
                        <AvatarImage src={editor.profileImageUrl} alt={editor.userName} />
                      )}
                      <AvatarFallback
                        style={{
                          backgroundColor: `${editor.color}20`,
                          color: editor.color,
                        }}
                      >
                        {getInitials(editor.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background"
                      style={{ backgroundColor: editor.color }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-semibold">{editor.userName}</p>
                    {editor.userEmail && (
                      <p className="text-xs text-muted-foreground">{editor.userEmail}</p>
                    )}
                    {editor.editingSection && (
                      <p className="text-xs">Editing: {editor.editingSection}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Last seen {formatLastSeen(editor.lastSeen)}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
            {otherEditors.length > 5 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground text-xs font-medium ring-2 ring-background">
                    +{otherEditors.length - 5}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    {otherEditors.slice(5).map((editor) => (
                      <p key={editor.userId} className="text-sm">
                        {editor.userName}
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      )}

      {/* Conflict warning */}
      {hasConflict && (
        <Alert variant="destructive" className="py-2 px-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Another editor has made changes. Your next save will create a new version to preserve
            both versions.
          </AlertDescription>
        </Alert>
      )}

      {/* Editing in progress badge */}
      {otherEditors.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Collaborative
          </div>
        </Badge>
      )}
    </div>
  );
}
