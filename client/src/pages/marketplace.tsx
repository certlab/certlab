import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  FileText,
  PlayCircle,
  Star,
  ShoppingCart,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { studyMaterials } from '@/data/study-materials';
import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function MarketplacePage() {
  const navigate = useNavigate();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('default');

  // Extract unique subjects from materials
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(studyMaterials.map((m) => m.subject).filter(Boolean) as string[]);
    return Array.from(subjects).sort();
  }, []);

  // Filter and sort materials
  const filteredMaterials = useMemo(() => {
    const filtered = studyMaterials.filter((material) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Type filter
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(material.type);

      // Subject filter
      const matchesSubject =
        selectedSubjects.length === 0 ||
        (material.subject && selectedSubjects.includes(material.subject));

      // Price filter
      const matchesPrice = material.price >= priceRange[0] && material.price <= priceRange[1];

      // Rating filter
      const matchesRating = material.rating >= minRating;

      return matchesSearch && matchesType && matchesSubject && matchesPrice && matchesRating;
    });

    // Create a copy before sorting to avoid mutation
    const sorted = [...filtered];

    // Sort materials
    switch (sortBy) {
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        // Keep original order
        break;
    }

    return sorted;
  }, [searchQuery, selectedTypes, selectedSubjects, priceRange, minRating, sortBy]);

  const handleCardClick = (materialId: string) => {
    navigate(`/app/marketplace/${materialId}`);
  };

  const handleAddToCart = (e: React.MouseEvent, _materialId: string) => {
    e.stopPropagation();
    // Cart button click would add to cart
    // TODO: Implement cart functionality
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    setSelectedSubjects([]);
    setPriceRange([0, 50]);
    setMinRating(0);
    setSortBy('default');
  };

  const activeFilterCount =
    selectedTypes.length +
    selectedSubjects.length +
    (priceRange[0] > 0 || priceRange[1] < 50 ? 1 : 0) +
    (minRating > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="mb-8 space-y-4">
          {/* Search Input */}
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="search"
                placeholder="Search study materials..."
                className="pl-12 py-6 text-base rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px] py-6 rounded-xl">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rating</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Button (Mobile Sheet) */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="py-6 rounded-xl relative">
                  <SlidersHorizontal className="w-5 h-5 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="ml-2 px-2 py-0 h-5 min-w-5 rounded-full">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search to find the perfect study materials
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Content Type Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Content Type</Label>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="type-pdf"
                          checked={selectedTypes.includes('PDF')}
                          onCheckedChange={() => handleTypeToggle('PDF')}
                        />
                        <label htmlFor="type-pdf" className="text-sm cursor-pointer">
                          PDF Documents
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="type-video"
                          checked={selectedTypes.includes('VIDEO')}
                          onCheckedChange={() => handleTypeToggle('VIDEO')}
                        />
                        <label htmlFor="type-video" className="text-sm cursor-pointer">
                          Video Courses
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Subject Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Subject</Label>
                    </div>
                    <div className="space-y-2">
                      {uniqueSubjects.map((subject) => (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subject-${subject}`}
                            checked={selectedSubjects.includes(subject)}
                            onCheckedChange={() => handleSubjectToggle(subject)}
                          />
                          <label htmlFor={`subject-${subject}`} className="text-sm cursor-pointer">
                            {subject}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Range Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Price Range</Label>
                      <span className="text-sm text-muted-foreground">
                        ${priceRange[0]} - ${priceRange[1]}
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={50}
                      step={1}
                      value={priceRange}
                      onValueChange={(value) => setPriceRange(value as [number, number])}
                      className="w-full"
                    />
                  </div>

                  {/* Rating Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Minimum Rating</Label>
                      <span className="text-sm text-muted-foreground">
                        {minRating > 0 ? `${minRating}+` : 'Any'}
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={5}
                      step={0.5}
                      value={[minRating]}
                      onValueChange={(value) => setMinRating(value[0])}
                      className="w-full"
                    />
                  </div>

                  {/* Clear Filters Button */}
                  {activeFilterCount > 0 && (
                    <Button variant="outline" className="w-full" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedTypes.map((type) => (
                <Badge key={type} variant="secondary" className="gap-1">
                  {type}
                  <button
                    type="button"
                    className="ml-1 inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    onClick={() => handleTypeToggle(type)}
                    aria-label={`Remove ${type} filter`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
              {selectedSubjects.map((subject) => (
                <Badge key={subject} variant="secondary" className="gap-1">
                  {subject}
                  <button
                    type="button"
                    className="ml-1 inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    onClick={() => handleSubjectToggle(subject)}
                    aria-label={`Remove ${subject} filter`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
              {(priceRange[0] > 0 || priceRange[1] < 50) && (
                <Badge variant="secondary" className="gap-1">
                  ${priceRange[0]} - ${priceRange[1]}
                  <button
                    type="button"
                    className="ml-1 inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    onClick={() => setPriceRange([0, 50])}
                    aria-label="Clear price range filter"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </Badge>
              )}
              {minRating > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Rating: {minRating}+
                  <button
                    type="button"
                    className="ml-1 inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    onClick={() => setMinRating(0)}
                    aria-label="Clear rating filter"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredMaterials.length} of {studyMaterials.length} materials
          </p>
        </div>

        {/* Materials Grid */}
        {filteredMaterials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <Card
                key={material.id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer h-full"
                onClick={() => handleCardClick(material.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(material.id);
                  }
                }}
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
                      <span className="text-sm font-semibold text-yellow-600">
                        {material.rating}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-lg mb-4 text-foreground">{material.title}</h3>

                    {/* Price and Cart Button */}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-foreground">${material.price}</span>
                      <Button
                        size="icon"
                        className="rounded-full w-12 h-12 bg-primary hover:bg-primary/90"
                        onClick={(e) => handleAddToCart(e, material.id)}
                        aria-label={`Add ${material.title} to cart`}
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No materials found matching your criteria.
            </p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
