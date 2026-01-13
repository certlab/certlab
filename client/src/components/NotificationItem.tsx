import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Bell, Trophy, Target, Clock, Award } from 'lucide-react';
import type { Notification } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}

export function NotificationItem({ notification, onDismiss, onRead }: NotificationItemProps) {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (notification.type) {
      case 'achievement':
        return <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'assignment':
        return <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'completion':
        return <Award className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'results':
        return <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTypeColor = () => {
    switch (notification.type) {
      case 'achievement':
        return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700';
      case 'assignment':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'completion':
        return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'results':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
      case 'reminder':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700';
    }
  };

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id);
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else {
      // No action URL - dismiss the notification after marking as read
      onDismiss(notification.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(notification.id);
  };

  return (
    <div
      className={`relative p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md cursor-pointer ${getTypeColor()} ${
        !notification.isRead ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${notification.title}: ${notification.message}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              {notification.title}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-3 h-3" />
              <span className="sr-only">Dismiss notification</span>
            </Button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>

            {notification.actionLabel && (
              <Badge variant="outline" className="text-xs">
                {notification.actionLabel}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
