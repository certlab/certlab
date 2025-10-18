import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Sparkles, Zap, Crown, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 50,
    price: "$9.99",
    priceId: "price_starter_credits",
    popular: false,
    features: [
      "50 credits",
      "10 quizzes",
      "Never expires",
      "Instant delivery",
    ],
  },
  {
    id: "popular",
    name: "Popular Pack",
    credits: 150,
    price: "$24.99",
    priceId: "price_popular_credits",
    popular: true,
    savings: "Save 17%",
    features: [
      "150 credits",
      "30 quizzes",
      "Never expires",
      "Instant delivery",
      "Best value",
    ],
  },
  {
    id: "power",
    name: "Power Pack",
    credits: 300,
    price: "$44.99",
    priceId: "price_power_credits",
    popular: false,
    savings: "Save 25%",
    features: [
      "300 credits",
      "60 quizzes",
      "Never expires",
      "Instant delivery",
      "Maximum savings",
    ],
  },
];

export default function Credits() {
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Fetch credit balance
  const { data: creditBalance, isLoading: balanceLoading } = useQuery<{
    availableCredits: number;
    totalPurchased: number;
    totalConsumed: number;
  }>({
    queryKey: ["/api/credits/balance"],
    staleTime: 10 * 1000,
  });

  // Purchase credits mutation
  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const selectedPkg = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
      if (!selectedPkg) throw new Error("Package not found");

      // TODO: Create Polar checkout session for credit purchase
      // This will be implemented when we add the checkout endpoint
      const response = await apiRequest({
        method: "POST",
        endpoint: "/api/credits/checkout",
        data: {
          packageId,
          priceId: selectedPkg.priceId,
          credits: selectedPkg.credits,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to create checkout session");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Polar checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Unable to process purchase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (packageId: string) => {
    setSelectedPackage(packageId);
    purchaseMutation.mutate(packageId);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Coins className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Purchase Credits</h1>
          <p className="text-lg text-muted-foreground">
            Credits are used to create quizzes. Each quiz costs 5 credits.
          </p>
        </div>

        {/* Current Balance */}
        {!balanceLoading && creditBalance && (
          <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                Your Credit Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-card">
                  <div className="text-3xl font-bold text-amber-500">{creditBalance.availableCredits}</div>
                  <div className="text-sm text-muted-foreground mt-1">Available Credits</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-card">
                  <div className="text-3xl font-bold text-green-500">{creditBalance.totalPurchased}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Purchased</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-card">
                  <div className="text-3xl font-bold text-blue-500">{creditBalance.totalConsumed}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Used</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-center">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  You can create <strong>{Math.floor(creditBalance.availableCredits / 5)}</strong> more quizzes with your current balance
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credit Packages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative ${
                pkg.popular
                  ? "border-2 border-primary shadow-xl scale-105"
                  : "border border-border"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pt-8">
                <div className="flex justify-center mb-3">
                  {pkg.popular ? (
                    <Zap className="w-12 h-12 text-purple-500" />
                  ) : (
                    <Coins className="w-12 h-12 text-amber-500" />
                  )}
                </div>
                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                <CardDescription className="text-3xl font-bold text-foreground mt-2">
                  {pkg.price}
                </CardDescription>
                {pkg.savings && (
                  <Badge variant="secondary" className="mt-2">
                    {pkg.savings}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-amber-500">{pkg.credits}</div>
                  <div className="text-sm text-muted-foreground">Credits</div>
                </div>

                <ul className="space-y-2">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    pkg.popular
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      : ""
                  }`}
                  size="lg"
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchaseMutation.isPending && selectedPackage === pkg.id}
                  data-testid={`button-purchase-${pkg.id}`}
                >
                  {purchaseMutation.isPending && selectedPackage === pkg.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <Coins className="w-4 h-4 mr-2" />
                      Purchase {pkg.credits} Credits
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">How Credits Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Coins className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
              <p><strong>Credits never expire</strong> - Purchase once and use them whenever you want</p>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
              <p><strong>5 credits per quiz</strong> - Each quiz creation costs 5 credits regardless of length or difficulty</p>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
              <p><strong>Instant delivery</strong> - Credits are added to your account immediately after purchase</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
