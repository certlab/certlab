import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, PlayCircle, Star, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { studyMaterials } from '@/data/study-materials';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();

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
