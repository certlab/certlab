import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { TrendingUp, TrendingDown, Clock, Target, Award, BookOpen } from "lucide-react";
import { useAnalyticsAccess, LockedAnalytics } from "@/hooks/useAnalyticsAccess";
import type { UserStats } from "@shared/schema";

export default function DashboardStats() {
  const { user: currentUser } = useAuth();
  const { features: analyticsFeatures } = useAnalyticsAccess();

  const { data: stats } = useQuery<UserStats>({
    queryKey: ['/api/user', currentUser?.id, 'stats'],
    enabled: !!currentUser,
  });

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="stat-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Basic stats for all users
  const basicStats = [
    {
      title: "Total Sessions",
      value: stats.totalQuizzes.toString(),
      change: "+12.5%",
      trend: "up",
      icon: BookOpen,
      color: "text-blue-600",
      requiresPro: false
    },
    {
      title: "Average Score",
      value: `${stats.averageScore}%`,
      change: stats.averageScore >= 70 ? "+2.3%" : "-1.2%",
      trend: stats.averageScore >= 70 ? "up" : "down",
      icon: Target,
      color: "text-green-600",
      requiresPro: false
    }
  ];

  // Advanced stats for Pro/Enterprise users
  const advancedStats = [
    {
      title: "Study Streak",
      value: `${stats.currentStreak}`,
      change: stats.currentStreak > 0 ? `${stats.currentStreak} days` : "Start today",
      trend: stats.currentStreak > 0 ? "up" : "neutral",
      icon: Award,
      color: "text-orange-600",
      requiresPro: true
    },
    {
      title: "Time Studied",
      value: `${Math.round((stats.totalQuizzes * 15) / 60)}h`,
      change: "+45min",
      trend: "up",
      icon: Clock,
      color: "text-purple-600",
      requiresPro: true
    }
  ];

  const statsData = analyticsFeatures.performanceTrends 
    ? [...basicStats, ...advancedStats]
    : basicStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                {analyticsFeatures.performanceTrends && (
                  <div className="flex items-center gap-1">
                    {stat.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {stat.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                    <span className={`metric-change ${stat.trend === "up" ? "positive" : stat.trend === "down" ? "negative" : "text-muted-foreground"}`}>
                      {stat.change}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="metric-value">{stat.value}</p>
                <p className="metric-label">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {/* Show locked analytics cards for free users */}
      {!analyticsFeatures.performanceTrends && (
        <>
          <Card className="stat-card relative overflow-hidden">
            <CardContent className="p-6">
              <LockedAnalytics title="Study Streak Analytics" requiredLevel="advanced">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-muted/50 text-orange-600">
                      <Award className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="metric-value">--</p>
                    <p className="metric-label">Study Streak</p>
                  </div>
                </div>
              </LockedAnalytics>
            </CardContent>
          </Card>
          
          <Card className="stat-card relative overflow-hidden">
            <CardContent className="p-6">
              <LockedAnalytics title="Time Tracking" requiredLevel="advanced">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-muted/50 text-purple-600">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="metric-value">--</p>
                    <p className="metric-label">Time Studied</p>
                  </div>
                </div>
              </LockedAnalytics>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}