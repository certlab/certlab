import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Trophy, Star, Target, Flame, Award, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { queryKeys } from "@/lib/queryClient";

interface BadgeProgress {
  badge: {
    id: number;
    name: string;
    description: string;
    icon: string;
    category: string;
    requirement: any;
    color: string;
    rarity: string;
    points: number;
  };
  earned: boolean;
  progress: number;
  progressText: string;
}

interface AchievementProgressData {
  unlockedBadges: number[];
  progressData: BadgeProgress[];
}

const getCategoryIcon = (category: string) => {
  const icons = {
    progress: Trophy,
    performance: Star,
    streak: Flame,
    mastery: Target,
    special: Award
  };
  const IconComponent = icons[category as keyof typeof icons] || Trophy;
  return <IconComponent className="w-5 h-5" />;
};

const getBadgeColor = (color: string, earned: boolean) => {
  if (!earned) return "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900";
  
  const colors = {
    green: "border-green-500 bg-green-50 dark:bg-green-900/20",
    blue: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
    purple: "border-purple-500 bg-purple-50 dark:bg-purple-900/20",
    gold: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    yellow: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    orange: "border-orange-500 bg-orange-50 dark:bg-orange-900/20",
    red: "border-red-500 bg-red-50 dark:bg-red-900/20",
    silver: "border-gray-400 bg-gray-50 dark:bg-gray-800/20",
    rainbow: "border-gradient-to-r from-purple-500 to-blue-500 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20"
  };
  return colors[color as keyof typeof colors] || colors.blue;
};

const getRarityColor = (rarity: string) => {
  const colors = {
    common: "bg-gray-500 text-white",
    uncommon: "bg-green-500 text-white",
    rare: "bg-blue-500 text-white",
    legendary: "bg-purple-500 text-white"
  };
  return colors[rarity as keyof typeof colors] || colors.common;
};

export function AchievementProgress() {
  const { user: currentUser } = useAuth();
  
  const { data: progressData, isLoading } = useQuery<AchievementProgressData>({
    queryKey: queryKeys.user.achievementProgress(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  if (isLoading || !progressData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const categories = ["progress", "performance", "streak", "mastery", "special"];
  const categoryNames = {
    progress: "Progress Achievements",
    performance: "Performance Achievements",
    streak: "Streak Achievements",
    mastery: "Mastery Achievements",
    special: "Special Achievements"
  };

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const categoryBadges = progressData.progressData.filter(
          (item) => item.badge.category === category
        );
        
        if (categoryBadges.length === 0) return null;

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-4">
              {getCategoryIcon(category)}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {categoryNames[category as keyof typeof categoryNames]}
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({categoryBadges.filter(b => b.earned).length}/{categoryBadges.length})
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryBadges.map((item) => (
                <Card 
                  key={item.badge.id} 
                  className={`transition-all duration-200 ${getBadgeColor(item.badge.color, item.earned)} ${
                    item.earned ? '' : 'opacity-75'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.badge.icon}</span>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {item.badge.name}
                            {item.earned && (
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            )}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {item.badge.description}
                          </CardDescription>
                        </div>
                      </div>
                      {!item.earned && <Lock className="w-4 h-4 text-gray-400" />}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!item.earned && item.progress > 0 && (
                      <div className="space-y-2 mb-3">
                        <Progress value={item.progress} className="h-2" />
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {item.progressText}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <BadgeUI className={`${getRarityColor(item.badge.rarity)} text-xs`}>
                        {item.badge.rarity.toUpperCase()}
                      </BadgeUI>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.badge.points} pts
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}