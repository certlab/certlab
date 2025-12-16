import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShoppingCart, Package, Eye, Coins, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage-factory';
import { clientStorage } from '@/lib/client-storage';
import { queryKeys, queryClient } from '@/lib/queryClient';
import type { Category, MarketplacePurchase } from '@shared/schema';

// ============================================================================
// Configuration Constants
// ============================================================================

/** Default tenant ID for multi-tenant data isolation */
const DEFAULT_TENANT_ID = 1;

/** Minimum tokens to add when user has insufficient balance */
const MIN_TOKENS_TO_ADD = 50;

/** Button styling constant for consistent sizing across all marketplace buttons */
const BUTTON_CLASS_NAME = 'flex-1 max-w-[80px]';

// ============================================================================
// Type Definitions
// ============================================================================

/** Study material available for purchase in the marketplace */
interface StudyMaterial {
  id: string;
  name: string;
  type: string;
  tokens: number;
  description?: string;
  featured?: boolean;
}

// ============================================================================
// Components
// ============================================================================

/** Props for the MaterialCardGrid component */
interface MaterialCardGridProps {
  materials: StudyMaterial[];
  purchasedMaterialIds: Set<string>;
  onBuy: (material: StudyMaterial) => void;
  onPreview: (material: StudyMaterial) => void;
  keyPrefix?: string;
}

function MaterialCardGrid({
  materials,
  purchasedMaterialIds,
  onBuy,
  onPreview,
  keyPrefix = '',
}: MaterialCardGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {materials.map((material) => {
        const isPurchased = purchasedMaterialIds.has(material.id);
        return (
          <Card
            key={`${keyPrefix}${material.id}`}
            className={`flex flex-col items-center text-center p-4 hover:shadow-lg transition-all duration-200 ${
              isPurchased ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''
            }`}
          >
            <CardContent className="flex flex-col items-center p-0 w-full">
              {isPurchased && (
                <Badge
                  variant="secondary"
                  className="mb-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Owned
                </Badge>
              )}
              <div className="mb-3">
                <span className="text-sm font-medium text-foreground">{material.type}</span>
              </div>
              <div className="mb-4">
                <span className="text-muted-foreground">({material.tokens} tokens)</span>
              </div>
              <div className="flex gap-2 w-full justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className={BUTTON_CLASS_NAME}
                  onClick={() => onPreview(material)}
                  aria-label={`Preview ${material.name} - ${material.tokens} tokens`}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
                {isPurchased ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className={BUTTON_CLASS_NAME}
                    disabled
                    aria-label={`${material.name} already purchased`}
                  >
                    Owned
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className={BUTTON_CLASS_NAME}
                    onClick={() => onBuy(material)}
                    aria-label={`Buy ${material.name} for ${material.tokens} tokens`}
                  >
                    Buy
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Sample study materials data
const studyMaterials: StudyMaterial[] = [
  {
    id: 'cissp-questions-500',
    name: 'CISSP Question Pack',
    type: 'CISSP Questions',
    tokens: 500,
    description:
      'Comprehensive question bank with 500 practice questions covering all CISSP domains.',
    featured: true,
  },
  { id: 'cism-questions-500', name: 'CISM Question Pack', type: 'CISM Questions', tokens: 500 },
  {
    id: 'security-plus-400',
    name: 'Security+ Question Pack',
    type: 'Security+ Questions',
    tokens: 400,
  },
  { id: 'cissp-study-guide', name: 'CISSP Study Guide', type: 'CISSP Study Guide', tokens: 200 },
  { id: 'cism-flashcards', name: 'CISM Flashcards', type: 'CISM Flashcards', tokens: 150 },
  {
    id: 'cism-questions-400',
    name: 'CISM Question Pack (Basic)',
    type: 'CISM Questions',
    tokens: 400,
  },
  {
    id: 'security-plus-200',
    name: 'Security+ Starter Pack',
    type: 'Security+ Questions',
    tokens: 200,
  },
  {
    id: 'cissp-flashcards',
    name: 'CISSP Flashcards',
    type: 'CISSP Flashcards',
    tokens: 175,
  },
];

// Get the featured material
const featuredMaterial = studyMaterials.find((m) => m.featured);
// Get the non-featured materials for the grid
const gridMaterials = studyMaterials.filter((m) => !m.featured);

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState('categories');
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // State for purchase confirmation dialog
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);
  const [insufficientTokensDialogOpen, setInsufficientTokensDialogOpen] = useState(false);

  // Fetch categories to map material types to category IDs
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Fetch user's token balance
  const { data: tokenData } = useQuery({
    queryKey: queryKeys.user.tokenBalance(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Fetch user's purchases
  const { data: userPurchases = [] } = useQuery<MarketplacePurchase[]>({
    queryKey: ['/api', 'user', currentUser?.id, 'purchases'],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      return await clientStorage.getUserPurchases(currentUser.id);
    },
    enabled: !!currentUser?.id,
  });

  // Create a set of purchased material IDs for quick lookup
  const purchasedMaterialIds = new Set(userPurchases.map((p) => p.materialId));

  const tokenBalance = (tokenData as { balance: number } | undefined)?.balance ?? 0;

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (material: StudyMaterial) => {
      if (!currentUser?.id) throw new Error('Not authenticated');
      return await clientStorage.purchaseMaterial(
        currentUser.id,
        material.id,
        material.name,
        material.type,
        material.tokens
      );
    },
    onSuccess: (result, material) => {
      if (result.success) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.user.tokenBalance(currentUser?.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
        queryClient.invalidateQueries({ queryKey: ['/api', 'user', currentUser?.id, 'purchases'] });

        toast({
          title: 'Purchase Successful!',
          description: `You now own "${material.name}". Your new balance is ${result.newBalance} tokens.`,
        });
      } else {
        toast({
          title: 'Purchase Failed',
          description: result.message || 'An error occurred during the purchase.',
          variant: 'destructive',
        });
      }
      setPurchaseDialogOpen(false);
      setSelectedMaterial(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete purchase.',
        variant: 'destructive',
      });
      setPurchaseDialogOpen(false);
      setSelectedMaterial(null);
    },
  });

  // Helper function to get category ID from material type
  const getCategoryIdFromMaterial = (material: StudyMaterial): number | null => {
    // Normalize material type to handle common variations
    const materialType = material.type.toLowerCase();
    // Map common variations to canonical category names
    const typeMap: Record<string, string> = {
      'security+': 'security plus',
      'sec+': 'security plus',
      'security plus': 'security plus',
      cissp: 'cissp',
      cism: 'cism',
    };

    // Extract the certification name from the material type (e.g., "CISSP Questions" -> "cissp")
    const trimmedType = materialType.trim();
    const certName = trimmedType.split(' ')[0] || trimmedType;
    // Try to normalize the type using the map, fallback to original
    const normalizedType = typeMap[certName] || certName;

    // Try to find a category whose name matches the normalized type (case-insensitive)
    const exactMatch = categories.find((c) => normalizedType === c.name.toLowerCase());
    if (exactMatch) return exactMatch.id;

    // Fallback: try to find a category whose name is included in the normalized type
    const partialMatch = categories.find(
      (c) =>
        trimmedType.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(normalizedType)
    );
    return partialMatch?.id ?? null;
  };

  // Handle preview - creates a quiz with sample questions from the material's category
  const handlePreview = async (material: StudyMaterial) => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to preview study materials.',
        variant: 'destructive',
      });
      return;
    }

    if (categoriesLoading) {
      toast({
        title: 'Loading',
        description: 'Please wait while we load available categories...',
      });
      return;
    }

    const categoryId = getCategoryIdFromMaterial(material);
    if (!categoryId) {
      toast({
        title: 'Preview Unavailable',
        description: 'This certification category is not yet available for preview.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if questions are available before creating the quiz
      const user = await storage.getUser(currentUser.id);
      const tenantId = user?.tenantId || DEFAULT_TENANT_ID;

      const availableQuestions = await storage.getQuestionsByCategories(
        [categoryId],
        undefined,
        undefined,
        tenantId
      );

      if (availableQuestions.length === 0) {
        toast({
          title: 'No Questions Available',
          description: `There are no questions available for ${material.name} yet. Please check back later.`,
          variant: 'destructive',
        });
        return;
      }

      // Create a preview quiz with the minimum of 5 or available questions
      const quiz = await storage.createQuiz({
        userId: currentUser.id,
        title: `${material.name} Preview`,
        categoryIds: [categoryId],
        subcategoryIds: [],
        questionCount: Math.min(5, availableQuestions.length),
        mode: 'study',
      });

      toast({
        title: 'Preview Quiz Created',
        description: `Starting preview for ${material.name}`,
      });

      // Navigate to the quiz page
      setLocation(`/app/quiz/${quiz.id}`);
    } catch (error) {
      console.error('Error creating preview quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to create preview quiz. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle buy button click - shows confirmation dialog
  const handleBuyClick = (material: StudyMaterial) => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to purchase study materials.',
        variant: 'destructive',
      });
      return;
    }

    // Check if already purchased
    if (purchasedMaterialIds.has(material.id)) {
      toast({
        title: 'Already Owned',
        description: 'You have already purchased this study material.',
      });
      return;
    }

    // Check if user has sufficient tokens
    if (tokenBalance < material.tokens) {
      setSelectedMaterial(material);
      setInsufficientTokensDialogOpen(true);
      return;
    }

    // Show confirmation dialog
    setSelectedMaterial(material);
    setPurchaseDialogOpen(true);
  };

  // Confirm purchase
  const handleConfirmPurchase = () => {
    if (selectedMaterial) {
      purchaseMutation.mutate(selectedMaterial);
    }
  };

  // Handle adding tokens and proceeding with purchase
  const handleAddTokensAndPurchase = async () => {
    if (!currentUser?.id || !selectedMaterial) return;

    const tokensNeeded = selectedMaterial.tokens - tokenBalance;
    const amountToAdd = Math.max(tokensNeeded, MIN_TOKENS_TO_ADD);

    try {
      await storage.addTokens(currentUser.id, amountToAdd);
      // Wait for query invalidation to complete before showing purchase dialog
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.user.tokenBalance(currentUser.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() }),
      ]);

      toast({
        title: 'Tokens Added',
        description: `Added ${amountToAdd} tokens to your account.`,
      });

      setInsufficientTokensDialogOpen(false);
      // Now proceed with the purchase
      setPurchaseDialogOpen(true);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add tokens. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header with Token Balance */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Study Materials Marketplace</h1>
          <p className="text-lg text-muted-foreground mb-4">
            Browse and purchase study materials to enhance your certification preparation
          </p>

          {/* Token Balance Display */}
          {currentUser && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Coins className="w-5 h-5 text-primary" />
              <span className="font-semibold text-primary">{tokenBalance} tokens</span>
            </div>
          )}
        </div>

        {/* Tabs for Categories and Topics */}
        <Tabs
          defaultValue="categories"
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-8"
        >
          <div className="flex justify-center mb-6">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="topics">Topics</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="categories">
            {/* Featured Item Section */}
            {featuredMaterial && (
              <Card
                className={`mb-8 overflow-hidden ${
                  purchasedMaterialIds.has(featuredMaterial.id)
                    ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10'
                    : ''
                }`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Image Placeholder */}
                  <div className="w-full md:w-1/3 aspect-square md:aspect-auto min-h-[200px] md:min-h-[280px] bg-muted flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {/* X placeholder like in the wireframe */}
                      <svg
                        className="w-full h-full text-muted-foreground/30"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        role="img"
                        aria-label="Featured material image placeholder"
                      >
                        <line
                          x1="0"
                          y1="0"
                          x2="100"
                          y2="100"
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                        <line
                          x1="100"
                          y1="0"
                          x2="0"
                          y2="100"
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                        <rect
                          x="0"
                          y="0"
                          width="100"
                          height="100"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                      </svg>
                    </div>
                    <Package className="w-16 h-16 text-muted-foreground/50 absolute" />
                  </div>

                  {/* Featured Content */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      {purchasedMaterialIds.has(featuredMaterial.id) && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Owned
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl md:text-3xl mb-2">
                      {featuredMaterial.name} ({featuredMaterial.tokens} Tokens)
                    </CardTitle>
                    <CardDescription className="text-base md:text-lg mb-6 max-w-xl">
                      {featuredMaterial.description}
                    </CardDescription>
                    <div className="flex gap-3">
                      <Button
                        size="lg"
                        variant="outline"
                        className="px-6"
                        onClick={() => handlePreview(featuredMaterial)}
                        aria-label={`Preview ${featuredMaterial.name} - ${featuredMaterial.tokens} tokens`}
                      >
                        <Eye className="w-5 h-5 mr-2" />
                        Preview
                      </Button>
                      {purchasedMaterialIds.has(featuredMaterial.id) ? (
                        <Button size="lg" variant="secondary" className="px-8" disabled>
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Owned
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          className="px-8"
                          onClick={() => handleBuyClick(featuredMaterial)}
                          aria-label={`Buy ${featuredMaterial.name} for ${featuredMaterial.tokens} tokens`}
                        >
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          Buy Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Study Material Cards Grid */}
            <MaterialCardGrid
              materials={gridMaterials}
              purchasedMaterialIds={purchasedMaterialIds}
              onBuy={handleBuyClick}
              onPreview={handlePreview}
            />
          </TabsContent>

          <TabsContent value="topics">
            {/* Topics view - showing same content for now */}
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Browse by Topics</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Filter study materials by specific topics and domains within each certification.
              </p>
            </div>

            {/* Topics Grid - same materials for now */}
            <MaterialCardGrid
              materials={gridMaterials}
              purchasedMaterialIds={purchasedMaterialIds}
              onBuy={handleBuyClick}
              onPreview={handlePreview}
              keyPrefix="topic-"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Purchase Confirmation Dialog */}
      <AlertDialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>You are about to purchase:</p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold">{selectedMaterial?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedMaterial?.type}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-medium">{selectedMaterial?.tokens} tokens</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                <span>Your balance after purchase:</span>
                <span className="font-semibold">
                  {Math.max(0, tokenBalance - (selectedMaterial?.tokens || 0))} tokens
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purchaseMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPurchase}
              disabled={purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? 'Processing...' : 'Confirm Purchase'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Insufficient Tokens Dialog */}
      <AlertDialog
        open={insufficientTokensDialogOpen}
        onOpenChange={setInsufficientTokensDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Insufficient Tokens
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>You don't have enough tokens to purchase this item.</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <span>Current balance:</span>
                  <span className="font-semibold">{tokenBalance} tokens</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span>Required:</span>
                  <span className="font-semibold">{selectedMaterial?.tokens || 0} tokens</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span>Tokens needed:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {Math.max(0, (selectedMaterial?.tokens || 0) - tokenBalance)} tokens
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                💡 Tokens are free in this client-side version! We can add them for you.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddTokensAndPurchase}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Coins className="w-4 h-4 mr-2" />
              Add Tokens & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
