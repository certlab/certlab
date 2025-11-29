import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Package } from 'lucide-react';

// Define study material types
interface StudyMaterial {
  id: string;
  name: string;
  type: string;
  tokens: number;
  description?: string;
  featured?: boolean;
}

// Sample study materials data
const studyMaterials: StudyMaterial[] = [
  {
    id: 'cissp-questions-500',
    name: 'CISSP Question Pack',
    type: 'CISSP Questions',
    tokens: 500,
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
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

  const handleBuyNow = (materialId: string) => {
    // Integration with purchase/token flow to be handled in another issue
    console.log('Buy material:', materialId);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
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
                    <div>
                      <Button
                        size="lg"
                        className="px-8"
                        onClick={() => handleBuyNow(featuredMaterial.id)}
                      >
                        Buy Now
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Study Material Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {gridMaterials.map((material) => (
                <Card
                  key={material.id}
                  className="flex flex-col items-center text-center p-4 hover:shadow-lg transition-all duration-200"
                >
                  <CardContent className="flex flex-col items-center p-0 w-full">
                    <div className="mb-3">
                      <span className="text-sm font-medium text-foreground">{material.type}</span>
                    </div>
                    <div className="mb-4">
                      <span className="text-muted-foreground">({material.tokens})</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full max-w-[100px]"
                      onClick={() => handleBuyNow(material.id)}
                    >
                      Buy
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {gridMaterials.map((material) => (
                <Card
                  key={`topic-${material.id}`}
                  className="flex flex-col items-center text-center p-4 hover:shadow-lg transition-all duration-200"
                >
                  <CardContent className="flex flex-col items-center p-0 w-full">
                    <div className="mb-3">
                      <span className="text-sm font-medium text-foreground">{material.type}</span>
                    </div>
                    <div className="mb-4">
                      <span className="text-muted-foreground">({material.tokens})</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full max-w-[100px]"
                      onClick={() => handleBuyNow(material.id)}
                    >
                      Buy
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
