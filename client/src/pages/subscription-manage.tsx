import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Calendar,
  AlertCircle,
  XCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Crown,
  Star
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
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [switchPlan, setSwitchPlan] = useState<"pro" | "enterprise" | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [switchAtPeriodEnd, setSwitchAtPeriodEnd] = useState(false);
  const [selectedCancelOption, setSelectedCancelOption] = useState<"immediate" | "end-of-period" | null>(null);

  const { data: subscription, isLoading, error } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (immediate: boolean) => {
      const response = await apiRequest({
        endpoint: "/api/subscription/cancel",
        method: "POST",
        data: { immediate },
      });
      return response.json();
    },
    onSuccess: (data) => {
      const title = data.refundAmount 
        ? "Subscription Canceled Immediately" 
        : "Subscription Scheduled for Cancellation";
      const description = data.refundAmount 
        ? `${data.message} Refund amount: $${(data.refundAmount / 100).toFixed(2)}`
        : data.message;
      
      toast({
        title,
        description,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      setShowCancelDialog(false);
      setSelectedCancelOption(null);
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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to resume subscription");
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Subscription Resumed",
        description: "Your subscription has been reactivated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: any) => {
      // Check if it's a "subscription not found" error
      if (error.message?.includes("expired") || error.message?.includes("not found")) {
        toast({
          title: "Subscription Cannot Be Resumed",
          description: error.message,
          variant: "destructive",
          action: (
            <Link href="/app/subscription-plans">
              <Button variant="secondary" size="sm">
                View Plans
              </Button>
            </Link>
          ),
        });
        // Refresh subscription status to clear invalid state
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to resume subscription",
          variant: "destructive",
        });
      }
    },
  });

  const switchMutation = useMutation({
    mutationFn: async (data: {
      newPlan: "pro" | "enterprise";
      billingInterval: "monthly" | "yearly";
      switchAtPeriodEnd: boolean;
    }) => {
      const response = await apiRequest({
        endpoint: "/api/subscription/switch",
        method: "POST",
        data,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to switch subscription");
      }
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Plan Changed Successfully",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      setShowSwitchDialog(false);
      setSwitchPlan(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to switch subscription plan",
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
                  {/* Show upgrade to Enterprise if on Pro */}
                  {subscription.plan === 'pro' && (
                    <Button
                      variant="default"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setSwitchPlan('enterprise');
                        setShowSwitchDialog(true);
                      }}
                      data-testid="upgrade-to-enterprise"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Upgrade to Enterprise
                    </Button>
                  )}
                  
                  {/* Show downgrade to Pro if on Enterprise */}
                  {subscription.plan === 'enterprise' && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setSwitchPlan('pro');
                        setShowSwitchDialog(true);
                      }}
                      data-testid="downgrade-to-pro"
                    >
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Downgrade to Pro
                    </Button>
                  )}

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
                <Link href="/app/subscription-plans">
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
        <Dialog 
          open={showCancelDialog} 
          onOpenChange={(open) => {
            setShowCancelDialog(open);
            if (!open) setSelectedCancelOption(null);
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Choose Cancellation Option</DialogTitle>
              <DialogDescription>
                Select how you'd like to cancel your subscription. Both options are available to you.
              </DialogDescription>
            </DialogHeader>
            
            <RadioGroup 
              value={selectedCancelOption || ""}
              onValueChange={(value) => setSelectedCancelOption(value as "immediate" | "end-of-period")}
              className="space-y-4 py-4"
            >
              {/* Cancel Immediately Option */}
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedCancelOption === 'immediate' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedCancelOption('immediate')}
                data-testid="cancel-immediately-option"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem 
                    value="immediate" 
                    id="immediate"
                    className="mt-0.5"
                  />
                  <div className="space-y-2 flex-1">
                    <label htmlFor="immediate" className="cursor-pointer">
                      <h4 className="font-semibold">Cancel Immediately</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cancel now and receive a prorated refund for unused time
                      </p>
                    </label>
                    <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                      <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-blue-700 dark:text-blue-300">
                        • Access ends immediately<br/>
                        • Prorated refund will be processed to your original payment method<br/>
                        • Refund typically appears within 5-10 business days
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>

              {/* Cancel at Period End Option */}
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedCancelOption === 'end-of-period' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedCancelOption('end-of-period')}
                data-testid="cancel-end-period-option"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem 
                    value="end-of-period" 
                    id="end-of-period"
                    className="mt-0.5"
                  />
                  <div className="space-y-2 flex-1">
                    <label htmlFor="end-of-period" className="cursor-pointer">
                      <h4 className="font-semibold">Cancel at Period End</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Keep access until {subscription.expiresAt && format(new Date(subscription.expiresAt), 'MMMM dd, yyyy')} then cancel automatically
                      </p>
                    </label>
                    <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        • Keep all {subscription.plan} features until the end date<br/>
                        • No charges after {subscription.expiresAt && format(new Date(subscription.expiresAt), 'MMM dd, yyyy')}<br/>
                        • You can resume anytime before the end date
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>
            </RadioGroup>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelDialog(false);
                  setSelectedCancelOption(null);
                }}
                disabled={cancelMutation.isPending}
                data-testid="cancel-dialog-close"
              >
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedCancelOption === 'immediate') {
                    cancelMutation.mutate(true);
                  } else if (selectedCancelOption === 'end-of-period') {
                    cancelMutation.mutate(false);
                  }
                }}
                disabled={!selectedCancelOption || cancelMutation.isPending}
                data-testid="confirm-cancellation"
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  selectedCancelOption === 'immediate' 
                    ? 'Cancel Immediately' 
                    : selectedCancelOption === 'end-of-period' 
                    ? 'Cancel at Period End'
                    : 'Select Option'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Switch Plan Dialog */}
        <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {switchPlan === 'enterprise' ? (
                  <>
                    <Star className="w-5 h-5 inline mr-2 text-amber-500" />
                    Upgrade to Enterprise
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 inline mr-2 text-primary" />
                    Switch to Pro
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {switchPlan === 'enterprise' 
                  ? 'Get access to team management, custom certifications, API access, and dedicated support.'
                  : 'Switch to Pro plan with unlimited quizzes and advanced analytics.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Billing Interval Selection */}
              <div className="space-y-3">
                <Label>Billing Interval</Label>
                <RadioGroup value={billingInterval} onValueChange={(value) => setBillingInterval(value as "monthly" | "yearly")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="font-normal cursor-pointer">
                      Monthly billing
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yearly" id="yearly" />
                    <Label htmlFor="yearly" className="font-normal cursor-pointer">
                      Yearly billing <Badge className="ml-2 bg-green-100 text-green-700">Save 17%</Badge>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Switch Timing */}
              <div className="flex items-center space-x-2 py-2 px-3 bg-muted/50 rounded-lg">
                <Switch
                  id="switch-timing"
                  checked={switchAtPeriodEnd}
                  onCheckedChange={setSwitchAtPeriodEnd}
                />
                <Label htmlFor="switch-timing" className="text-sm cursor-pointer">
                  {switchAtPeriodEnd 
                    ? `Switch at end of billing period (${subscription.expiresAt && format(new Date(subscription.expiresAt), 'MMM dd, yyyy')})`
                    : 'Switch immediately (prorated billing)'}
                </Label>
              </div>

              {/* Info Alert */}
              {switchPlan === 'enterprise' && (
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    {switchAtPeriodEnd 
                      ? 'You will retain Pro features until your current billing period ends, then automatically upgrade to Enterprise.'
                      : 'You will be upgraded immediately and charged a prorated amount for the remaining days in your billing period.'}
                  </AlertDescription>
                </Alert>
              )}

              {switchPlan === 'pro' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {switchAtPeriodEnd 
                      ? 'You will keep Enterprise features until your current billing period ends, then switch to Pro.'
                      : 'You will be downgraded immediately. A prorated credit will be applied to your account.'}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSwitchDialog(false);
                  setSwitchPlan(null);
                }}
                disabled={switchMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (switchPlan) {
                    switchMutation.mutate({
                      newPlan: switchPlan,
                      billingInterval,
                      switchAtPeriodEnd,
                    });
                  }
                }}
                disabled={switchMutation.isPending || !switchPlan}
                data-testid="confirm-switch"
              >
                {switchMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : switchPlan === 'enterprise' ? (
                  'Upgrade Now'
                ) : (
                  'Switch Plan'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}