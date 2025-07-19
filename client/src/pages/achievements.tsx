import { AchievementBadges } from "@/components/AchievementBadges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Flame, Star, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Get current user from localStorage
const getCurrentUser = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: any;
  color: string;
  rarity: string;
  points: number;
}

export default function AchievementsPage() {
  const currentUser = getCurrentUser();
  
  const { data: allBadges } = useQuery<Badge[]>({
    queryKey: ["/api/badges"],
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500 dark:text-gray-400">
              Please log in to view your achievements
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            🏆 Achievements & Badges
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your learning progress with gamified milestones and achievements
          </p>
        </div>

        {/* Achievement System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Trophy className="w-5 h-5" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Earned by completing learning sessions and reaching milestones
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <Star className="w-5 h-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Awarded for exceptional scores and consistent high performance
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <Flame className="w-5 h-5" />
                Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Recognize dedication through daily learning consistency
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Target className="w-5 h-5" />
                Mastery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                Celebrate expertise in specific certification areas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Award className="w-5 h-5" />
                Special
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-600 dark:text-green-400">
                Unique accomplishments and feature usage milestones
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Achievements */}
        <AchievementBadges userId={currentUser.id} />

        {/* Available Badges Guide */}
        {allBadges && allBadges.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              📋 All Available Badges
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allBadges.map((badge) => (
                <Card key={badge.id} className="opacity-60 hover:opacity-80 transition-opacity">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-xl">{badge.icon}</span>
                      {badge.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {badge.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-500 dark:text-gray-400">
                        {badge.category.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {badge.points} pts
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}