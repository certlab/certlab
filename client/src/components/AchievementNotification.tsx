import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, X, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface BadgeData {
  id: number;
  badgeId: number;
  earnedAt: string;
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
  userId: number;
  onClose?: () => void;
}

export function AchievementNotification({ userId, onClose }: AchievementNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [newAchievements, setNewAchievements] = useState<BadgeData[]>([]);

  const { data: achievements } = useQuery<AchievementData>({
    queryKey: ["/api/user", userId, "achievements"],
    enabled: !!userId,
    refetchInterval: 30000, // Check for new achievements every 30 seconds
  });

  useEffect(() => {
    if (achievements && achievements.newBadges > 0) {
      // Get only the newest badges that haven't been notified
      const unnotifiedBadges = achievements.badges.filter(b => !b.isNotified).slice(0, achievements.newBadges);
      if (unnotifiedBadges.length > 0) {
        setNewAchievements(unnotifiedBadges);
        setShowNotification(true);
      }
    }
  }, [achievements]);

  const handleClose = () => {
    setShowNotification(false);
    if (onClose) {
      onClose();
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: "text-gray-600 dark:text-gray-400",
      uncommon: "text-green-600 dark:text-green-400",
      rare: "text-blue-600 dark:text-blue-400",
      legendary: "text-purple-600 dark:text-purple-400",
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  const getBadgeColor = (color: string) => {
    const colors = {
      green: "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700",
      blue: "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700",
      purple: "bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700",
      gold: "bg-yellow-100 dark:bg-yellow-900 border-yellow-400 dark:border-yellow-700",
      yellow: "bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700",
      silver: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
      orange: "bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700",
      red: "bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700",
      rainbow: "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 border-purple-300 dark:border-purple-700",
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (!showNotification || newAchievements.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-700 shadow-2xl">
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
            {newAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${getBadgeColor(achievement.badge.color)}`}
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
              onClick={() => window.open('/achievements', '_blank')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              View All Badges
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="px-6"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}