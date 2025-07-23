import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Calendar, BookOpen, Trophy } from "lucide-react";

interface StudyGroup {
  id: number;
  name: string;
  description: string;
  categoryIds: number[];
  memberCount: number;
  maxMembers: number;
  isPublic: boolean;
  createdBy: number;
  recentActivity: string;
  level: "Beginner" | "Intermediate" | "Advanced";
}

export default function StudyGroupCard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Mock data for study groups - in real implementation, this would come from API
  const studyGroups: StudyGroup[] = [
    {
      id: 1,
      name: "CISSP Study Squad",
      description: "Preparing for CISSP certification together",
      categoryIds: [1],
      memberCount: 8,
      maxMembers: 12,
      isPublic: true,
      createdBy: 1,
      recentActivity: "2 hours ago",
      level: "Advanced"
    },
    {
      id: 2,
      name: "Cloud+ Beginners",
      description: "Starting our cloud certification journey",
      categoryIds: [6],
      memberCount: 5,
      maxMembers: 10,
      isPublic: true,
      createdBy: 2,
      recentActivity: "1 day ago",
      level: "Beginner"
    },
    {
      id: 3,
      name: "Security Fundamentals",
      description: "Building strong cybersecurity foundations",
      categoryIds: [1, 2],
      memberCount: 12,
      maxMembers: 15,
      isPublic: true,
      createdBy: 3,
      recentActivity: "3 hours ago",
      level: "Intermediate"
    }
  ];

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      // Mock implementation - would be real API call
      return new Promise(resolve => {
        setTimeout(() => resolve({ id: Date.now(), ...groupData }), 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: "Study Group Created",
        description: "Your study group has been created successfully!",
      });
      setIsCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      queryClient.invalidateQueries({ queryKey: ['/api/study-groups'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create study group. Please try again.",
        variant: "destructive",
      });
    }
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      // Mock implementation - would be real API call
      return new Promise(resolve => {
        setTimeout(() => resolve({ success: true }), 500);
      });
    },
    onSuccess: () => {
      toast({
        title: "Joined Study Group",
        description: "You've successfully joined the study group!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/study-groups'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join study group. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreateGroup = () => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to create a study group.",
        variant: "destructive",
      });
      return;
    }

    if (!newGroupName.trim()) {
      toast({
        title: "Group Name Required",
        description: "Please enter a name for your study group.",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate({
      name: newGroupName,
      description: newGroupDescription,
      categoryIds: [1], // Default to first category
      maxMembers: 10,
      isPublic: true,
      createdBy: currentUser.id,
      level: "Intermediate"
    });
  };

  const handleJoinGroup = (groupId: number) => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to join a study group.",
        variant: "destructive",
      });
      return;
    }

    joinGroupMutation.mutate(groupId);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "Intermediate": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "Advanced": return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  return (
    <Card className="h-full relative z-10 bg-card overflow-hidden force-stacking">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Study Groups
          </CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Study Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Group Name</label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Describe your study group..."
                  />
                </div>
                <Button 
                  onClick={handleCreateGroup} 
                  disabled={createGroupMutation.isPending}
                  className="w-full"
                >
                  {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {studyGroups.slice(0, 3).map((group) => (
          <Card key={group.id} className="border-muted">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Group Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{group.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {group.description}
                    </p>
                  </div>
                  <Badge className={`text-xs ${getLevelColor(group.level)}`}>
                    {group.level}
                  </Badge>
                </div>

                {/* Group Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{group.memberCount}/{group.maxMembers}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{group.recentActivity}</span>
                    </div>
                  </div>
                </div>

                {/* Member Avatars */}
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(group.memberCount, 3))].map((_, i) => (
                      <Avatar key={i} className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs">
                          {String.fromCharCode(65 + i)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {group.memberCount > 3 && (
                      <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                        +{group.memberCount - 3}
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={() => handleJoinGroup(group.id)}
                    disabled={joinGroupMutation.isPending}
                  >
                    {joinGroupMutation.isPending ? "..." : "Join"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* View All Groups */}
        <Button variant="ghost" className="w-full text-sm" onClick={() => {
          import('wouter').then(({ useLocation }) => {
            window.location.href = '/study-groups';
          });
        }}>
          <BookOpen className="h-4 w-4 mr-2" />
          View All Study Groups
        </Button>

        {/* Study Group Benefits */}
        <div className="bg-muted/50 rounded-lg p-3">
          <h4 className="text-sm font-medium mb-2">Study Group Benefits</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Share study materials and tips</li>
            <li>• Take group challenges together</li>
            <li>• Get motivated by peer progress</li>
            <li>• Ask questions and get help</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}