import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileText, PlayCircle, Star, ShoppingCart, Search } from 'lucide-react';

// Study materials with CLAY OS style data
interface StudyMaterial {
  id: string;
  title: string;
  type: 'PDF' | 'VIDEO';
  rating: number;
  price: number;
  format?: string;
  size?: string;
}

const studyMaterials: StudyMaterial[] = [
  {
    id: '1',
    title: 'Advanced Algorithms Notes',
    type: 'PDF',
    rating: 4.9,
    price: 12,
  },
  {
    id: '2',
    title: 'Organic Chem Video Course',
    type: 'VIDEO',
    rating: 4.8,
    price: 45,
  },
  {
    id: '3',
    title: 'Economics 101 Guide',
    type: 'PDF',
    rating: 4.6,
    price: 8.5,
  },
  {
    id: '4',
    title: 'Physics Lab Manual',
    type: 'PDF',
    rating: 4.7,
    price: 15,
  },
  {
    id: '5',
    title: 'Calculus Lecture Series',
    type: 'VIDEO',
    rating: 4.9,
    price: 39,
  },
  {
    id: '6',
    title: 'Chemistry Study Pack',
    type: 'PDF',
    rating: 4.5,
    price: 10,
  },
];

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="search"
              placeholder="Search study materials..."
              className="pl-12 py-6 text-base rounded-xl"
            />
          </div>
        </div>

        {/* Materials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studyMaterials.map((material) => (
            <Card
              key={material.id}
              className="overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <CardContent className="p-0">
                {/* Icon/Thumbnail Section */}
                <div className="bg-muted/30 flex items-center justify-center py-16">
                  {material.type === 'PDF' ? (
                    <FileText className="w-16 h-16 text-muted-foreground" />
                  ) : (
                    <PlayCircle className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6">
                  {/* Type Badge */}
                  <div className="mb-3">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {material.type}
                    </Badge>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold text-yellow-600">{material.rating}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-lg mb-4 text-foreground">{material.title}</h3>

                  {/* Price and Cart Button */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">${material.price}</span>
                    <Button
                      size="icon"
                      className="rounded-full w-12 h-12 bg-primary hover:bg-primary/90"
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
