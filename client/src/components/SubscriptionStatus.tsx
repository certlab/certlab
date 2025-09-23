import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Crown,
  Zap,
  AlertCircle,
  Check,
  X,
  Star,
  TrendingUp,
  Calendar,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";

interface SubscriptionStatusResponse {
  isConfigured: boolean;
  isSubscribed: boolean;
  plan: string;
  status: string;
  expiresAt?: string;
  features: string[];
  limits: {
    quizzesPerDay: number;
    categoriesAccess: string[];
    analyticsAccess: string;
  };
  dailyQuizCount: number;
}

export default function SubscriptionStatus() {
  const { toast } = useToast();
  
  const { data: subscription, isLoading, error } = useQuery<SubscriptionStatusResponse>({
    queryKey: ["/api/subscription/status"],
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse" data-testid="subscription-loading">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 w-48 bg-muted rounded"></div>
            <div className="h-4 w-36 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !subscription) {
    return null; // Fail silently if subscription service is not available
  }

  const planConfig = {
    free: {
      icon: <Zap className="w-5 h-5" />,
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      label: "Free Plan"
    },
    pro: {
      icon: <Crown className="w-5 h-5" />,
      color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
      label: "Pro Plan"
    },
    enterprise: {
      icon: <Star className="w-5 h-5" />,
      color: "bg-gradient-to-r from-gold-500 to-amber-500 text-white",
      label: "Enterprise Plan"
    }
  };

  const currentPlan = planConfig[subscription.plan as keyof typeof planConfig] || planConfig.free;
  const quizLimit = subscription.limits.quizzesPerDay;
  const quizProgress = quizLimit > 0 ? (subscription.dailyQuizCount / quizLimit) * 100 : 0;
  const isAtLimit = quizLimit > 0 && subscription.dailyQuizCount >= quizLimit;

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700" data-testid="status-active">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-700" data-testid="status-trial">Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-700" data-testid="status-past-due">Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-700" data-testid="status-canceled">Canceled</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Plan Card */}
      <Card className="border-primary/20 overflow-hidden">
        <div className={`h-2 ${currentPlan.color}`}></div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" data-testid="current-plan">
              {currentPlan.icon}
              {currentPlan.label}
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quiz Usage */}
          {quizLimit > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Daily Quiz Usage</span>
                <span className="font-medium" data-testid="quiz-usage">
                  {subscription.dailyQuizCount} / {quizLimit}
                </span>
              </div>
              <Progress value={quizProgress} className={isAtLimit ? "bg-red-100" : ""} />
              {isAtLimit && (
                <Alert className="mt-2 border-red-200 bg-red-50 dark:bg-red-950/20">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 dark:text-red-400">
                    Daily quiz limit reached. Upgrade to Pro for unlimited quizzes!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Unlimited Access for Pro/Enterprise */}
          {quizLimit === -1 && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span data-testid="unlimited-access">Unlimited quiz access</span>
            </div>
          )}

          {/* Subscription Expiry */}
          {subscription.expiresAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span data-testid="expires-at">
                {subscription.status === 'canceled' ? 'Access until: ' : 'Renews: '}
                {format(new Date(subscription.expiresAt), 'MMM dd, yyyy')}
              </span>
            </div>
          )}

          {/* Features List */}
          <div className="pt-3 border-t">
            <p className="text-sm font-medium mb-2">Your Plan Features:</p>
            <div className="grid grid-cols-1 gap-1">
              {subscription.features.slice(0, 3).map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 space-y-2">
            {!subscription.isSubscribed && (
              <Link href="/subscription/plans">
                <Button className="w-full" size="sm" data-testid="upgrade-button">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </Link>
            )}
            
            {subscription.isSubscribed && subscription.status === 'active' && (
              <Link href="/subscription/manage">
                <Button variant="outline" className="w-full" size="sm" data-testid="manage-button">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Subscription
                </Button>
              </Link>
            )}

            {subscription.status === 'canceled' && (
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/subscription/resume', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    });
                    if (response.ok) {
                      toast({
                        title: "Subscription Resumed",
                        description: "Your subscription has been reactivated successfully.",
                      });
                      window.location.reload();
                    } else {
                      throw new Error('Failed to resume subscription');
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to resume subscription. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                data-testid="resume-button"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Resume Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {subscription.isSubscribed && (
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {subscription.dailyQuizCount}
                </div>
                <p className="text-xs text-muted-foreground">Quizzes Today</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">
                  {subscription.limits.analyticsAccess === 'advanced' ? 'Full' : 'Basic'}
                </div>
                <p className="text-xs text-muted-foreground">Analytics Access</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}