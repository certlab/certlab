/**
 * User Purchases Card Component
 *
 * Displays a user's purchase history and status on their profile page.
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { storage } from '@/lib/storage-factory';
import { useAuth } from '@/lib/auth-provider';
import { ShoppingBag, Package } from 'lucide-react';
import { safeToDate, formatDate } from '@/lib/date-utils';
import type { Purchase, Product } from '@shared/schema';

export function UserPurchasesCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPurchases = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const [purchasesData, productsData] = await Promise.all([
        storage.getUserPurchases(user.id),
        storage.getProducts(),
      ]);
      setPurchases(purchasesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load purchases:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const getProductName = (productId: number): string => {
    const product = products.find((p) => p.id === productId);
    return product ? product.title : `Product #${productId}`;
  };

  const getStatusBadge = (status: string, expiryDate?: Date | null) => {
    const expiry = safeToDate(expiryDate);
    const isExpired = expiry && new Date() > expiry;

    const normalizedStatus = status.toLowerCase();
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      active: 'default',
      expired: 'secondary',
      refunded: 'destructive',
    };

    const baseLabel = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
    const label =
      isExpired && normalizedStatus === 'active' ? `${baseLabel} (expired)` : baseLabel;

    return <Badge variant={variants[normalizedStatus] || 'outline'}>{label}</Badge>;
  };

  const activePurchases = purchases.filter((p) => {
    const expiry = safeToDate(p.expiryDate);
    return p.status === 'active' && (!expiry || new Date() < expiry);
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Loading purchases...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          My Purchases
        </CardTitle>
        <CardDescription>
          Your purchased materials and subscriptions ({activePurchases.length} active)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No purchases yet</p>
            <Button onClick={() => navigate('/app/marketplace')}>Browse Marketplace</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{getProductName(purchase.productId)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground">
                      Purchased {formatDate(purchase.purchaseDate)}
                    </p>
                    {purchase.expiryDate && (
                      <p className="text-sm text-muted-foreground">
                        • Expires {formatDate(purchase.expiryDate)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(purchase.status, purchase.expiryDate)}
                  {purchase.status === 'active' && (() => {
                    const expiry = safeToDate(purchase.expiryDate);
                    return !expiry || new Date() < expiry;
                  })() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/app/marketplace/${purchase.productId}`)}
                      >
                        View
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
