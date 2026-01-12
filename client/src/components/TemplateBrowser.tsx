import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { queryKeys } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TemplateCard } from '@/components/TemplateCard';
import { Search, FileQuestion, FileText, Filter, X, Loader2 } from 'lucide-react';
import type { TemplateLibraryItem, TemplateSearchFilters, Category } from '@shared/schema';

interface TemplateBrowserProps {
  templateType?: 'quiz' | 'material';
  onSelect: (template: TemplateLibraryItem) => void;
  onClose?: () => void;
}

export function TemplateBrowser({ templateType, onSelect, onClose }: TemplateBrowserProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'popular' | 'recent'>('all');
  const [filters, setFilters] = useState<TemplateSearchFilters>({
    templateType,
    sortBy: 'recent',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => storage.getCategories(),
  });

  // Search templates based on current filters and tab
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', activeTab, filters, searchQuery, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const searchFilters: TemplateSearchFilters = {
        ...filters,
        searchQuery: searchQuery || undefined,
      };

      switch (activeTab) {
        case 'mine':
          return storage.getUserTemplates(user.id, templateType, user.tenantId);
        case 'popular':
          return storage.getPopularTemplates(templateType, 20, user.tenantId);
        case 'recent':
          return storage.getRecentTemplates(templateType, 20, user.tenantId);
        case 'all':
        default:
          return storage.searchTemplateLibrary(searchFilters, user.id, user.tenantId);
      }
    },
    enabled: !!user,
  });

  const handleFilterChange = (key: keyof TemplateSearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      templateType,
      sortBy: 'recent',
    });
    setSearchQuery('');
  };

  const hasActiveFilters =
    searchQuery || filters.categoryIds?.length || filters.difficultyLevel || filters.visibility;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {templateType === 'quiz' ? (
              <FileQuestion className="h-6 w-6" />
            ) : (
              <FileText className="h-6 w-6" />
            )}
            Template Library
          </h2>
          <p className="text-muted-foreground mt-1">
            Browse and insert reusable {templateType || 'content'} templates
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Filter Options</CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={
                      filters.categoryIds && filters.categoryIds.length > 0
                        ? filters.categoryIds[0].toString()
                        : 'all'
                    }
                    onValueChange={(value) =>
                      handleFilterChange(
                        'categoryIds',
                        value === 'all' ? undefined : [parseInt(value)]
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty Filter */}
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={filters.difficultyLevel?.toString() || 'all'}
                    onValueChange={(value) =>
                      handleFilterChange(
                        'difficultyLevel',
                        value === 'all' ? undefined : parseInt(value)
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All levels</SelectItem>
                      <SelectItem value="1">Beginner</SelectItem>
                      <SelectItem value="2">Intermediate</SelectItem>
                      <SelectItem value="3">Advanced</SelectItem>
                      <SelectItem value="4">Expert</SelectItem>
                      <SelectItem value="5">Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Visibility Filter */}
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={filters.visibility || 'all'}
                    onValueChange={(value) =>
                      handleFilterChange(
                        'visibility',
                        value === 'all' ? undefined : (value as 'private' | 'org' | 'public')
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All templates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All templates</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="org">Organization</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select
                  value={filters.sortBy || 'recent'}
                  onValueChange={(value) =>
                    handleFilterChange('sortBy', value as 'recent' | 'popular' | 'title')
                  }
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
          <TabsTrigger value="mine">My Templates</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No templates found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={onSelect}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Results Count */}
      {!isLoading && templates.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {templates.length} template{templates.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
