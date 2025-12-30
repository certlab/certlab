import { useQuery } from '@tanstack/react-query';
import { Badge, Trophy, Star, Target, Flame, Award, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { LevelProgress } from '@/components/LevelProgress';
import { Input } from '@/components/ui/input';
import { queryKeys } from '@/lib/queryClient';
import { useState, useMemo } from 'react';

interface BadgeData {
  id: number;
  badgeId: number;
  userId: number;
  earnedAt: string;
  progress: number;
  isNotified: boolean;
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
}

interface GameStats {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalBadgesEarned: number;
  level: number;
  nextLevelPoints: number;
}

interface AchievementData {
  badges: BadgeData[];
  gameStats: GameStats;
  newBadges: number;
}

interface AchievementBadgesProps {
  userId: string;
}

// Badge color mappings
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

// Badge rarity colors
const getRarityColor = (rarity: string) => {
  const colors = {
    common: 'text-gray-600 dark:text-gray-400',
    uncommon: 'text-green-600 dark:text-green-400',
    rare: 'text-blue-600 dark:text-blue-400',
    legendary: 'text-purple-600 dark:text-purple-400',
  };
  return colors[rarity as keyof typeof colors] || colors.common;
};

// Badge category icons
const getCategoryIcon = (category: string) => {
  const icons = {
    progress: Trophy,
    performance: Star,
    streak: Flame,
    mastery: Target,
    special: Award,
  };
  const IconComponent = icons[category as keyof typeof icons] || Badge;
  return <IconComponent className="w-4 h-4" />;
};

export function AchievementBadges({ userId }: AchievementBadgesProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: achievements,
    isLoading,
    error,
  } = useQuery<AchievementData>({
    queryKey: queryKeys.user.achievements(userId),
    enabled: !!userId,
  });

  // Fetch all badges to show both earned and unearned
  const { data: allBadges = [] } = useQuery<
    Array<{
      id: number;
      name: string;
      description: string;
      icon: string;
      category: string;
      requirement: unknown;
      color: string;
      rarity: string;
      points: number;
    }>
  >({
    queryKey: queryKeys.badges.all(),
  });

  // Extract earned badges and game stats (safely handle loading state)
  const earnedBadges = useMemo(() => achievements?.badges || [], [achievements]);
  const gameStats = achievements?.gameStats || {
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalBadgesEarned: 0,
    level: 1,
    nextLevelPoints: 100,
  };

  // Create a set of earned badge IDs for quick lookup
  const earnedBadgeIds = useMemo(() => new Set(earnedBadges.map((b) => b.badgeId)), [earnedBadges]);

  // Create a map of earned badges with their metadata
  const earnedBadgesMap = useMemo(
    () => new Map(earnedBadges.map((b) => [b.badgeId, b])),
    [earnedBadges]
  );

  // Combine all badges with their earned status
  const allBadgesWithStatus = useMemo(() => {
    return allBadges.map((badge) => ({
      badge,
      earned: earnedBadgeIds.has(badge.id),
      earnedData: earnedBadgesMap.get(badge.id),
    }));
  }, [allBadges, earnedBadgeIds, earnedBadgesMap]);

  // Filter badges based on search query
  const filteredBadges = useMemo(() => {
    if (!searchQuery.trim()) return allBadgesWithStatus;

    const query = searchQuery.toLowerCase();
    return allBadgesWithStatus.filter(
      ({ badge }) =>
        badge.name.toLowerCase().includes(query) ||
        badge.description.toLowerCase().includes(query) ||
        badge.category.toLowerCase().includes(query)
    );
  }, [allBadgesWithStatus, searchQuery]);

  // Group filtered badges by category
  const badgesByCategory = useMemo(() => {
    return filteredBadges.reduce(
      (acc, badgeWithStatus) => {
        const category = badgeWithStatus.badge.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(badgeWithStatus);
        return acc;
      },
      {} as Record<string, typeof filteredBadges>
    );
  }, [filteredBadges]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full mt-2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !achievements) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500 dark:text-gray-400">
            Unable to load achievements
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Level Progress Component */}
      <LevelProgress
        level={gameStats.level || 1}
        totalPoints={gameStats.totalPoints || 0}
        nextLevelPoints={gameStats.nextLevelPoints || 100}
        currentStreak={gameStats.currentStreak || 0}
        longestStreak={gameStats.longestStreak || 0}
        totalBadgesEarned={gameStats.totalBadgesEarned || 0}
      />

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search achievements by name, description, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Achievement Badges */}
      {Object.keys(badgesByCategory).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                {searchQuery ? 'No achievements found' : 'No achievements available'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Check back later for new achievements!'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(badgesByCategory).map(([category, categoryBadges]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
              {getCategoryIcon(category)}
              {category} Badges ({categoryBadges.filter((b) => b.earned).length}/
              {categoryBadges.length} earned)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {categoryBadges.map(({ badge, earned, earnedData }) => (
                <Card
                  key={badge.id}
                  className={`transition-all duration-200 hover:shadow-lg ${
                    earned
                      ? getBadgeColor(badge.color)
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <CardHeader className="pb-3 text-center">
                    <div className="flex flex-col items-center gap-2">
                      {/* Icon */}
                      <div className={`text-5xl mb-2 ${earned ? '' : 'opacity-30 grayscale'}`}>
                        {badge.icon}
                      </div>
                      {/* Badge Name */}
                      <CardTitle
                        className={`text-base font-semibold ${earned ? '' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {badge.name}
                      </CardTitle>
                      {/* New Badge Indicator */}
                      {earned && earnedData && !earnedData.isNotified && (
                        <BadgeUI variant="destructive" className="text-xs">
                          New!
                        </BadgeUI>
                      )}
                    </div>
                    {/* Description */}
                    <CardDescription
                      className={`text-sm text-center mt-2 ${earned ? '' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      {badge.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm">
                      <span
                        className={`font-medium text-xs ${earned ? getRarityColor(badge.rarity) : 'text-gray-400 dark:text-gray-500'}`}
                      >
                        {badge.rarity.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1">
                        <Star
                          className={`w-3 h-3 ${earned ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`}
                        />
                        <span
                          className={`text-xs ${earned ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          {badge.points} pts
                        </span>
                      </div>
                    </div>
                    {earned && earnedData && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        Earned {new Date(earnedData.earnedAt).toLocaleDateString()}
                      </div>
                    )}
                    {!earned && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center font-medium">
                        Locked
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {achievements?.newBadges && achievements.newBadges > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-700">
          <CardContent className="pt-4">
            <div className="text-center">
              <Trophy className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <p className="text-purple-700 dark:text-purple-300 font-medium">
                🎉 Congratulations! You've earned {achievements.newBadges} new badge
                {achievements.newBadges > 1 ? 's' : ''}!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
