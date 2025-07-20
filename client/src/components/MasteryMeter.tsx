import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { localStorage } from "@/lib/localStorage";
import { ChevronDown, ChevronUp, Grid, List, BarChart3 } from "lucide-react";
import type { Category, Subcategory, MasteryScore } from "@shared/schema";
import { useState } from "react";

interface MasteryMeterProps {
  selectedCategoryId?: number;
}

export default function MasteryMeter({ selectedCategoryId }: MasteryMeterProps) {
  const currentUser = localStorage.getCurrentUser();
  const [viewMode, setViewMode] = useState<'summary' | 'grid' | 'detailed'>('summary');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['/api/subcategories'],
  });

  const { data: masteryScores = [] } = useQuery<MasteryScore[]>({
    queryKey: ['/api/user', currentUser?.id, 'mastery'],
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
      <Card className="material-shadow border border-gray-100">
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
          <Card key={category.id} className="material-shadow border border-gray-100 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <i className={`${category.icon} text-primary text-lg`}></i>
                  <div>
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
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
                      <div key={subcategory.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 truncate flex-1">{subcategory.name}</span>
                        <span className={`text-xs font-medium ml-2 ${
                          subcategoryMastery >= 85 ? 'text-green-600' : 
                          subcategoryMastery >= 70 ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {hasData ? `${subcategoryMastery}%` : '--'}
                        </span>
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

        return (
          <Card key={category.id} className="material-shadow border border-gray-100 text-center">
            <CardContent className="p-4">
              <i className={`${category.icon} text-primary text-2xl mb-3 block`}></i>
              <h3 className="font-medium text-gray-900 text-sm mb-2">{category.name}</h3>
              <div className="space-y-2">
                <Progress value={categoryMastery} className="h-2" />
                <Badge variant="outline" className={`text-xs ${masteryInfo.textColor}`}>
                  {categoryMastery}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <Card className="material-shadow border border-gray-100">
      <CardHeader className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium text-gray-900">
              Certification Progress
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Track your readiness across certifications
            </p>
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
        
        {/* Quick Info */}
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center space-x-2 text-sm text-blue-900">
            <BarChart3 className="h-4 w-4" />
            <span className="font-medium">Goal: 85%+ mastery in all domains for certification readiness</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}