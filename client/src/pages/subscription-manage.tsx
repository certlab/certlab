import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  AlertCircle,
  XCircle,
  CheckCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SubscriptionStatus {
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

export default function SubscriptionManagePage() {
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: subscription, isLoading, error } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (cancelAtPeriodEnd: boolean) => {
      const response = await apiRequest({
        endpoint: "/api/subscription/cancel",
        method: "POST",
        data: { cancelAtPeriodEnd },
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Canceled",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest({
        endpoint: "/api/subscription/resume",
        method: "POST",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Resumed",
        description: "Your subscription has been reactivated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resume subscription",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load subscription information. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'canceled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'trialing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="back-button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Manage Subscription</h1>

        {/* Subscription Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Subscription Details</CardTitle>
              <Badge className={getStatusColor(subscription.status)} data-testid="subscription-status">
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </Badge>
            </div>
            <CardDescription>
              Manage your CertLab subscription and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                <p className="text-lg font-medium capitalize" data-testid="current-plan">
                  {subscription.plan} Plan
                </p>
              </div>
              {subscription.expiresAt && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {subscription.status === 'canceled' ? 'Access Until' : 'Next Billing Date'}
                  </p>
                  <p className="text-lg font-medium" data-testid="billing-date">
                    {format(new Date(subscription.expiresAt), 'MMMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>

            {/* Usage Stats */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-3">Usage This Period</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Daily Quizzes</p>
                  <p className="text-xl font-bold" data-testid="daily-usage">
                    {subscription.dailyQuizCount}
                    {subscription.limits.quizzesPerDay > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        /{subscription.limits.quizzesPerDay}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Analytics</p>
                  <p className="text-xl font-bold capitalize">{subscription.limits.analyticsAccess}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-xl font-bold">
                    {subscription.limits.categoriesAccess.includes('all') ? 'All' : 'Basic'}
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h3 className="font-medium mb-3">Included Features</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {subscription.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              {subscription.status === 'active' && subscription.plan !== 'free' && (
                <>
                  <Link href="/subscription/plans">
                    <Button variant="outline" className="w-full sm:w-auto" data-testid="change-plan">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Change Plan
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={() => setShowCancelDialog(true)}
                    data-testid="cancel-subscription"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Subscription
                  </Button>
                </>
              )}
              
              {subscription.status === 'canceled' && (
                <Button
                  onClick={() => resumeMutation.mutate()}
                  disabled={resumeMutation.isPending}
                  className="w-full sm:w-auto"
                  data-testid="resume-subscription"
                >
                  {resumeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resuming...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resume Subscription
                    </>
                  )}
                </Button>
              )}

              {subscription.plan === 'free' && (
                <Link href="/subscription/plans">
                  <Button className="w-full sm:w-auto" data-testid="upgrade-plan">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Billing Information */}
        {subscription.isSubscribed && (
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>
                Your billing is managed securely through Polar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription>
                  To update your payment method or view invoices, you'll be redirected to our secure payment provider, Polar.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Cancel Subscription Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Subscription</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your subscription? You can choose to cancel immediately or at the end of your billing period.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  If you cancel at the end of the period, you'll keep access to Pro features until {subscription.expiresAt && format(new Date(subscription.expiresAt), 'MMMM dd, yyyy')}.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={cancelMutation.isPending}
                data-testid="cancel-dialog-close"
              >
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate(true)}
                disabled={cancelMutation.isPending}
                data-testid="cancel-end-period"
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  'Cancel at Period End'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}