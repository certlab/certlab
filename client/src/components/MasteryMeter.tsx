import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/lib/auth-provider";
import { ChevronDown, ChevronUp, Grid, List, BarChart3 } from "lucide-react";
import { queryKeys } from "@/lib/queryClient";
import type { Category, Subcategory, MasteryScore } from "@shared/schema";
import { useState } from "react";

interface MasteryMeterProps {
  selectedCategoryId?: number;
}

export default function MasteryMeter({ selectedCategoryId }: MasteryMeterProps) {
  const { user: currentUser } = useAuth();
  const [viewMode, setViewMode] = useState<'summary' | 'grid' | 'detailed'>('summary');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: queryKeys.subcategories.all(),
  });

  const { data: masteryScores = [] } = useQuery<MasteryScore[]>({
    queryKey: queryKeys.user.mastery(currentUser?.id),
    enabled: !!currentUser,
  });

  // Filter by selected category if provided
  const filteredCategories = selectedCategoryId 
    ? categories.filter(cat => cat.id === selectedCategoryId)
    : categories;

  const getMasteryLevel = (score: number) => {
    if (score >= 90) return { level: "Expert", color: "bg-emerald-500", textColor: "text-emerald-700" };
    if (score >= 80) return { level: "Advanced", color: "bg-blue-500", textColor: "text-blue-700" };
    if (score >= 70) return { level: "Intermediate", color: "bg-yellow-500", textColor: "text-yellow-700" };
    if (score >= 60) return { level: "Beginner", color: "bg-orange-500", textColor: "text-orange-700" };
    return { level: "Novice", color: "bg-red-500", textColor: "text-red-700" };
  };

  const calculateCategoryMastery = (categoryId: number) => {
    const categorySubcategories = subcategories.filter(sub => sub.categoryId === categoryId);
    const categoryMasteryScores = masteryScores.filter(score => score.categoryId === categoryId);

    if (categoryMasteryScores.length === 0) return 0;

    // Calculate weighted average based on total answers per subcategory
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const score of categoryMasteryScores) {
      const weight = score.totalAnswers;
      totalWeightedScore += score.rollingAverage * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  };

  const getSubcategoryMastery = (categoryId: number, subcategoryId: number) => {
    const masteryScore = masteryScores.find(score => 
      score.categoryId === categoryId && score.subcategoryId === subcategoryId
    );
    return masteryScore ? masteryScore.rollingAverage : 0;
  };

  const toggleCategoryExpansion = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  if (filteredCategories.length === 0) {
    return (
      <Card className="bg-card border-border/50 card-hover">
        <CardHeader className="p-6 border-b border-gray-100">
          <CardTitle className="text-xl font-medium text-gray-900">
            Mastery Meter
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-gray-600 text-sm">
            Complete quiz assessments to see your mastery progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Summary View Component
  const SummaryView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filteredCategories.map((category) => {
        const categoryMastery = calculateCategoryMastery(category.id);
        const masteryInfo = getMasteryLevel(categoryMastery);
        const categorySubcategories = subcategories.filter(sub => sub.categoryId === category.id);
        const completedDomains = categorySubcategories.filter(sub => 
          getSubcategoryMastery(category.id, sub.id) >= 85
        ).length;

        return (
          <Card key={category.id} className="card-enhanced card-hover transition-colors">
            <CardContent className="card-spacious">
              <div className="flex items-center justify-between section-rhythm">
                <div className="flex items-center space-x-3">
                  <i className={`${category.icon} text-primary text-lg`}></i>
                  <div>
                    <h3 className="font-medium text-gray-900 text-comfortable">{category.name}</h3>
                    <p className="text-xs text-gray-500">
                      {completedDomains}/{categorySubcategories.length} domains ready
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={masteryInfo.textColor}>
                    {masteryInfo.level}
                  </Badge>
                  <p className="text-lg font-semibold text-gray-700 mt-1">
                    {categoryMastery}%
                  </p>
                </div>
              </div>
              
              <Progress value={categoryMastery} className="h-2 mb-3" />
              
              {/* Domain Progress Visualization */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>Domain Progress</span>
                  <span>{completedDomains}/{categorySubcategories.length} ready</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {categorySubcategories.map((subcategory) => {
                    const subcategoryMastery = getSubcategoryMastery(category.id, subcategory.id);
                    const hasData = masteryScores.some(score => 
                      score.categoryId === category.id && score.subcategoryId === subcategory.id
                    );
                    
                    const getStatusColor = () => {
                      if (!hasData) return 'bg-gray-200';
                      if (subcategoryMastery >= 85) return 'bg-green-500';
                      if (subcategoryMastery >= 70) return 'bg-blue-500';
                      if (subcategoryMastery >= 50) return 'bg-yellow-500';
                      return 'bg-red-400';
                    };

                    return (
                      <div
                        key={subcategory.id}
                        className={`w-6 h-6 rounded ${getStatusColor()} flex items-center justify-center`}
                        title={`${subcategory.name}: ${hasData ? `${subcategoryMastery}%` : 'No data'}`}
                      >
                        {subcategoryMastery >= 85 && hasData && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Details View */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCategoryExpansion(category.id)}
                className="w-full justify-between text-xs"
              >
                View Details
                {expandedCategories.has(category.id) ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </Button>
              
              <Collapsible open={expandedCategories.has(category.id)}>
                <CollapsibleContent className="mt-3 space-y-2">
                  {categorySubcategories.map((subcategory) => {
                    const subcategoryMastery = getSubcategoryMastery(category.id, subcategory.id);
                    const hasData = masteryScores.some(score => 
                      score.categoryId === category.id && score.subcategoryId === subcategory.id
                    );

                    return (
                      <div key={subcategory.id} className="flex items-center gap-3 text-sm">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          !hasData ? 'bg-gray-200' :
                          subcategoryMastery >= 85 ? 'bg-green-500' :
                          subcategoryMastery >= 70 ? 'bg-blue-500' :
                          subcategoryMastery >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                        }`}></div>
                        <span className="text-gray-600 truncate flex-1">{subcategory.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                !hasData ? 'bg-gray-300' :
                                subcategoryMastery >= 85 ? 'bg-green-500' :
                                subcategoryMastery >= 70 ? 'bg-blue-500' :
                                subcategoryMastery >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.max(subcategoryMastery, 5)}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-medium min-w-8 text-right ${
                            subcategoryMastery >= 85 ? 'text-green-600' : 
                            subcategoryMastery >= 70 ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {hasData ? `${subcategoryMastery}%` : '--'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Grid View Component
  const GridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredCategories.map((category) => {
        const categoryMastery = calculateCategoryMastery(category.id);
        const masteryInfo = getMasteryLevel(categoryMastery);
        const categorySubcategories = subcategories.filter(sub => sub.categoryId === category.id);
        const completedDomains = categorySubcategories.filter(sub => 
          getSubcategoryMastery(category.id, sub.id) >= 85
        ).length;

        return (
          <Card key={category.id} className="material-shadow border border-gray-100 text-center hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <i className={`${category.icon} text-primary text-2xl mb-3 block`}></i>
              <h3 className="font-medium text-gray-900 text-sm mb-2">{category.name}</h3>
              
              {/* Mini domain indicators */}
              <div className="flex justify-center gap-1 mb-3">
                {categorySubcategories.slice(0, 6).map((subcategory) => {
                  const subcategoryMastery = getSubcategoryMastery(category.id, subcategory.id);
                  const hasData = masteryScores.some(score => 
                    score.categoryId === category.id && score.subcategoryId === subcategory.id
                  );
                  
                  return (
                    <div
                      key={subcategory.id}
                      className={`w-2 h-2 rounded-full ${
                        !hasData ? 'bg-gray-200' :
                        subcategoryMastery >= 85 ? 'bg-green-500' :
                        subcategoryMastery >= 70 ? 'bg-blue-500' :
                        subcategoryMastery >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                      }`}
                      title={`${subcategory.name}: ${hasData ? `${subcategoryMastery}%` : 'No data'}`}
                    ></div>
                  );
                })}
                {categorySubcategories.length > 6 && (
                  <span className="text-xs text-gray-400">+{categorySubcategories.length - 6}</span>
                )}
              </div>
              
              <div className="space-y-2">
                <Progress value={categoryMastery} className="h-2" />
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-xs ${masteryInfo.textColor}`}>
                    {categoryMastery}%
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {completedDomains}/{categorySubcategories.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <Card className="card-raised">
      <CardHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-medium text-foreground">
                Certification Progress
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Track your readiness across certifications
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant={viewMode === 'summary' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('summary')}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-2"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {viewMode === 'summary' ? <SummaryView /> : <GridView />}
        
        {/* Legend and Info */}
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Domain Status:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Ready (85%+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Good (70-84%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Fair (50-69%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span>Needs Work (&lt;50%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              <span>No Data</span>
            </div>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center space-x-2 text-sm text-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">Goal: 85%+ mastery in all domains for certification readiness</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}