import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coins, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import { queryClient, queryKeys } from '@/lib/queryClient';

interface InsufficientTokensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredTokens: number;
  currentBalance: number;
  onTokensAdded: () => void;
}

export function InsufficientTokensDialog({
  open,
  onOpenChange,
  requiredTokens,
  currentBalance,
  onTokensAdded,
}: InsufficientTokensDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const tokensNeeded = requiredTokens - currentBalance;
  const suggestedAmount = Math.max(tokensNeeded, 50); // Suggest at least 50 tokens

  const handleAddTokensAndProceed = async () => {
    if (!user?.id) return;

    setIsAdding(true);
    try {
      const newBalance = await storage.addTokens(user.id, suggestedAmount);

      // Invalidate tokenBalance query to refetch updated balance from storage
      await queryClient.invalidateQueries({
        queryKey: queryKeys.user.tokenBalance(user?.id),
      });

      toast({
        title: 'Tokens Added',
        description: `Added ${suggestedAmount} tokens to your account.`,
      });

      onOpenChange(false);
      onTokensAdded();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add tokens. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Insufficient Tokens
          </DialogTitle>
          <DialogDescription>You don't have enough tokens to create this quiz.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Current Balance</p>
                <p className="text-xs text-muted-foreground">{currentBalance} tokens</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Required</p>
              <p className="text-xs text-muted-foreground">{requiredTokens} tokens</p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium mb-1">Tokens Needed</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {tokensNeeded} tokens
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              We'll add{' '}
              <span className="font-semibold text-foreground">{suggestedAmount} tokens</span> to
              your account (free) so you can create this quiz and have extras for future quizzes.
            </p>
            <p className="text-xs">💡 Tokens are completely free in this client-side version!</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAddTokensAndProceed}
            disabled={isAdding}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Coins className="w-4 h-4 mr-2" />
            {isAdding ? 'Adding Tokens...' : `Add ${suggestedAmount} Tokens & Continue`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
