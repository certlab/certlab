import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Sparkles,
  Clock,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import type { StudyRecommendation } from '@/lib/smart-recommendations';

interface SmartRecommendationsProps {
  recommendations: StudyRecommendation[];
  className?: string;
  maxRecommendations?: number;
}

export default function SmartRecommendations({
  recommendations,
  className = '',
  maxRecommendations = 5,
}: SmartRecommendationsProps) {
  const navigate = useNavigate();
  const getRecommendationIcon = (type: StudyRecommendation['type']) => {
    switch (type) {
      case 'focus_area':
        return <Target className="w-4 h-4 text-orange-600" />;
      case 'difficulty_adjustment':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'time_optimization':
        return <Clock className="w-4 h-4 text-purple-600" />;
      case 'streak_building':
        return <Award className="w-4 h-4 text-green-600" />;
      case 'readiness':
        return <BookOpen className="w-4 h-4 text-primary" />;
      default:
        return <Lightbulb className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: StudyRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return (
          <Badge variant="destructive" className="text-xs">
            High Priority
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="default" className="text-xs">
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="secondary" className="text-xs">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const displayRecommendations = recommendations.slice(0, maxRecommendations);

  if (displayRecommendations.length === 0) {
    return (
      <Card className={`card-enhanced ${className}`}>
        <CardHeader className="card-spacious pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Smart Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="card-breathing pt-0">
          <div className="text-center py-6">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-2">
              Complete more quizzes to receive personalized recommendations
            </p>
            <p className="text-xs text-muted-foreground text-relaxed">
              Our AI analyzes your performance to provide tailored study suggestions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`card-enhanced ${className}`}>
      <CardHeader className="card-spacious pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Smart Recommendations
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            AI-Powered
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="card-breathing pt-0">
        <div className="space-y-3">
          {displayRecommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-shrink-0 mt-0.5">{getRecommendationIcon(rec.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-foreground">{rec.title}</h4>
                    {getPriorityBadge(rec.priority)}
                  </div>
                  <p className="text-xs text-muted-foreground text-relaxed mb-2">
                    {rec.description}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 mb-2 text-xs text-muted-foreground">
                {rec.estimatedTimeMinutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{rec.estimatedTimeMinutes} min</span>
                  </div>
                )}
                {rec.suggestedQuestionCount && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    <span>{rec.suggestedQuestionCount} questions</span>
                  </div>
                )}
                {rec.confidence && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{rec.confidence}% confidence</span>
                  </div>
                )}
              </div>

              {/* Reasoning */}
              {rec.reasoning && (
                <div className="mb-3 p-2 rounded bg-background/50">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground text-relaxed italic">
                      {rec.reasoning}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {rec.actionUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-auto py-2 text-xs font-medium text-primary hover:text-primary/80"
                  onClick={() => navigate(rec.actionUrl!)}
                >
                  <span>Start This Activity</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {recommendations.length > maxRecommendations && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground text-center">
              Showing {maxRecommendations} of {recommendations.length} recommendations
            </p>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center text-relaxed">
            <Sparkles className="w-3 h-3 inline mr-1" />
            Recommendations update based on your latest performance
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
