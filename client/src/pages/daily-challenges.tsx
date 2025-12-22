import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys, queryClient } from '@/lib/queryClient';
import { gamificationService } from '@/lib/gamification-service';
import { triggerCelebration } from '@/components/Celebration';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Calendar, Clock, Star, Flame, Gift, CheckCircle2 } from 'lucide-react';
import type { Quest, UserQuestProgress, DailyReward } from '@shared/schema';

interface QuestWithProgress extends Quest {
  progress?: UserQuestProgress;
  progressPercent?: number;
}

export default function DailyChallengesPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data: quests, isLoading: questsLoading } = useQuery<QuestWithProgress[]>({
    queryKey: queryKeys.quests.active(),
    enabled: !!currentUser,
  });

  const { data: dailyRewards, isLoading: rewardsLoading } = useQuery<DailyReward[]>({
    queryKey: queryKeys.dailyRewards.all(),
    enabled: !!currentUser,
  });

  const { data: userDailyRewards } = useQuery<any[]>({
    queryKey: queryKeys.dailyRewards.userClaims(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  // Get user game stats for consecutive login days
  const { data: gameStats } = useQuery<any>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser,
  });

  // Mutation for claiming daily rewards
  const claimDailyRewardMutation = useMutation({
    mutationFn: async (day: number) => {
      if (!currentUser) throw new Error('Not authenticated');
      return await gamificationService.claimDailyReward(currentUser.id, day, currentUser.tenantId);
    },
    onSuccess: (result) => {
      triggerCelebration('reward');
      toast({
        title: '🎁 Reward Claimed!',
        description: `You earned ${result.pointsEarned} points${result.streakFreezeGranted ? ' and a Streak Freeze!' : '!'}`,
      });
      // Invalidate queries to refresh UI
      if (currentUser) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.dailyRewards.userClaims(currentUser.id),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser.id) });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to claim reward',
        variant: 'destructive',
      });
    },
  });

  // Mutation for claiming quest rewards
  const claimQuestRewardMutation = useMutation({
    mutationFn: async (questId: number) => {
      if (!currentUser) throw new Error('Not authenticated');
      return await gamificationService.claimQuestReward(
        currentUser.id,
        questId,
        currentUser.tenantId
      );
    },
    onSuccess: (result) => {
      triggerCelebration('quest');
      toast({
        title: '✨ Quest Reward Claimed!',
        description: `You earned ${result.pointsAwarded} points for completing "${result.quest.title}"!`,
      });
      // Invalidate queries to refresh UI
      if (currentUser) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.userQuestProgress.all(currentUser.id),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser.id) });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to claim quest reward',
        variant: 'destructive',
      });
    },
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="shadow-md border-0 bg-card">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please log in to view challenges and rewards
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dailyQuests = quests?.filter((q) => q.type === 'daily') || [];
  const weeklyQuests = quests?.filter((q) => q.type === 'weekly') || [];
  const monthlyQuests = quests?.filter((q) => q.type === 'monthly') || [];

  // Calculate daily reward streak using consecutive login days from game stats
  const consecutiveDays = gameStats?.consecutiveLoginDays ?? 0;
  const currentRewardDay = (consecutiveDays % 7) + 1;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            🎯 Daily Challenges & Rewards
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Complete challenges and earn rewards to boost your learning journey
          </p>
        </div>

        {/* Daily Login Rewards Section */}
        <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Daily Login Rewards
            </CardTitle>
            <CardDescription>Log in daily to claim escalating rewards</CardDescription>
          </CardHeader>
          <CardContent>
            {rewardsLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-lg font-semibold">
                    Day {currentRewardDay} of 7-day cycle
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {dailyRewards?.map((reward) => {
                    const isClaimed = consecutiveDays >= reward.day;
                    const isToday = currentRewardDay === reward.day;
                    return (
                      <div
                        key={reward.id}
                        className={`relative p-3 rounded-lg text-center transition-all ${
                          isClaimed
                            ? 'bg-primary/20 border-2 border-primary'
                            : isToday
                              ? 'bg-secondary border-2 border-primary animate-pulse'
                              : 'bg-muted/50 border border-muted'
                        }`}
                      >
                        {isClaimed && (
                          <CheckCircle2 className="w-4 h-4 text-primary absolute top-1 right-1" />
                        )}
                        <div className="text-xs font-medium mb-1">Day {reward.day}</div>
                        <div className="text-sm font-bold">
                          {reward.reward.points}
                          <Star className="w-3 h-3 inline ml-0.5" />
                        </div>
                        {reward.reward.streakFreeze && (
                          <div className="text-xs text-primary mt-1">+Freeze</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {currentRewardDay <= 7 && (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => claimDailyRewardMutation.mutate(currentRewardDay)}
                    disabled={
                      claimDailyRewardMutation.isPending || consecutiveDays >= currentRewardDay
                    }
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    {consecutiveDays >= currentRewardDay
                      ? 'Already Claimed'
                      : "Claim Today's Reward"}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Quests Tabs */}
        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Monthly
            </TabsTrigger>
          </TabsList>

          {/* Daily Quests */}
          <TabsContent value="daily" className="space-y-4">
            <div className="grid gap-4">
              {questsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : dailyQuests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No daily quests available
                  </CardContent>
                </Card>
              ) : (
                dailyQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    type="daily"
                    onClaimReward={claimQuestRewardMutation.mutate}
                    isClaimingReward={claimQuestRewardMutation.isPending}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Weekly Quests */}
          <TabsContent value="weekly" className="space-y-4">
            <div className="grid gap-4">
              {questsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : weeklyQuests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No weekly quests available
                  </CardContent>
                </Card>
              ) : (
                weeklyQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    type="weekly"
                    onClaimReward={claimQuestRewardMutation.mutate}
                    isClaimingReward={claimQuestRewardMutation.isPending}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Monthly Quests */}
          <TabsContent value="monthly" className="space-y-4">
            <div className="grid gap-4">
              {questsLoading ? (
                <div className="animate-pulse space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                    </CardHeader>
                  </Card>
                </div>
              ) : monthlyQuests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No monthly quests available
                  </CardContent>
                </Card>
              ) : (
                monthlyQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    type="monthly"
                    onClaimReward={claimQuestRewardMutation.mutate}
                    isClaimingReward={claimQuestRewardMutation.isPending}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

interface QuestCardProps {
  quest: QuestWithProgress;
  type: 'daily' | 'weekly' | 'monthly';
  onClaimReward: (questId: number) => void;
  isClaimingReward: boolean;
}

function QuestCard({ quest, type, onClaimReward, isClaimingReward }: QuestCardProps) {
  const progress = quest.progress?.progress || 0;
  const target = quest.requirement.target;
  const progressPercent = Math.min(100, Math.round((progress / target) * 100));
  const isCompleted = quest.progress?.isCompleted || false;
  const rewardClaimed = quest.progress?.rewardClaimed || false;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case 'weekly':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
      case 'monthly':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <Card
      className={`transition-all ${isCompleted ? 'border-2 border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{quest.title}</CardTitle>
              {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            </div>
            <CardDescription>{quest.description}</CardDescription>
          </div>
          <Badge className={getTypeColor(type)}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Progress: {progress} / {target}
            </span>
            <span className="font-semibold">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">{quest.reward.points} points</span>
            </div>
            {quest.reward.title && (
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-purple-500" />
                <span className="font-medium">Title: {quest.reward.title}</span>
              </div>
            )}
          </div>

          {isCompleted && !rewardClaimed && (
            <Button size="sm" onClick={() => onClaimReward(quest.id)} disabled={isClaimingReward}>
              <Gift className="w-4 h-4 mr-2" />
              {isClaimingReward ? 'Claiming...' : 'Claim Reward'}
            </Button>
          )}

          {isCompleted && rewardClaimed && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
