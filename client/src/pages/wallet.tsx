import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet as WalletIcon, Zap, Coins } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { clientStorage } from '@/lib/client-storage';
import { queryKeys, queryClient } from '@/lib/queryClient';
import { calculateLevelAndXP } from '@/lib/level-utils';
import type { UserStats } from '@shared/schema';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  badge?: string;
}

const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    tokens: 100,
    price: 4.99,
  },
  {
    id: 'scholar',
    name: 'Scholar',
    tokens: 500,
    price: 19.99,
    badge: 'Best Value',
  },
  {
    id: 'semester',
    name: 'Semester',
    tokens: 1200,
    price: 39.99,
  },
];

export default function WalletPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Get user stats for level display
  const { data: stats } = useQuery<UserStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Get token balance
  const { data: tokenData } = useQuery<{ balance: number }>({
    queryKey: queryKeys.user.tokenBalance(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Calculate level and XP using shared utility
  const { level, currentXP, xpGoal, xpProgress } = calculateLevelAndXP(stats);

  const purchaseTokensMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const pkg = TOKEN_PACKAGES.find((p) => p.id === packageId);
      if (!pkg || !currentUser?.id) throw new Error('Invalid package or user');

      // Add tokens to user balance
      await clientStorage.addTokens(currentUser.id, pkg.tokens);
      return pkg;
    },
    onSuccess: (pkg) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.tokenBalance(currentUser?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser?.id) });
      toast({
        title: 'Tokens Added!',
        description: `Successfully added ${pkg.tokens} tokens to your wallet.`,
      });
      setSelectedPackage(null);
    },
    onError: (error) => {
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Failed to add tokens',
        variant: 'destructive',
      });
    },
  });

  const handlePurchase = (packageId: string) => {
    setSelectedPackage(packageId);
    // In a real app, this would integrate with a payment provider
    // For now, we'll just add the tokens directly
    purchaseTokensMutation.mutate(packageId);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Level and XP Display */}
        <Card className="mb-8 bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl">
                {level}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-lg font-semibold">Level {level}</span>
                  <span className="text-sm text-muted-foreground">{currentXP} XP</span>
                </div>
                <div className="relative w-full bg-secondary rounded-full h-3 mt-2">
                  <div
                    className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${xpProgress}%` }}
                    role="progressbar"
                    aria-valuenow={currentXP}
                    aria-valuemin={0}
                    aria-valuemax={xpGoal}
                    aria-label="Experience progress"
                  ></div>
                </div>
                <div className="text-sm text-muted-foreground text-right mt-1">
                  {xpGoal} XP GOAL
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex-1 border-t border-border"></div>
          <span className="px-4 text-sm text-muted-foreground font-medium tracking-wider">
            STORE
          </span>
          <div className="flex-1 border-t border-border"></div>
        </div>

        {/* Balance Card */}
        <Card className="mb-8 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-2">
              <WalletIcon className="w-6 h-6" />
              <span className="text-sm font-medium opacity-90">BALANCE</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-bold">{tokenData?.balance || 0}</span>
              <span className="text-2xl opacity-90">Tokens</span>
            </div>
          </CardContent>
        </Card>

        {/* Token Packages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOKEN_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className="relative overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              {pkg.badge && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-primary text-primary-foreground">{pkg.badge}</Badge>
                </div>
              )}
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Zap className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                <p className="text-4xl font-bold mb-6">{pkg.tokens}</p>
                <Button
                  size="lg"
                  className="w-full rounded-full text-lg py-6"
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchaseTokensMutation.isPending && selectedPackage === pkg.id}
                >
                  ${pkg.price.toFixed(2)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <Card className="mt-8 bg-muted/50 border-muted">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Coins className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-2">How Tokens Work</p>
                <p className="text-sm text-muted-foreground">
                  Tokens are used to access quizzes and study materials. Each quiz question costs 1
                  token. Purchase token packages to continue your learning journey.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
