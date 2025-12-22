import { Trophy, Star, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LevelProgressProps {
  level: number;
  totalPoints: number;
  nextLevelPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalBadgesEarned: number;
}

const getLevelTitle = (level: number) => {
  if (level <= 5) return 'Novice Learner';
  if (level <= 10) return 'Dedicated Student';
  if (level <= 20) return 'Security Apprentice';
  if (level <= 30) return 'Knowledge Seeker';
  if (level <= 40) return 'Certification Explorer';
  if (level <= 50) return 'Security Practitioner';
  if (level <= 75) return 'Domain Expert';
  if (level <= 100) return 'Security Master';
  return 'Legendary Scholar';
};

const getLevelColor = (level: number) => {
  if (level <= 10) return 'from-gray-500 to-gray-600';
  if (level <= 25) return 'from-green-500 to-green-600';
  if (level <= 50) return 'from-blue-500 to-blue-600';
  if (level <= 75) return 'from-purple-500 to-purple-600';
  if (level <= 100) return 'from-yellow-500 to-yellow-600';
  return 'from-red-500 to-pink-600';
};

export function LevelProgress({
  level = 1,
  totalPoints = 0,
  nextLevelPoints = 100,
  currentStreak = 0,
  longestStreak = 0,
  totalBadgesEarned = 0,
}: LevelProgressProps) {
  // Calculate current level's starting points
  const currentLevelStartPoints = level > 1 ? ((level - 1) * level * 100) / 2 : 0;
  const pointsInCurrentLevel = totalPoints - currentLevelStartPoints;
  const pointsNeededForLevel = level * 100;
  const progressToNextLevel = (pointsInCurrentLevel / pointsNeededForLevel) * 100;
  const pointsNeeded = pointsNeededForLevel - pointsInCurrentLevel;

  return (
    <Card className="bg-card border-border/50 card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Level Progress</CardTitle>
          <Badge
            className={`bg-gradient-to-r ${getLevelColor(level)} text-white border-0 px-4 py-2`}
          >
            Level {level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Level Title */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-foreground">{getLevelTitle(level)}</h3>
          <p className="text-sm text-muted-foreground mt-1">{pointsNeeded} points to next level</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{pointsInCurrentLevel} XP</span>
            <span>{pointsNeededForLevel} XP</span>
          </div>
          <Progress value={progressToNextLevel} className="h-3" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalBadgesEarned}</p>
            <p className="text-xs text-muted-foreground">Badges</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-muted-foreground italic">
            {level < 10 && 'Keep learning! Every quiz brings you closer to mastery.'}
            {level >= 10 && level < 25 && "Great progress! You're building strong foundations."}
            {level >= 25 && level < 50 && 'Impressive dedication! Your expertise is growing.'}
            {level >= 50 && level < 75 && "Outstanding! You're becoming a true security expert."}
            {level >= 75 && "Legendary status! You're among the elite learners."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
