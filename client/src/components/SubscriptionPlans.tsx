import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Check,
  X,
  Zap,
  Crown,
  Star,
  Loader2,
  AlertCircle,
  CreditCard,
  Shield,
  TrendingUp,
  Users,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface Plan {
  id: string;
  name: string;
  features: string[];
  limits: {
    quizzesPerDay: number;
    categoriesAccess: string[];
    analyticsAccess: string;
  };
}

interface PlansResponse {
  plans: Plan[];
}

interface SubscriptionStatus {
  isConfigured: boolean;
  isSubscribed: boolean;
  plan: string;
  status: string;
  expiresAt?: string;
  features: string[];
  limits: {
    quizzesPerDay: number | null;
    categoriesAccess: string[];
    analyticsAccess: string;
    teamMembers?: number;
  };
  dailyQuizCount: number;
}

export default function SubscriptionPlans() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  // Helper to determine if plans are paid (pro/enterprise)
  const isPaidPlan = (plan: string | null | undefined): boolean => {
    if (!plan) return false;
    const normalized = plan.toLowerCase();
    return normalized === 'pro' || normalized === 'enterprise';
  };

  const { data: plansData, isLoading: plansLoading } = useQuery<PlansResponse>({
    queryKey: ["/api/subscription/plans"],
  });

  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (data: { plan: string; billingInterval: "monthly" | "yearly" }) => {
      const response = await apiRequest({
        endpoint: "/api/subscription/checkout",
        method: "POST",
        data,
      });
      const result = await response.json();
      
      // Check if response is not ok and handle errors
      if (!response.ok) {
        // Handle specific error scenarios with user-friendly messages
        if (result.error === "Polar product not configured") {
          throw new Error("The subscription service is being set up. Please try again later or contact support if this issue persists.");
        }
        
        if (result.error?.includes("already subscribed") || result.message?.includes("already on")) {
          throw new Error("You're already on this plan! Visit your subscription management page to make changes.");
        }
        
        if (result.error?.includes("payment") || result.error?.includes("card")) {
          throw new Error("Payment processing failed. Please check your payment method and try again.");
        }
        
        if (result.error?.includes("limit") || result.error?.includes("quota")) {
          throw new Error("Subscription limit reached. Please contact support for assistance.");
        }
        
        // Default error message with suggestion
        throw new Error(result.message || "We couldn't process your subscription. Please try again or contact support at support@certlab.ai");
      }
      
      return result;
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        // Show loading toast before redirecting
        toast({
          title: "Redirecting to payment...",
          description: "You'll be taken to our secure payment provider.",
          duration: 2000,
        });
        // Simple direct navigation to checkout
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 500);
      } else if (data.upgraded) {
        // Handle instant upgrade - show success message and stay on page
        toast({
          title: "Upgrade Successful! 🎉",
          description: data.message || "Your subscription has been upgraded successfully. Your new plan features are now active!",
        });
        
        // Invalidate subscription-related queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        // Navigate to dashboard after a brief delay to show the toast
        setTimeout(() => {
          setLocation("/app");
        }, 2000);
      }
    },
    onError: (error: any) => {
      // Provide actionable error messages
      const isSetupError = error.message?.includes("subscription service") || error.message?.includes("Polar not configured");
      const isAlreadySubscribed = error.message?.includes("already on");
      const isPaymentError = error.message?.includes("payment");
      
      // Extract specific error message if available
      const errorMessage = error.response?.data?.message || error.message || "We couldn't process your subscription. Please try again or contact support.";
      
      toast({
        title: isSetupError ? "Configuration Required" : isPaymentError ? "Payment Failed" : isAlreadySubscribed ? "Already Subscribed" : "Subscription Error",
        description: errorMessage,
        variant: "destructive",  
        duration: isSetupError ? 10000 : 6000,
        action: isAlreadySubscribed ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation("/app/subscription/manage")}
          >
            Manage Subscription
          </Button>
        ) : undefined,
      });
    },
  });

  const isLoading = plansLoading || statusLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const plans = plansData?.plans || [];
  const currentPlan = subscriptionStatus?.plan || 'free';

  const planIcons = {
    free: <Zap className="w-8 h-8" />,
    pro: <Crown className="w-8 h-8" />,
    enterprise: <Star className="w-8 h-8" />,
  };

  const planColors = {
    free: "border-gray-200 bg-gray-50/50 dark:bg-gray-900/20",
    pro: "border-primary bg-gradient-to-br from-primary/5 to-primary/10",
    enterprise: "border-amber-500 bg-gradient-to-br from-amber-500/5 to-amber-500/10",
  };

  const handleSubscribe = (planId: string) => {
    // Prevent double-clicks or rapid calls
    if (createCheckoutMutation.isPending) {
      toast({
        title: "Processing...",
        description: "Please wait while we process your request.",
      });
      return;
    }

    // Check if clicking on current plan
    if (planId === currentPlan) {
      toast({
        title: "You're on this plan!",
        description: `You're already enjoying the ${planId} plan. Visit subscription management to make changes.`,
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation("/app/subscription/manage")}
          >
            Manage Plan
          </Button>
        ),
      });
      return;
    }

    // Handle downgrade from pro/enterprise to free
    if (planId === "free" && currentPlan !== "free") {
      // Show confirmation dialog for downgrade
      if (!confirm("Are you sure you want to downgrade to the Free plan? You will lose access to premium features including unlimited quizzes and advanced analytics.")) {
        return;
      }
      
      // Process the downgrade through the checkout mutation
      createCheckoutMutation.mutate({
        plan: planId,
        billingInterval: "monthly", // Free plan doesn't have billing intervals
      });
      return;
    }

    // Handle enterprise plan
    if (planId === "enterprise") {
      toast({
        title: "Enterprise Plan",
        description: "Get custom pricing and features tailored to your team's needs.",
        duration: 6000,
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = "mailto:sales@certlab.ai?subject=Enterprise Plan Inquiry"}
          >
            Contact Sales
          </Button>
        ),
      });
      return;
    }

    // Validate subscription status is loaded
    if (!subscriptionStatus) {
      toast({
        title: "Loading subscription data...",
        description: "Please wait a moment while we load your subscription information.",
        variant: "destructive",
      });
      return;
    }

    // Handle upgrades - differentiate between paid-to-paid (instant) and free-to-paid (checkout)
    const isCurrentPlanPaid = isPaidPlan(currentPlan);
    const isTargetPlanPaid = isPaidPlan(planId);
    const isInstantUpgrade = isCurrentPlanPaid && isTargetPlanPaid;
    
    toast({
      title: isInstantUpgrade ? "Upgrading your plan..." : "Starting checkout...",
      description: isInstantUpgrade 
        ? "Your plan will be upgraded instantly with automatic proration applied to your next bill."
        : "You'll be redirected to complete your payment.",
    });
    
    createCheckoutMutation.mutate({
      plan: planId,
      billingInterval,
    });
  };

  const getPrice = (plan: Plan) => {
    if (plan.id === "free") return "Free";
    if (plan.id === "enterprise") return "Contact Sales";
    
    // Prices are configured in Polar and shown during checkout
    return "View pricing";
  };

  const getSavings = (plan: Plan) => {
    if (plan.id !== "pro") return null;
    if (billingInterval !== "yearly") return null;
    
    // Annual billing typically offers savings
    return "Best value";
  };

  return (
    <div className="container max-w-6xl mx-auto space-y-8 p-4">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold" data-testid="plans-title">Choose Your Learning Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Unlock your full certification potential with our flexible pricing plans. 
          Start free, upgrade when you're ready.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label 
          htmlFor="billing-toggle" 
          className={billingInterval === "monthly" ? "font-semibold" : "text-muted-foreground"}
        >
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={billingInterval === "yearly"}
          onCheckedChange={(checked) => setBillingInterval(checked ? "yearly" : "monthly")}
          data-testid="billing-toggle"
        />
        <Label 
          htmlFor="billing-toggle" 
          className={billingInterval === "yearly" ? "font-semibold" : "text-muted-foreground"}
        >
          Yearly
        </Label>
        {billingInterval === "yearly" && (
          <Badge className="bg-green-100 text-green-700" data-testid="savings-badge">Save 17%</Badge>
        )}
      </div>

      {/* Upgrade Flow Information */}
      {isPaidPlan(currentPlan) && (
        <Alert className="bg-primary/5 border-primary/20">
          <Zap className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>Pro Tip:</strong> Switching between paid plans (Pro ⇄ Enterprise) is instant! 
            Your subscription will be updated immediately with automatic proration applied to your next bill. 
            No need to re-enter payment information.
          </AlertDescription>
        </Alert>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isPopular = plan.id === "pro";
          const icon = planIcons[plan.id as keyof typeof planIcons];
          const colorClass = planColors[plan.id as keyof typeof planColors];
          const savings = getSavings(plan);

          return (
            <Card 
              key={plan.id} 
              className={`relative overflow-hidden transition-all hover:shadow-lg ${colorClass} ${
                selectedPlan === plan.id ? "ring-2 ring-primary" : ""
              }`}
              data-testid={`plan-card-${plan.id}`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 rounded-full bg-background/80 w-fit">
                  {icon}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <div className="text-3xl font-bold" data-testid={`price-${plan.id}`}>
                    {getPrice(plan)}
                  </div>
                  {savings && (
                    <Badge className="mt-2 bg-green-100 text-green-700">{savings}</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Key Features */}
                <div className="space-y-3">
                  <div className="font-medium text-sm">Features included:</div>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Limits */}
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Daily Quizzes</span>
                    <span className="font-medium">
                      {plan.limits.quizzesPerDay === -1 ? "Unlimited" : plan.limits.quizzesPerDay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Analytics</span>
                    <span className="font-medium capitalize">{plan.limits.analyticsAccess}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex-col gap-2">
                <Button
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={createCheckoutMutation.isPending}
                  data-testid={`subscribe-${plan.id}`}
                >
                  {createCheckoutMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : plan.id === currentPlan ? (
                    "Current Plan"
                  ) : plan.id === "enterprise" ? (
                    "Contact Sales"
                  ) : plan.id === "free" && currentPlan !== "free" ? (
                    "Downgrade to Free"
                  ) : currentPlan === "free" && plan.id === "pro" ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade to Pro
                    </>
                  ) : currentPlan === "pro" && plan.id === "enterprise" ? (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Instant Upgrade ⚡
                    </>
                  ) : currentPlan === "enterprise" && plan.id === "pro" ? (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Switch to Pro ⚡
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Get Started
                    </>
                  )}
                </Button>
                
                {/* Show info message for paid-to-paid upgrades */}
                {isPaidPlan(currentPlan) && isPaidPlan(plan.id) && plan.id !== currentPlan && (
                  <div className="flex items-start gap-1 text-xs text-muted-foreground">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>Instant upgrade with automatic proration</span>
                  </div>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Trust Badges */}
      <div className="mt-12 pt-8 border-t">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <Shield className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">Secure Payment</h3>
            <p className="text-sm text-muted-foreground">
              Powered by Polar with bank-level encryption
            </p>
          </div>
          <div className="space-y-2">
            <TrendingUp className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">Cancel Anytime</h3>
            <p className="text-sm text-muted-foreground">
              No contracts, cancel your subscription anytime
            </p>
          </div>
          <div className="space-y-2">
            <Users className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">Join Thousands</h3>
            <p className="text-sm text-muted-foreground">
              Trusted by certification seekers worldwide
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Alert */}
      <Alert className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Questions?</strong> Check out our FAQ or contact support at support@certlab.ai. 
          All plans include a 7-day free trial for new users.
        </AlertDescription>
      </Alert>
    </div>
  );
}