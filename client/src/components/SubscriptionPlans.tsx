import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Plan {
  id: string;
  name: string;
  features: string[];
  limits: {
    quizzesPerDay: number;
    categoriesAccess: string[];
    analyticsAccess: string;
  };
  priceMonthly?: number;
  priceYearly?: number;
}

interface PlansResponse {
  plans: Plan[];
}

export default function SubscriptionPlans() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  const { data: plansData, isLoading } = useQuery<PlansResponse>({
    queryKey: ["/api/subscription/plans"],
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (data: { plan: string; billingInterval: "monthly" | "yearly" }) => {
      const response = await apiRequest({
        endpoint: "/api/subscription/checkout",
        method: "POST",
        data,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const plans = plansData?.plans || [];

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
    if (planId === "free") {
      toast({
        title: "Free Plan",
        description: "You're already on the free plan!",
      });
      return;
    }

    if (planId === "enterprise") {
      toast({
        title: "Enterprise Plan",
        description: "Please contact our sales team for enterprise pricing.",
      });
      // Could redirect to a contact form
      return;
    }

    createCheckoutMutation.mutate({
      plan: planId,
      billingInterval,
    });
  };

  const getPrice = (plan: Plan) => {
    if (plan.id === "free") return "Free";
    if (plan.id === "enterprise") return "Contact Sales";
    
    const monthlyPrice = 20; // Default Pro price
    const yearlyPrice = 200; // Default Pro yearly price with discount
    
    if (billingInterval === "yearly") {
      return `$${yearlyPrice}/year`;
    }
    return `$${monthlyPrice}/month`;
  };

  const getSavings = (plan: Plan) => {
    if (plan.id !== "pro") return null;
    if (billingInterval !== "yearly") return null;
    
    const monthlyPrice = 20;
    const yearlyPrice = 200;
    const yearlyMonthlyEquivalent = monthlyPrice * 12;
    const savings = yearlyMonthlyEquivalent - yearlyPrice;
    const percentSaved = Math.round((savings / yearlyMonthlyEquivalent) * 100);
    
    return `Save ${percentSaved}%`;
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

              <CardFooter>
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
                  ) : plan.id === "free" ? (
                    "Current Plan"
                  ) : plan.id === "enterprise" ? (
                    "Contact Sales"
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Get Started
                    </>
                  )}
                </Button>
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