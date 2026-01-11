/**
 * Admin Purchases View Component
 *
 * Allows administrators to view and manage all purchases, grant entitlements,
 * and handle refunds.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { storage } from '@/lib/storage-factory';
import { useAuth } from '@/lib/auth-provider';
import { ShoppingCart, UserPlus, RefreshCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/date-utils';
import type { Purchase, Product } from '@shared/schema';

export function AdminPurchasesView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantProductId, setGrantProductId] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Note: getAllPurchases is not implemented in per-user Firestore storage
      // This will throw an error. Consider implementing user-specific purchase queries.
      const [purchasesData, productsData] = await Promise.all([
        storage.getAllPurchases(),
        storage.getProducts(),
      ]);
      setPurchases(purchasesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load purchases:', error);
      toast({
        title: 'Error',
        description:
          'Failed to load purchases data. Admin purchase viewing is not available with per-user storage.',
        variant: 'destructive',
      });
      // Set empty arrays so UI doesn't break
      setPurchases([]);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  const handleGrantAccess = async () => {
    if (!grantUserId || !grantProductId) {
      toast({
        title: 'Error',
        description: 'Please enter both user ID and product ID',
        variant: 'destructive',
      });
      return;
    }

    setIsGrantingAccess(true);
    try {
      const productId = parseInt(grantProductId, 10);
      const product = products.find((p) => p.id === productId);

      if (!product) {
        throw new Error('Product not found');
      }

      // Generate secure transaction ID using cryptographic randomness
      const generateSecureTransactionId = (): string => {
        if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
          const array = new Uint32Array(2);
          crypto.getRandomValues(array);
          return `admin_grant_${array[0]}_${array[1]}`;
        }
        return `admin_grant_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      };

      await storage.createPurchase({
        userId: grantUserId,
        tenantId: user.tenantId,
        productId,
        productType: product.type,
        status: 'active',
        amount: 0, // Admin grant is free
        currency: product.currency,
        paymentMethod: 'admin_grant',
        transactionId: generateSecureTransactionId(),
        expiryDate: product.subscriptionDuration
          ? new Date(Date.now() + product.subscriptionDuration * 24 * 60 * 60 * 1000)
          : null,
      });

      toast({
        title: 'Success',
        description: 'Access granted successfully',
      });

      setGrantUserId('');
      setGrantProductId('');
      loadData();
    } catch (error) {
      console.error('Failed to grant access:', error);
      toast({
        title: 'Error',
        description: 'Failed to grant access',
        variant: 'destructive',
      });
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const handleRefund = async (purchaseId: number) => {
    // Refunds are not yet implemented in the Firestore storage layer.
    // Avoid calling the unimplemented storage.refundPurchase to prevent
    // misleading "success" messages in the UI.
    console.warn('Refund requested for purchase', purchaseId, 'but refunds are not implemented.');
    toast({
      title: 'Refund not available',
      description: 'Refund processing is not yet supported in this environment.',
      variant: 'destructive',
    });
  };

  const getProductName = (productId: number): string => {
    const product = products.find((p) => p.id === productId);
    return product ? product.title : `Product #${productId}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      active: 'default',
      expired: 'secondary',
      refunded: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredPurchases = purchases.filter(
    (purchase) =>
      purchase.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getProductName(purchase.productId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.transactionId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">Loading purchases...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Purchase Management
              </CardTitle>
              <CardDescription>View and manage all user purchases</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Grant Access
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Grant Manual Access</DialogTitle>
                    <DialogDescription>
                      Grant a user access to a product without payment
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="userId">User ID</Label>
                      <Input
                        id="userId"
                        placeholder="Enter user ID"
                        value={grantUserId}
                        onChange={(e) => setGrantUserId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productId">Product ID</Label>
                      <Input
                        id="productId"
                        placeholder="Enter product ID"
                        value={grantProductId}
                        onChange={(e) => setGrantProductId(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleGrantAccess} disabled={isGrantingAccess}>
                      {isGrantingAccess ? 'Granting...' : 'Grant Access'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="search"
                placeholder="Search by user, product, or transaction..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Purchases Table */}
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No purchases found matching your search' : 'No purchases yet'}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-mono text-sm">
                          {purchase.userId.substring(0, 8)}...
                        </TableCell>
                        <TableCell>{getProductName(purchase.productId)}</TableCell>
                        <TableCell>
                          {purchase.currency} {(purchase.amount / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                        <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                        <TableCell>{formatDate(purchase.expiryDate)}</TableCell>
                        <TableCell>
                          {purchase.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRefund(purchase.id)}
                            >
                              Refund
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
