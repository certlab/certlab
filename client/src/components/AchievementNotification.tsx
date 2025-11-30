import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, X, Star } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';

interface BadgeData {
  id: number;
  badgeId: number;
  earnedAt: string;
  isNotified?: boolean;
  badge: {
    name: string;
    description: string;
    icon: string;
    points: number;
    rarity: string;
    color: string;
  };
}

interface AchievementData {
  badges: BadgeData[];
  gameStats: any;
  newBadges: number;
}

interface AchievementNotificationProps {
  userId: string;
  onClose?: () => void;
}

export function AchievementNotification({ userId, onClose }: AchievementNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [newAchievements, setNewAchievements] = useState<BadgeData[]>([]);
  const queryClient = useQueryClient();

  const { data: achievements } = useQuery<AchievementData>({
    queryKey: queryKeys.user.achievements(userId),
    enabled: !!userId,
    refetchInterval: 5000, // Check for new achievements every 5 seconds
  });

  useEffect(() => {
    if (achievements && achievements.badges) {
      // Get only badges that haven't been notified
      const unnotifiedBadges = achievements.badges.filter((b) => !b.isNotified);
      if (unnotifiedBadges.length > 0) {
        setNewAchievements(unnotifiedBadges);
        setShowNotification(true);

        // Play achievement sound
        try {
          const audio = new Audio();
          audio.src =
            'data:audio/wav;base64,UklGRvIBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU4BAABhbZNXnF+eKq1V2Xv/5dnrfQHAOD7mWPPP9xTB5F+HT4Z4XB7fHPHO2zxfGO8xHPDN7PVnNwKG3XVP5OWj7G4qPu37wv7/+v3t0fjYGVGzx3UZTLt+hY9y6Z1qHr9/vfrzxfWUVfv8+d3v6fftxe8XtO/Rv55q2r3N9pNDvfwcXe65e9Pv4uy7/ufE2aWq7fT/+vz7ZjWyf2Xy4f7s6pGYNfX25e6Vbfzo6/BZ7fHnxeb4ufXvwufX9/Yf/fHn3Yjv9v7z8s3xjfX2x+/7/ev359fHu+Hj1sj53uj74f//9t75yfTt8a7xwfPZ7/n16f37///g+8Pq4/Hg7Hxm8tPC8vwUufP8Eujv6Pf/+aTb3e/3+9OT2vHB7Oz7++7n+//n+Pv1/dz1+sT1zPHlxe/u8PDm4ubn7uz79dH7xfLq8OX/+/L1xvLD+vf1/eBZMUX5/PP5+8GUfvbY/fj799zx6vf/+/Hv7/P5/ev/8fT/+9b12vHkxeznUNf74PD79u7z+vLz+P3j7Pv52fPs+vr9+8P/5uj37+Xj7OPu7fP28eL78/Z//PP/9/f/f2Nv8f/6z+T5XfT3/7sB8vL+/eb39s7s8uL2+fL5/v/';
          audio.volume = 0.3;
          audio.play().catch(() => {}); // Ignore autoplay policy errors
        } catch (error) {
          // Ignore sound errors
        }
      }
    }
  }, [achievements]);

  const handleClose = async () => {
    // Mark all new achievements as notified using clientStorage
    try {
      await Promise.all(
        newAchievements.map(async (achievement) => {
          try {
            // Update the user badge to mark it as notified
            await clientStorage.updateUserBadge(achievement.id, { isNotified: true });
          } catch (err) {
            console.warn(`Error notifying badge ${achievement.badgeId}:`, err);
          }
        })
      );
      // Invalidate achievements query to refresh the UI
      queryClient.invalidateQueries({ queryKey: queryKeys.user.achievements(userId) });
    } catch (error) {
      console.error('Failed to mark badges as notified:', error);
    }

    setShowNotification(false);
    setNewAchievements([]);
    if (onClose) {
      onClose();
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'text-gray-600 dark:text-gray-400',
      uncommon: 'text-green-600 dark:text-green-400',
      rare: 'text-blue-600 dark:text-blue-400',
      legendary: 'text-purple-600 dark:text-purple-400',
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  const getBadgeColor = (color: string) => {
    const colors = {
      green: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
      blue: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
      purple: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700',
      gold: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-400 dark:border-yellow-700',
      yellow: 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700',
      silver: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
      orange: 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700',
      red: 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700',
      rainbow:
        'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 border-purple-300 dark:border-purple-700',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (!showNotification || newAchievements.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-300">
      <Card className="w-full max-w-md mx-4 bg-card border-border/50 shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-500">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-bold text-purple-700 dark:text-purple-300">
                Achievement Unlocked!
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {newAchievements.map((achievement, index) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 transition-all duration-200 animate-in slide-in-from-right-4 ${getBadgeColor(achievement.badge.color)}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{achievement.badge.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {achievement.badge.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {achievement.badge.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge className={`${getRarityColor(achievement.badge.rarity)} border-0`}>
                        {achievement.badge.rarity.toUpperCase()}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{achievement.badge.points} pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={() => window.open('/app/achievements', '_blank')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              View All Badges
            </Button>
            <Button onClick={handleClose} variant="outline" className="px-6">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
