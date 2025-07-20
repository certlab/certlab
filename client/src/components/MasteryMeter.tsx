import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { localStorage } from "@/lib/localStorage";
import type { Category, Subcategory, MasteryScore } from "@shared/schema";

interface MasteryMeterProps {
  selectedCategoryId?: number;
}

export default function MasteryMeter({ selectedCategoryId }: MasteryMeterProps) {
  const currentUser = localStorage.getCurrentUser();

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

  return (
    <Card className="material-shadow border border-gray-100">
      <CardHeader className="p-6 border-b border-gray-100">
        <CardTitle className="text-xl font-medium text-gray-900">
          Certification Mastery Progress
        </CardTitle>
        <p className="text-gray-600 text-sm">
          Your progress toward certification readiness
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {filteredCategories.map((category) => {
            const categoryMastery = calculateCategoryMastery(category.id);
            const masteryInfo = getMasteryLevel(categoryMastery);
            const categorySubcategories = subcategories.filter(sub => sub.categoryId === category.id);

            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <i className={`${category.icon} text-primary text-lg`}></i>
                    <div>
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={masteryInfo.textColor}>
                      {masteryInfo.level}
                    </Badge>
                    <span className="text-sm font-medium text-gray-700">
                      {categoryMastery}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Progress 
                    value={categoryMastery} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Subcategory breakdown */}
                <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700">Domain Areas</h4>
                  {categorySubcategories.map((subcategory) => {
                    const subcategoryMastery = getSubcategoryMastery(category.id, subcategory.id);
                    const subcategoryInfo = getMasteryLevel(subcategoryMastery);
                    const hasData = masteryScores.some(score => 
                      score.categoryId === category.id && score.subcategoryId === subcategory.id
                    );

                    return (
                      <div key={subcategory.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{subcategory.name}</span>
                          <div className="flex items-center space-x-2">
                            {hasData && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${subcategoryInfo.textColor}`}
                              >
                                {subcategoryInfo.level}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {hasData ? `${subcategoryMastery}%` : 'No data'}
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={subcategoryMastery} 
                          className="h-1"
                        />
                      </div>
                    );
                  })}
                </div>

                {categoryMastery < 100 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <i className="fas fa-lightbulb text-blue-600"></i>
                      <span className="text-sm font-medium text-blue-900">Next Steps</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      {categoryMastery < 70 
                        ? "Focus on foundational concepts and take more quiz assessments to build your knowledge."
                        : categoryMastery < 85
                        ? "You're making good progress! Take targeted quizzes in lower-scoring domains."
                        : "You're almost ready! Focus on perfecting the remaining weak areas."
                      }
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">About Mastery Scores</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Quiz Mode:</strong> Contributes to your mastery meter</li>
              <li>• <strong>Study Mode:</strong> Practice without affecting scores</li>
              <li>• <strong>Goal:</strong> Reach 85%+ in all domains for certification readiness</li>
              <li>• <strong>Updates:</strong> Scores improve with each quiz assessment</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}