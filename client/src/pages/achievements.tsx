import { AchievementBadges } from "@/components/AchievementBadges";
import { AchievementProgress } from "@/components/AchievementProgress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Flame, Star, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-provider";
import { queryKeys } from "@/lib/queryClient";

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
  const { user: currentUser } = useAuth();
  
  const { data: allBadges } = useQuery<Badge[]>({
    queryKey: queryKeys.badges.all(),
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="shadow-md border-0 bg-card">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            🏆 Achievements & Badges
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your learning progress with gamified milestones and achievements
          </p>
        </div>

        {/* Achievement Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="shadow-small">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-primary" />
                </div>
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete learning sessions and reach milestones
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-small">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Achieve exceptional scores and high performance
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-small">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Maintain daily learning consistency
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-small">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                Mastery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Excel in certification domains
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-small">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                Special
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Unlock unique achievements
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Achievement Tabs */}
        <Tabs defaultValue="earned" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="earned" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Earned Badges
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Progress
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="earned" className="mt-6">
            <AchievementBadges userId={currentUser.id} />
          </TabsContent>
          
          <TabsContent value="progress" className="mt-6">
            <AchievementProgress />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}