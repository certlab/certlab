import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Plus } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function TokenBalance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokensToAdd, setTokensToAdd] = useState('50');

  const { data: tokenData } = useQuery({
    queryKey: queryKeys.user.tokenBalance(user?.id),
    enabled: !!user?.id,
  });

  const addTokensMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      return await storage.addTokens(user.id, amount);
    },
    onSuccess: (newBalance) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.tokenBalance(user?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
      toast({
        title: 'Tokens Added',
        description: `Your new balance is ${newBalance} tokens.`,
      });
      setTokensToAdd('50');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add tokens',
        variant: 'destructive',
      });
    },
  });

  const handleAddTokens = () => {
    const amount = parseInt(tokensToAdd);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive number',
        variant: 'destructive',
      });
      return;
    }
    addTokensMutation.mutate(amount);
  };

  const balance = (tokenData as { balance: number } | undefined)?.balance ?? 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Token Balance
        </CardTitle>
        <CardDescription>
          Tokens are used to create quizzes. Each question costs 1 token.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
          <span className="text-sm font-medium">Current Balance:</span>
          <span className="text-2xl font-bold">{balance} tokens</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokens-amount">Add Tokens (Free)</Label>
          <div className="flex gap-2">
            <Input
              id="tokens-amount"
              type="number"
              min="1"
              value={tokensToAdd}
              onChange={(e) => setTokensToAdd(e.target.value)}
              placeholder="Enter amount"
            />
            <Button
              onClick={handleAddTokens}
              disabled={addTokensMutation.isPending}
              className="whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" />
              {addTokensMutation.isPending ? 'Adding...' : 'Add Tokens'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add as many tokens as you need - they're free in this client-side version!
          </p>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium">Token Cost Guide:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>10 question quiz = 10 tokens</li>
            <li>25 question quiz = 25 tokens</li>
            <li>50 question quiz = 50 tokens</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
