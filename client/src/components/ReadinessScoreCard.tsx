import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Award,
} from 'lucide-react';
import type { ReadinessScore } from '@/lib/smart-recommendations';

interface ReadinessScoreCardProps {
  readinessScore: ReadinessScore;
  className?: string;
  onViewDetails?: () => void;
}

export default function ReadinessScoreCard({
  readinessScore,
  className = '',
  onViewDetails,
}: ReadinessScoreCardProps) {
  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return (
          <Badge variant="default" className="bg-green-600">
            High Confidence
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="default" className="bg-yellow-600">
            Medium Confidence
          </Badge>
        );
      case 'low':
        return <Badge variant="secondary">Low Confidence</Badge>;
      default:
        return null;
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReadinessMessage = (score: number) => {
    if (score >= 90) return "Excellent! You're ready for certification.";
    if (score >= 85) return "Good! A bit more practice and you'll be ready.";
    if (score >= 70) return 'Making progress. Focus on weak areas.';
    return "Keep studying. You're building your foundation.";
  };

  return (
    <Card className={`card-enhanced ${className}`}>
      <CardHeader className="card-spacious pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Certification Readiness
          </CardTitle>
          {getConfidenceBadge(readinessScore.confidenceLevel)}
        </div>
      </CardHeader>

      <CardContent className="card-breathing pt-0">
        {/* Overall Score */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-muted-foreground">Overall Readiness</span>
            <span className={`text-4xl font-bold ${getReadinessColor(readinessScore.overall)}`}>
              {readinessScore.overall}%
            </span>
          </div>
          <Progress value={readinessScore.overall} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground text-relaxed">
            {getReadinessMessage(readinessScore.overall)}
          </p>
        </div>

        {/* Estimated Days to Ready */}
        {readinessScore.overall < 85 && (
          <div className="mb-6 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Time to Certification Ready</span>
            </div>
            <p className="text-xs text-muted-foreground text-relaxed">
              {readinessScore.estimatedDaysToReady < 0
                ? 'Continue practicing to establish a learning trend'
                : readinessScore.estimatedDaysToReady === 0
                ? "You're ready now!"
                : `Approximately ${readinessScore.estimatedDaysToReady} days at your current pace`}
            </p>
          </div>
        )}

        {/* Category Scores */}
        {readinessScore.categoryScores.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">Category Performance</h4>
            <div className="space-y-3">
              {readinessScore.categoryScores
                .filter((cs) => cs.questionsAnswered > 0)
                .sort((a, b) => a.score - b.score)
                .slice(0, 5)
                .map((categoryScore) => (
                  <div key={categoryScore.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{categoryScore.categoryName}</span>
                      <span
                        className={`font-semibold ${
                          categoryScore.score >= 85
                            ? 'text-green-600'
                            : categoryScore.score >= 70
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {categoryScore.score}%
                      </span>
                    </div>
                    <Progress value={categoryScore.score} className="h-1.5" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{categoryScore.questionsAnswered} questions</span>
                      {categoryScore.recommendedStudyTime > 0 && (
                        <span>{categoryScore.recommendedStudyTime} min recommended</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {readinessScore.strengths.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <h4 className="text-sm font-medium">Your Strengths</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {readinessScore.strengths.map((strength) => (
                <Badge key={strength} variant="default" className="bg-green-600 text-xs">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Weak Areas */}
        {readinessScore.weakAreas.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <h4 className="text-sm font-medium">Focus Areas</h4>
            </div>
            <div className="space-y-2">
              {readinessScore.weakAreas.slice(0, 3).map((area) => (
                <div
                  key={`${area.categoryId}-${area.subcategoryId || 'all'}`}
                  className="flex items-center justify-between p-2 rounded bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    {area.improvementTrend === 'improving' ? (
                      <TrendingUp className="w-3 h-3 text-green-600" />
                    ) : area.improvementTrend === 'declining' ? (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    ) : (
                      <Minus className="w-3 h-3 text-gray-600" />
                    )}
                    <span className="text-xs font-medium">{area.categoryName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-orange-600">
                      {area.currentScore}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Target: {area.targetScore}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {readinessScore.nextSteps.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-medium">Recommended Next Steps</h4>
            </div>
            <ul className="space-y-1.5">
              {readinessScore.nextSteps.slice(0, 3).map((step, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary font-medium">{index + 1}.</span>
                  <span className="flex-1 text-relaxed">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* View Details Button */}
        {onViewDetails && (
          <Button variant="outline" size="sm" className="w-full" onClick={onViewDetails}>
            View Detailed Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
