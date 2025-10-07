import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Search, Calendar, MessageSquare, Trophy, BookOpen } from "lucide-react";
import type { Category } from "@shared/schema";

interface StudyGroup {
  id: number;
  name: string;
  description: string;
  categoryIds: number[];
  memberCount: number;
  maxMembers: number;
  isPublic: boolean;
  createdBy: number;
  createdAt: string;
  recentActivity: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  tags: string[];
  weeklyGoal: number;
  currentStreak: number;
}

export default function StudyGroups() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Mock study groups data
  const allStudyGroups: StudyGroup[] = [
    {
      id: 1,
      name: "CISSP Study Squad",
      description: "Preparing for CISSP certification together. We focus on practice questions, sharing study materials, and weekly group discussions.",
      categoryIds: [1],
      memberCount: 8,
      maxMembers: 12,
      isPublic: true,
      createdBy: 1,
      createdAt: "2024-11-15",
      recentActivity: "2 hours ago",
      level: "Advanced",
      tags: ["CISSP", "Security", "Management"],
      weeklyGoal: 5,
      currentStreak: 3
    },
    {
      id: 2,
      name: "Cloud+ Beginners",
      description: "Starting our cloud certification journey from scratch. Perfect for newcomers to cloud computing.",
      categoryIds: [6],
      memberCount: 15,
      maxMembers: 20,
      isPublic: true,
      createdBy: 2,
      createdAt: "2024-11-20",
      recentActivity: "1 day ago",
      level: "Beginner",
      tags: ["Cloud+", "CompTIA", "Beginners"],
      weeklyGoal: 3,
      currentStreak: 7
    },
    {
      id: 3,
      name: "Security Fundamentals",
      description: "Building strong cybersecurity foundations with a focus on practical application and real-world scenarios.",
      categoryIds: [1, 2],
      memberCount: 12,
      maxMembers: 15,
      isPublic: true,
      createdBy: 3,
      createdAt: "2024-11-10",
      recentActivity: "3 hours ago",
      level: "Intermediate",
      tags: ["Security", "Fundamentals", "Practical"],
      weeklyGoal: 4,
      currentStreak: 2
    },
    {
      id: 4,
      name: "CISM Domain Masters",
      description: "Deep dive into CISM domains with experienced professionals. Advanced study techniques and exam strategies.",
      categoryIds: [4],
      memberCount: 6,
      maxMembers: 10,
      isPublic: true,
      createdBy: 4,
      createdAt: "2024-11-25",
      recentActivity: "5 hours ago",
      level: "Advanced",
      tags: ["CISM", "Management", "Advanced"],
      weeklyGoal: 6,
      currentStreak: 1
    },
    {
      id: 5,
      name: "Weekend Warriors",
      description: "For busy professionals who can only study on weekends. Intensive weekend study sessions.",
      categoryIds: [1, 3, 4],
      memberCount: 9,
      maxMembers: 12,
      isPublic: true,
      createdBy: 5,
      createdAt: "2024-11-18",
      recentActivity: "1 day ago",
      level: "Intermediate",
      tags: ["Weekend", "Professionals", "Intensive"],
      weeklyGoal: 2,
      currentStreak: 4
    }
  ];

  // My study groups (mock data)
  const myStudyGroups = allStudyGroups.filter(group => 
    group.createdBy === currentUser?.id || [1, 3].includes(group.id)
  );

  // Filter study groups
  const filteredGroups = allStudyGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || 
                           group.categoryIds.includes(parseInt(selectedCategory));
    
    const matchesLevel = selectedLevel === "all" || group.level === selectedLevel;
    
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "Intermediate": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "Advanced": return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  const getCategoryNames = (categoryIds: number[]) => {
    return categoryIds
      .map(id => categories.find(cat => cat.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const handleJoinGroup = (groupId: number) => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to join study groups.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Joined Study Group",
      description: "You've successfully joined the study group!",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Study Groups</h1>
          <p className="text-muted-foreground">
            Connect with other learners, share knowledge, and achieve certification goals together.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList>
            <TabsTrigger value="discover">Discover Groups</TabsTrigger>
            <TabsTrigger value="my-groups">My Groups ({myStudyGroups.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getCategoryNames(group.categoryIds)}
                        </p>
                      </div>
                      <Badge className={getLevelColor(group.level)}>
                        {group.level}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {group.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {group.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{group.memberCount}/{group.maxMembers}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Members</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Trophy className="h-4 w-4" />
                          <span className="font-medium">{group.currentStreak}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Day Streak</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-medium">{group.weeklyGoal}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Weekly Goal</div>
                      </div>
                    </div>

                    {/* Members Preview */}
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(group.memberCount, 4))].map((_, i) => (
                          <Avatar key={i} className="h-8 w-8 border-2 border-background">
                            <AvatarFallback className="text-xs">
                              {String.fromCharCode(65 + i)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {group.memberCount > 4 && (
                          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                            +{group.memberCount - 4}
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        size="sm"
                        onClick={() => handleJoinGroup(group.id)}
                        disabled={group.memberCount >= group.maxMembers}
                      >
                        {group.memberCount >= group.maxMembers ? "Full" : "Join Group"}
                      </Button>
                    </div>

                    {/* Activity */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <MessageSquare className="h-3 w-3" />
                      <span>Last activity: {group.recentActivity}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredGroups.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No study groups found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or create a new study group.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-groups" className="space-y-4">
            {myStudyGroups.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {myStudyGroups.map((group) => (
                  <Card key={group.id} className="border-primary/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {group.name}
                            {group.createdBy === currentUser?.id && (
                              <Badge variant="secondary" className="text-xs">Owner</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getCategoryNames(group.categoryIds)}
                          </p>
                        </div>
                        <Badge className={getLevelColor(group.level)}>
                          {group.level}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {group.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="font-medium">{group.memberCount}</div>
                          <div className="text-xs text-muted-foreground">Members</div>
                        </div>
                        <div>
                          <div className="font-medium">{group.currentStreak} days</div>
                          <div className="text-xs text-muted-foreground">Group Streak</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Open Chat
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No study groups yet</h3>
                <p className="text-muted-foreground mb-4">
                  Join existing groups or create your own to start studying with others.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline">Browse Groups</Button>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}