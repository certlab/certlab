import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Calendar, Target, Zap } from 'lucide-react';
import type { LearningVelocity } from '@/lib/smart-recommendations';

interface LearningVelocityCardProps {
  learningVelocity: LearningVelocity;
  className?: string;
}

export default function LearningVelocityCard({
  learningVelocity,
  className = '',
}: LearningVelocityCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Not enough data';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getImprovementBadge = (improvement: number) => {
    if (improvement > 5)
      return { variant: 'default' as const, label: 'Excellent', color: 'bg-green-600' };
    if (improvement > 2)
      return { variant: 'default' as const, label: 'Good', color: 'bg-blue-600' };
    if (improvement > 0)
      return { variant: 'default' as const, label: 'Improving', color: 'bg-yellow-600' };
    return { variant: 'secondary' as const, label: 'Stable', color: 'bg-gray-600' };
  };

  const improvementBadge = getImprovementBadge(learningVelocity.averageScoreImprovement);

  return (
    <Card className={`card-enhanced ${className}`}>
      <CardHeader className="card-spacious pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Learning Velocity
          </CardTitle>
          <Badge variant={improvementBadge.variant} className={`text-xs ${improvementBadge.color}`}>
            {improvementBadge.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="card-breathing pt-0">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Questions Per Day */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">Daily Questions</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {learningVelocity.questionsPerDay}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">per day</div>
          </div>

          {/* Score Improvement */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">Improvement</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {learningVelocity.averageScoreImprovement > 0 ? '+' : ''}
              {learningVelocity.averageScoreImprovement}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">per week</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Streak Consistency */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3 h-3 text-orange-600" />
              <span className="text-xs font-medium text-muted-foreground">Consistency</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {learningVelocity.streakConsistency}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">study regularity</div>
          </div>

          {/* Mastery Growth */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3 h-3 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">Mastery Growth</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {learningVelocity.masteryGrowthRate > 0 ? '+' : ''}
              {learningVelocity.masteryGrowthRate}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">per week</div>
          </div>
        </div>

        {/* Predicted Certification Date */}
        {learningVelocity.predictedCertificationDate && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Predicted Certification Ready
              </span>
            </div>
            <div className="text-lg font-semibold text-primary">
              {formatDate(learningVelocity.predictedCertificationDate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-relaxed">
              Based on your current learning pace and improvement rate
            </p>
          </div>
        )}

        {/* Insights */}
        <div className="mt-4 pt-3 border-t border-border/30">
          <div className="space-y-2">
            {learningVelocity.questionsPerDay < 5 && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Tip:</span> Aim for 10-20 questions daily for optimal
                progress.
              </p>
            )}
            {learningVelocity.averageScoreImprovement > 5 && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Great job!</span> Your rapid improvement shows
                effective studying.
              </p>
            )}
            {learningVelocity.streakConsistency > 80 && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Excellent consistency!</span> Regular practice is key
                to success.
              </p>
            )}
            {learningVelocity.streakConsistency < 50 && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Stay consistent:</span> Daily practice, even 10
                minutes, builds momentum.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
