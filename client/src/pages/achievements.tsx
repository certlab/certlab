import { AchievementBadges } from "@/components/AchievementBadges";
import { AchievementProgress } from "@/components/AchievementProgress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Flame, Star, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { localStorage } from "@/lib/localStorage";

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
  const currentUser = localStorage.getCurrentUser();
  
  const { data: allBadges } = useQuery<Badge[]>({
    queryKey: ["/api/badges"],
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="shadow-medium border-0 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please log in to view your achievements
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            🏆 Achievements & Badges
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your learning progress with gamified milestones and achievements
          </p>
        </div>

        {/* Achievement System Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 border-0">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-primary text-sm sm:text-base">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-primary/80">
                Earned by completing learning sessions and reaching milestones
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/20 dark:from-accent/20 dark:to-accent/30 border-0">
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

        {/* Achievement Tabs */}
        <Tabs defaultValue="earned" className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="earned" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Earned Badges
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Progress
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="earned" className="space-y-8">
            <AchievementBadges userId={currentUser.id} />
          </TabsContent>
          
          <TabsContent value="progress" className="space-y-8">
            <AchievementProgress />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}