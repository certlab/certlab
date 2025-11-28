import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Sparkles, Zap, Crown, Check } from "lucide-react";
import { apiRequest, queryClient, queryKeys } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface CreditProduct {
  id: string;
  name: string;
  description?: string;
  credits: number;
  price: {
    amount: number;
    currency: string;
    priceId: string;
    formatted: string;
  };
  metadata?: {
    popular?: boolean;
    savings?: string;
    [key: string]: any;
  };
  features: string[];
}

export default function Credits() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [verifyingPurchase, setVerifyingPurchase] = useState(false);

  // Fetch credit products from Polar
  const { data: products = [], isLoading: productsLoading } = useQuery<CreditProduct[]>({
    queryKey: queryKeys.credits.products(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch credit balance
  const { data: creditBalance, isLoading: balanceLoading } = useQuery<{
    availableCredits: number;
    totalPurchased: number;
    totalConsumed: number;
  }>({
    queryKey: queryKeys.credits.balance(),
    staleTime: 10 * 1000,
  });

  // Purchase credits mutation
  const purchaseMutation = useMutation({
    mutationFn: async (productId: string) => {
      const selectedProduct = products.find(p => p.id === productId);
      if (!selectedProduct) throw new Error("Product not found");

      const response = await apiRequest({
        method: "POST",
        endpoint: "/api/credits/checkout",
        data: {
          packageId: productId,
          priceId: selectedProduct.price.priceId,
          credits: selectedProduct.credits,
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

  const handlePurchase = (productId: string) => {
    setSelectedPackage(productId);
    purchaseMutation.mutate(productId);
  };

  // Handle purchase verification on return from Polar
  useEffect(() => {
    const verifyPurchase = async () => {
      const params = new URLSearchParams(window.location.search);
      const purchaseStatus = params.get('purchase');
      const sessionId = params.get('session_id');

      if (purchaseStatus === 'success' && sessionId) {
        setVerifyingPurchase(true);

        try {
          const response = await fetch(`/api/credits/verify?session_id=${sessionId}`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to verify purchase');
          }

          const data = await response.json();

          if (data.success) {
            toast({
              title: "Purchase Successful! 🎉",
              description: `${data.credits} credits added to your account. You now have ${data.balance} credits.`,
              duration: 5000,
            });

            // Invalidate queries to refresh balance
            queryClient.invalidateQueries({ queryKey: queryKeys.credits.balance() });

            // Clear query parameters
            window.history.replaceState({}, '', '/app/credits');
          } else {
            throw new Error('Purchase verification failed');
          }
        } catch (error: any) {
          console.error('Error verifying purchase:', error);
          toast({
            title: "Verification Error",
            description: "We couldn't verify your purchase. Please refresh the page or contact support.",
            variant: "destructive",
          });
        } finally {
          setVerifyingPurchase(false);
        }
      } else if (purchaseStatus === 'canceled') {
        toast({
          title: "Purchase Canceled",
          description: "Your purchase was canceled. No charges were made.",
          variant: "default",
        });

        // Clear query parameters
        window.history.replaceState({}, '', '/app/credits');
      }
    };

    verifyPurchase();
  }, [toast]);

  // Generate default features if not provided
  const getProductFeatures = (product: CreditProduct): string[] => {
    if (product.features && product.features.length > 0) {
      return product.features;
    }
    
    // Generate default features based on credits
    const quizCount = Math.floor(product.credits / 5);
    return [
      `${product.credits} credits`,
      `${quizCount} quizzes`,
      "Never expires",
      "Instant delivery",
    ];
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      {/* Verifying Purchase Overlay */}
      {verifyingPurchase && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-8 max-w-md">
            <div className="flex flex-col items-center gap-4">
              <LoadingSpinner size="xl" label="Verifying purchase..." />
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Verifying Your Purchase</h3>
                <p className="text-muted-foreground">
                  Please wait while we confirm your credit purchase...
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

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
        {productsLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <LoadingSpinner size="lg" />
            <span className="text-muted-foreground">Loading credit packages...</span>
          </div>
        ) : products.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No credit packages available at the moment.</p>
            <p className="text-sm text-muted-foreground mt-2">Please check back later.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {products.map((product) => {
              const isPopular = product.metadata?.popular === true;
              const savings = product.metadata?.savings || null;
              const features = getProductFeatures(product);
              
              return (
                <Card
                  key={product.id}
                  className={`relative ${
                    isPopular
                      ? "border-2 border-primary shadow-xl scale-105"
                      : "border border-border"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
                        <Crown className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pt-8">
                    <div className="flex justify-center mb-3">
                      {isPopular ? (
                        <Zap className="w-12 h-12 text-purple-500" />
                      ) : (
                        <Coins className="w-12 h-12 text-amber-500" />
                      )}
                    </div>
                    <CardTitle className="text-2xl">{product.name}</CardTitle>
                    <CardDescription className="text-3xl font-bold text-foreground mt-2">
                      {product.price.formatted}
                    </CardDescription>
                    {savings && (
                      <Badge variant="secondary" className="mt-2">
                        {savings}
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-amber-500">{product.credits}</div>
                      <div className="text-sm text-muted-foreground">Credits</div>
                    </div>

                    <ul className="space-y-2">
                      {features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full ${
                        isPopular
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          : ""
                      }`}
                      size="lg"
                      onClick={() => handlePurchase(product.id)}
                      disabled={purchaseMutation.isPending && selectedPackage === product.id}
                      data-testid={`button-purchase-${product.id}`}
                    >
                      {purchaseMutation.isPending && selectedPackage === product.id ? (
                        "Processing..."
                      ) : (
                        <>
                          <Coins className="w-4 h-4 mr-2" />
                          Purchase {product.credits} Credits
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

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
