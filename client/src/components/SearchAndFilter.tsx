import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Search, X, Calendar as CalendarIcon, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type ContentType = 'quiz' | 'lecture' | 'template' | 'all';
export type VisibilityType = 'private' | 'shared' | 'public' | 'all';
export type CompletionStatus = 'completed' | 'incomplete' | 'passed' | 'failed' | 'all';
export type SortOption =
  | 'date-desc'
  | 'date-asc'
  | 'title-asc'
  | 'title-desc'
  | 'difficulty-asc'
  | 'difficulty-desc'
  | 'author-asc'
  | 'author-desc';

export interface SearchAndFilterState {
  searchText: string;
  contentType: ContentType;
  tags: string[];
  difficultyLevels: number[];
  authors: string[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  visibility: VisibilityType;
  completionStatus: CompletionStatus;
  sortBy: SortOption;
}

export interface SearchAndFilterProps {
  onFilterChange: (filters: SearchAndFilterState) => void;
  availableTags?: string[];
  availableAuthors?: string[];
  showContentTypeFilter?: boolean;
  showCompletionFilter?: boolean;
  showVisibilityFilter?: boolean;
  placeholder?: string;
  className?: string;
}

const DEFAULT_FILTERS: SearchAndFilterState = {
  searchText: '',
  contentType: 'all',
  tags: [],
  difficultyLevels: [],
  authors: [],
  dateFrom: undefined,
  dateTo: undefined,
  visibility: 'all',
  completionStatus: 'all',
  sortBy: 'date-desc',
};

export function SearchAndFilter({
  onFilterChange,
  availableTags = [],
  availableAuthors = [],
  showContentTypeFilter = true,
  showCompletionFilter = false,
  showVisibilityFilter = false,
  placeholder = 'Search by title, description, or tags...',
  className,
}: SearchAndFilterProps) {
  const [filters, setFilters] = useState<SearchAndFilterState>(DEFAULT_FILTERS);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, searchText: searchInput }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const updateFilter = <K extends keyof SearchAndFilterState>(
    key: K,
    value: SearchAndFilterState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const toggleDifficulty = (level: number) => {
    setFilters((prev) => ({
      ...prev,
      difficultyLevels: prev.difficultyLevels.includes(level)
        ? prev.difficultyLevels.filter((l) => l !== level)
        : [...prev.difficultyLevels, level],
    }));
  };

  const toggleAuthor = (author: string) => {
    setFilters((prev) => ({
      ...prev,
      authors: prev.authors.includes(author)
        ? prev.authors.filter((a) => a !== author)
        : [...prev.authors, author],
    }));
  };

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
  };

  const hasActiveFilters =
    filters.searchText ||
    filters.contentType !== 'all' ||
    filters.tags.length > 0 ||
    filters.difficultyLevels.length > 0 ||
    filters.authors.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.visibility !== 'all' ||
    filters.completionStatus !== 'all' ||
    filters.sortBy !== 'date-desc';

  const activeFilterCount =
    (filters.searchText ? 1 : 0) +
    (filters.contentType !== 'all' ? 1 : 0) +
    filters.tags.length +
    filters.difficultyLevels.length +
    filters.authors.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.visibility !== 'all' ? 1 : 0) +
    (filters.completionStatus !== 'all' ? 1 : 0) +
    (filters.sortBy !== 'date-desc' ? 1 : 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Sort By */}
        <Select
          value={filters.sortBy}
          onValueChange={(value) => updateFilter('sortBy', value as SortOption)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="title-asc">Title (A-Z)</SelectItem>
            <SelectItem value="title-desc">Title (Z-A)</SelectItem>
            <SelectItem value="difficulty-asc">Easiest First</SelectItem>
            <SelectItem value="difficulty-desc">Hardest First</SelectItem>
            {/* Author sort options only shown when authors are available in the dataset */}
            {availableAuthors.length > 0 && (
              <>
                <SelectItem value="author-asc">Author (A-Z)</SelectItem>
                <SelectItem value="author-desc">Author (Z-A)</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="relative"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs min-w-[20px] h-5">
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown
            className={cn('h-4 w-4 ml-2 transition-transform', showAdvancedFilters && 'rotate-180')}
          />
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearAllFilters} size="sm">
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Content Type Filter */}
            {showContentTypeFilter && (
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select
                  value={filters.contentType}
                  onValueChange={(value) => updateFilter('contentType', value as ContentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="quiz">Quizzes</SelectItem>
                    <SelectItem value="lecture">Lectures</SelectItem>
                    <SelectItem value="template">Templates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Visibility Filter */}
            {showVisibilityFilter && (
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={filters.visibility}
                  onValueChange={(value) => updateFilter('visibility', value as VisibilityType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Completion Status Filter */}
            {showCompletionFilter && (
              <div className="space-y-2">
                <Label>Completion Status</Label>
                <Select
                  value={filters.completionStatus}
                  onValueChange={(value) =>
                    updateFilter('completionStatus', value as CompletionStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date From */}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => updateFilter('dateFrom', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(filters.dateTo, 'PP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => updateFilter('dateTo', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Difficulty Levels */}
          <div className="space-y-2">
            <Label>Difficulty Levels</Label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleDifficulty(level)}
                  aria-label={`${filters.difficultyLevels.includes(level) ? 'Remove' : 'Add'} difficulty level ${level} filter`}
                  aria-pressed={filters.difficultyLevels.includes(level)}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                >
                  <Badge
                    variant={filters.difficultyLevels.includes(level) ? 'default' : 'outline'}
                    className="cursor-pointer"
                  >
                    Level {level}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-label={`${filters.tags.includes(tag) ? 'Remove' : 'Add'} tag ${tag} filter`}
                    aria-pressed={filters.tags.includes(tag)}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                  >
                    <Badge
                      variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                    >
                      {tag}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Authors Filter */}
          {availableAuthors.length > 0 && (
            <div className="space-y-2">
              <Label>Authors</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableAuthors.map((author) => (
                  <button
                    key={author}
                    type="button"
                    onClick={() => toggleAuthor(author)}
                    aria-label={`${filters.authors.includes(author) ? 'Remove' : 'Add'} author ${author} filter`}
                    aria-pressed={filters.authors.includes(author)}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                  >
                    <Badge
                      variant={filters.authors.includes(author) ? 'default' : 'outline'}
                      className="cursor-pointer"
                    >
                      {author}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.searchText && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.searchText}
              <button
                type="button"
                className="ml-1 inline-flex h-3 w-3 items-center justify-center rounded-full cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Remove search filter"
                onClick={() => {
                  setSearchInput('');
                  updateFilter('searchText', '');
                }}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {filters.contentType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Type: {filters.contentType}
              <button
                type="button"
                className="ml-1 inline-flex h-3 w-3 items-center justify-center rounded-full cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Remove content type filter"
                onClick={() => updateFilter('contentType', 'all')}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {filters.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              Tag: {tag}
              <button
                type="button"
                className="ml-1 inline-flex h-3 w-3 items-center justify-center rounded-full cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Remove tag filter: ${tag}`}
                onClick={() => toggleTag(tag)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
          {filters.difficultyLevels.map((level) => (
            <Badge key={level} variant="secondary" className="gap-1">
              Difficulty: {level}
              <button
                type="button"
                className="ml-1 inline-flex h-3 w-3 items-center justify-center rounded-full cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Remove difficulty filter: ${level}`}
                onClick={() => toggleDifficulty(level)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
          {filters.authors.map((author) => (
            <Badge key={author} variant="secondary" className="gap-1">
              Author: {author}
              <button
                type="button"
                className="ml-1 inline-flex h-3 w-3 items-center justify-center rounded-full cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Remove author filter: ${author}`}
                onClick={() => toggleAuthor(author)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              From: {format(filters.dateFrom, 'PP')}
              <button
                type="button"
                className="ml-1 inline-flex h-3 w-3 items-center justify-center rounded-full cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Remove "from" date filter: ${format(filters.dateFrom, 'PP')}`}
                onClick={() => updateFilter('dateFrom', undefined)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              To: {format(filters.dateTo, 'PP')}
              <button
                type="button"
                className="ml-1 inline-flex h-3 w-3 items-center justify-center rounded-full cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Remove "to" date filter: ${format(filters.dateTo, 'PP')}`}
                onClick={() => updateFilter('dateTo', undefined)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
