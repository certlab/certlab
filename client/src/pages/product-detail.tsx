import { useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, PlayCircle, Star, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// Study materials with CLAY OS style data
interface StudyMaterial {
  id: string;
  title: string;
  type: 'PDF' | 'VIDEO';
  rating: number;
  price: number;
  description?: string;
  format?: string;
  size?: string;
  duration?: string;
  author?: string;
  lastUpdated?: string;
}

const studyMaterials: StudyMaterial[] = [
  {
    id: '1',
    title: 'Advanced Algorithms Notes',
    type: 'PDF',
    rating: 4.9,
    price: 12,
    description:
      'Comprehensive notes covering advanced algorithm topics including dynamic programming, graph algorithms, and complexity analysis. Perfect for exam preparation and deep understanding.',
    format: 'PDF',
    size: '15 MB',
    author: 'Dr. Sarah Chen',
    lastUpdated: 'December 2024',
  },
  {
    id: '2',
    title: 'Organic Chem Video Course',
    type: 'VIDEO',
    rating: 4.8,
    price: 45,
    description:
      'Complete video course covering all aspects of organic chemistry with visual demonstrations, reaction mechanisms, and problem-solving strategies.',
    duration: '12 hours',
    author: 'Prof. Michael Torres',
    lastUpdated: 'November 2024',
  },
  {
    id: '3',
    title: 'Economics 101 Guide',
    type: 'PDF',
    rating: 4.6,
    price: 8.5,
    description:
      'Essential guide to microeconomics and macroeconomics fundamentals. Includes practice problems and real-world examples.',
    format: 'PDF',
    size: '8 MB',
    author: 'Dr. James Wilson',
    lastUpdated: 'October 2024',
  },
  {
    id: '4',
    title: 'Physics Lab Manual',
    type: 'PDF',
    rating: 4.7,
    price: 15,
    description:
      'Detailed lab procedures and experiments for physics courses. Includes safety guidelines, data collection templates, and analysis techniques.',
    format: 'PDF',
    size: '22 MB',
    author: 'Dr. Emily Rodriguez',
    lastUpdated: 'December 2024',
  },
  {
    id: '5',
    title: 'Calculus Lecture Series',
    type: 'VIDEO',
    rating: 4.9,
    price: 39,
    description:
      'Complete calculus course from limits to integration. Features step-by-step explanations and worked examples.',
    duration: '18 hours',
    author: 'Prof. David Kim',
    lastUpdated: 'January 2025',
  },
  {
    id: '6',
    title: 'Chemistry Study Pack',
    type: 'PDF',
    rating: 4.5,
    price: 10,
    description:
      'Study materials for general chemistry including periodic table trends, stoichiometry, and chemical bonding.',
    format: 'PDF',
    size: '12 MB',
    author: 'Dr. Lisa Anderson',
    lastUpdated: 'September 2024',
  },
];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  // Find the product by ID
  const product = studyMaterials.find((material) => material.id === id);

  // If product not found, show error message
  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/app/marketplace">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>
          <Card className="p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
              <p className="text-muted-foreground mb-6">
                The product you're looking for doesn't exist or has been removed.
              </p>
              <Link to="/app/marketplace">
                <Button>Return to Marketplace</Button>
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link to="/app/marketplace">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Product Image/Icon Section */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-muted/30 flex items-center justify-center py-24">
                  {product.type === 'PDF' ? (
                    <FileText className="w-32 h-32 text-muted-foreground" />
                  ) : (
                    <PlayCircle className="w-32 h-32 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Purchase Card */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="mb-4">
                  <span className="text-3xl font-bold text-foreground">${product.price}</span>
                </div>
                <Button className="w-full" size="lg">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Product Details Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-3">
                      {product.type}
                    </Badge>
                    <CardTitle className="text-3xl mb-3">{product.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-semibold text-yellow-600">
                        {product.rating}
                      </span>
                      <span className="text-muted-foreground">rating</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.author && (
                      <div>
                        <span className="text-sm text-muted-foreground">Author</span>
                        <p className="font-medium">{product.author}</p>
                      </div>
                    )}
                    {product.format && (
                      <div>
                        <span className="text-sm text-muted-foreground">Format</span>
                        <p className="font-medium">{product.format}</p>
                      </div>
                    )}
                    {product.size && (
                      <div>
                        <span className="text-sm text-muted-foreground">Size</span>
                        <p className="font-medium">{product.size}</p>
                      </div>
                    )}
                    {product.duration && (
                      <div>
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <p className="font-medium">{product.duration}</p>
                      </div>
                    )}
                    {product.lastUpdated && (
                      <div>
                        <span className="text-sm text-muted-foreground">Last Updated</span>
                        <p className="font-medium">{product.lastUpdated}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* What's Included */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">What's Included</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    {product.type === 'PDF' ? (
                      <>
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Downloadable PDF document</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Lifetime access</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Print-friendly format</span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Streaming video access</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Lifetime access</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Mobile and desktop viewing</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
