import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Package, Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { clientStorage } from '@/lib/client-storage';
import { queryKeys } from '@/lib/queryClient';
import type { Category } from '@shared/schema';

// Default tenant ID for multi-tenant data isolation
const DEFAULT_TENANT_ID = 1;

// Define study material types
interface StudyMaterial {
  id: string;
  name: string;
  type: string;
  tokens: number;
  description?: string;
  featured?: boolean;
}

// Button styling constant for consistent sizing across all marketplace buttons
const BUTTON_CLASS_NAME = 'flex-1 max-w-[80px]';

// Reusable component for material card grid
interface MaterialCardGridProps {
  materials: StudyMaterial[];
  onBuy: (materialId: string) => void;
  onPreview: (material: StudyMaterial) => void;
  keyPrefix?: string;
}

function MaterialCardGrid({ materials, onBuy, onPreview, keyPrefix = '' }: MaterialCardGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {materials.map((material) => (
        <Card
          key={`${keyPrefix}${material.id}`}
          className="flex flex-col items-center text-center p-4 hover:shadow-lg transition-all duration-200"
        >
          <CardContent className="flex flex-col items-center p-0 w-full">
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
              <Button
                variant="outline"
                size="sm"
                className={BUTTON_CLASS_NAME}
                onClick={() => onBuy(material.id)}
                aria-label={`Buy ${material.name} for ${material.tokens} tokens`}
              >
                Buy
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// TODO: This data should eventually come from IndexedDB storage via clientStorage,
// following the pattern in study-notes.tsx and dashboard.tsx
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
  { id: 'cism-questions-400', name: 'CISM Question Pack', type: 'CISM Questions', tokens: 400 },
  {
    id: 'security-plus-400-2',
    name: 'Security+ Question Pack',
    type: 'Security+ Questions',
    tokens: 400,
  },
  {
    id: 'cissp-study-guide-2',
    name: 'CISSP Study Guide',
    type: 'CISSP Study Guide',
    tokens: 200,
  },
  { id: 'cism-flashcards-2', name: 'CISM Flashcards', type: 'CISM Flashcards', tokens: 150 },
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

  // Fetch categories to map material types to category IDs
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
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
      const user = await clientStorage.getUser(currentUser.id);
      const tenantId = user?.tenantId || DEFAULT_TENANT_ID;

      const availableQuestions = await clientStorage.getQuestionsByCategories(
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
      const quiz = await clientStorage.createQuiz({
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

  // TODO: Implement purchase flow with token validation, authentication check, and transaction logging
  const handleBuyNow = (materialId: string) => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to purchase study materials.',
        variant: 'destructive',
      });
      return;
    }

    // Integration with purchase/token flow to be handled in another issue
    toast({
      title: 'Coming Soon',
      description: 'The purchase feature is not yet implemented. Stay tuned!',
    });
    console.log('Buy material:', materialId);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Study Materials Marketplace</h1>
          <p className="text-lg text-muted-foreground">
            Browse and purchase study materials to enhance your certification preparation
          </p>
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
              <Card className="mb-8 overflow-hidden">
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
                      <Button
                        size="lg"
                        className="px-8"
                        onClick={() => handleBuyNow(featuredMaterial.id)}
                        aria-label={`Buy ${featuredMaterial.name} for ${featuredMaterial.tokens} tokens`}
                      >
                        Buy
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Study Material Cards Grid */}
            <MaterialCardGrid
              materials={gridMaterials}
              onBuy={handleBuyNow}
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
              onBuy={handleBuyNow}
              onPreview={handlePreview}
              keyPrefix="topic-"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
