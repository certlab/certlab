import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientStorage } from "@/lib/client-storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Edit, Trash2, Users, FileText, FolderOpen, Building, Home, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Tenant {
  id: number;
  name: string;
  domain?: string;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: string;
}

interface Category {
  id: number;
  tenantId: number;
  name: string;
  description?: string;
  icon?: string;
}

interface Subcategory {
  id: number;
  tenantId: number;
  categoryId: number;
  name: string;
  description?: string;
}

interface Question {
  id: number;
  tenantId: number;
  categoryId: number;
  subcategoryId: number;
  text: string;
  options: any[];
  correctAnswer: number;
  explanation?: string;
  difficultyLevel: number;
  tags?: string[];
}

interface User {
  id: number;
  tenantId: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  isAdmin?: boolean;
  lastLogin?: string;
}

interface TenantStats {
  categories: number;
  questions: number;
  users: number;
  subcategories: number;
}

// Question Form Component
function QuestionForm({ 
  categories, 
  tenantId, 
  onSuccess, 
  onError 
}: {
  categories: Category[];
  tenantId: number | null;
  onSuccess: () => void;
  onError: () => void;
}) {
  const createQuestionMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!tenantId) throw new Error("No tenant selected");
      // Validate correctAnswer is a valid 1-based index (1-4)
      const correctAnswer = data.correctAnswer;
      if (typeof correctAnswer !== 'number' || correctAnswer < 1 || correctAnswer > 4) {
        throw new Error("Invalid correct answer: must be between 1 and 4");
      }
      return await clientStorage.createQuestion({
        tenantId,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        text: data.text,
        options: data.options.map((text: string, index: number) => ({ id: index, text })),
        correctAnswer: correctAnswer - 1, // Convert 1-based to 0-based
        explanation: data.explanation,
        difficultyLevel: data.difficultyLevel,
        tags: data.tags,
      });
    },
    onSuccess,
    onError,
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const options = [
      formData.get("option1") as string,
      formData.get("option2") as string,
      formData.get("option3") as string,
      formData.get("option4") as string,
    ].filter(Boolean);

    const data = {
      text: formData.get("text") as string,
      categoryId: parseInt(formData.get("categoryId") as string),
      subcategoryId: parseInt(formData.get("subcategoryId") as string) || null,
      options,
      correctAnswer: parseInt(formData.get("correctAnswer") as string),
      explanation: formData.get("explanation") as string,
      difficultyLevel: parseInt(formData.get("difficultyLevel") as string),
      tags: (formData.get("tags") as string)?.split(",").map(t => t.trim()).filter(Boolean) || [],
    };

    createQuestionMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="text">Question Text</Label>
        <Textarea id="text" name="text" placeholder="Enter the question..." required rows={3} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <select id="categoryId" name="categoryId" className="w-full border rounded px-3 py-2" required>
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="difficultyLevel">Difficulty Level</Label>
          <select id="difficultyLevel" name="difficultyLevel" className="w-full border rounded px-3 py-2" required>
            <option value="1">Level 1 (Basic)</option>
            <option value="2">Level 2 (Intermediate)</option>
            <option value="3">Level 3 (Advanced)</option>
            <option value="4">Level 4 (Expert)</option>
            <option value="5">Level 5 (Master)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Answer Options</Label>
        {[1, 2, 3, 4].map((num) => (
          <div key={num}>
            <Input name={`option${num}`} placeholder={`Option ${num}`} required />
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="correctAnswer">Correct Answer (1-4)</Label>
        <select id="correctAnswer" name="correctAnswer" className="w-full border rounded px-3 py-2" required>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
          <option value="3">Option 3</option>
          <option value="4">Option 4</option>
        </select>
      </div>

      <div>
        <Label htmlFor="explanation">Explanation</Label>
        <Textarea id="explanation" name="explanation" placeholder="Explain why this is the correct answer..." rows={2} />
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input id="tags" name="tags" placeholder="security, encryption, access control" />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={createQuestionMutation.isPending}>
          {createQuestionMutation.isPending ? "Creating..." : "Create Question"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// User Management Component
function UserManagement({ selectedTenant }: { selectedTenant: number | null }) {
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/tenants", selectedTenant, "users"],
    enabled: !!selectedTenant,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>{users.length} users belonging to this tenant</CardDescription>
          </div>
          <Button>
            <PlusCircle className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email || 'No email'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {user.isAdmin ? 'Admin' : 'User'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users found for this tenant</p>
            <p className="text-sm">Add users to get started with tenant management</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Admin Navigation Breadcrumb
function AdminBreadcrumb() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="flex items-center space-x-2 mb-6 p-4 bg-muted/50 rounded-lg border">
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setLocation("/app")}
        className="text-muted-foreground hover:text-primary"
      >
        <Home className="w-4 h-4 mr-1" />
        Learning App
      </Button>
      <span className="text-muted-foreground">/</span>
      <Badge variant="secondary" className="font-medium">
        <Settings className="w-3 h-3 mr-1" />
        Admin Dashboard
      </Badge>
    </div>
  );
}

export default function AdminDashboard() {
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [newTenantDialog, setNewTenantDialog] = useState(false);
  const [editTenantDialog, setEditTenantDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newSubcategoryDialog, setNewSubcategoryDialog] = useState(false);
  const [newQuestionDialog, setNewQuestionDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tenants
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  // Get the currently selected tenant data
  const currentTenant = tenants.find(t => t.id === selectedTenant);

  // Fetch tenant statistics if tenant is selected
  const { data: tenantStats } = useQuery<TenantStats>({
    queryKey: ["/api/admin/tenants", selectedTenant, "stats"],
    enabled: !!selectedTenant,
  });

  // Fetch tenant categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/admin/tenants", selectedTenant, "categories"],
    enabled: !!selectedTenant,
  });

  // Fetch tenant questions (paginated)
  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ["/api/admin/tenants", selectedTenant, "questions"],
    enabled: !!selectedTenant,
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: { name: string; domain?: string }) => {
      return await clientStorage.createTenant({
        name: data.name,
        domain: data.domain || null,
        settings: {},
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setNewTenantDialog(false);
      toast({ title: "Tenant created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create tenant", variant: "destructive" });
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; icon?: string }) => {
      if (!selectedTenant) throw new Error("No tenant selected");
      return await clientStorage.createCategory({
        tenantId: selectedTenant,
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", selectedTenant, "categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", selectedTenant, "stats"] });
      setNewCategoryDialog(false);
      toast({ title: "Category created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async ({ tenantId, updates }: { tenantId: number; updates: Partial<Tenant> }) => {
      return await clientStorage.updateTenant(tenantId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setEditTenantDialog(false);
      toast({ title: "Tenant updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update tenant", variant: "destructive" });
    },
  });

  // Delete tenant mutation - Note: Only deactivates the tenant, doesn't delete data
  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: number) => {
      // We deactivate instead of deleting to preserve data integrity
      return await clientStorage.updateTenant(tenantId, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setSelectedTenant(null);
      toast({ title: "Tenant deactivated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to deactivate tenant", variant: "destructive" });
    },
  });

  const handleCreateTenant = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      name: formData.get("name") as string,
      domain: formData.get("domain") as string || undefined,
    };
    createTenantMutation.mutate(data);
  };

  const handleEditTenant = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTenant) return;
    
    const formData = new FormData(event.currentTarget);
    const updates = {
      name: formData.get("name") as string,
      domain: formData.get("domain") as string || null,
      isActive: editIsActive,
    };
    updateTenantMutation.mutate({ tenantId: editingTenant.id, updates });
  };

  const handleCreateCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      icon: formData.get("icon") as string || undefined,
    };
    createCategoryMutation.mutate(data);
  };

  if (tenantsLoading) {
    return <div className="flex items-center justify-center h-64">Loading admin dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <AdminBreadcrumb />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage tenants, certifications, and questions</p>
        </div>

        <Dialog open={newTenantDialog} onOpenChange={setNewTenantDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>Add a new organization to the system</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTenant}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Tenant Name</Label>
                  <Input id="name" name="name" placeholder="Organization Name" required />
                </div>
                <div>
                  <Label htmlFor="domain">Domain (optional)</Label>
                  <Input id="domain" name="domain" placeholder="organization.com" />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setNewTenantDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTenantMutation.isPending}>
                  Create Tenant
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Tenant Dialog */}
        <Dialog open={editTenantDialog} onOpenChange={setEditTenantDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tenant</DialogTitle>
              <DialogDescription>Update tenant settings and information</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditTenant}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Tenant Name</Label>
                  <Input 
                    id="edit-name" 
                    name="name" 
                    placeholder="Organization Name" 
                    defaultValue={editingTenant?.name || ''} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-domain">Domain (optional)</Label>
                  <Input 
                    id="edit-domain" 
                    name="domain" 
                    placeholder="organization.com" 
                    defaultValue={editingTenant?.domain || ''} 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-isActive" 
                    checked={editIsActive}
                    onCheckedChange={(checked) => setEditIsActive(checked === true)}
                  />
                  <Label htmlFor="edit-isActive">Active</Label>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditTenantDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTenantMutation.isPending}>
                  {updateTenantMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tenants List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Tenants
            </CardTitle>
            <CardDescription>{tenants.length} organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenants.map((tenant: Tenant) => (
                <div
                  key={tenant.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTenant === tenant.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedTenant(tenant.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      {tenant.domain && (
                        <div className="text-sm text-muted-foreground">{tenant.domain}</div>
                      )}
                    </div>
                    <Badge variant={tenant.isActive ? "default" : "secondary"}>
                      {tenant.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tenant Details */}
        <div className="lg:col-span-3">
          {selectedTenant ? (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <FolderOpen className="w-8 h-8 text-blue-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold">{tenantStats?.categories || 0}</div>
                          <div className="text-sm text-muted-foreground">Categories</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <FileText className="w-8 h-8 text-green-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold">{tenantStats?.questions || 0}</div>
                          <div className="text-sm text-muted-foreground">Questions</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Users className="w-8 h-8 text-purple-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold">{tenantStats?.users || 0}</div>
                          <div className="text-sm text-muted-foreground">Users</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <FolderOpen className="w-8 h-8 text-orange-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold">{tenantStats?.subcategories || 0}</div>
                          <div className="text-sm text-muted-foreground">Subcategories</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="categories">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>Certification categories for this tenant</CardDescription>
                      </div>
                      <Dialog open={newCategoryDialog} onOpenChange={setNewCategoryDialog}>
                        <DialogTrigger asChild>
                          <Button>
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Add Category
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Category</DialogTitle>
                            <DialogDescription>Add a new certification category</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleCreateCategory}>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="categoryName">Category Name</Label>
                                <Input id="categoryName" name="name" placeholder="CISSP" required />
                              </div>
                              <div>
                                <Label htmlFor="categoryDescription">Description</Label>
                                <Input id="categoryDescription" name="description" placeholder="Certified Information Systems Security Professional" />
                              </div>
                              <div>
                                <Label htmlFor="categoryIcon">Icon</Label>
                                <Input id="categoryIcon" name="icon" placeholder="fas fa-shield-alt" />
                              </div>
                            </div>
                            <DialogFooter className="mt-6">
                              <Button type="button" variant="outline" onClick={() => setNewCategoryDialog(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={createCategoryMutation.isPending}>
                                Create Category
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Icon</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((category: Category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.description}</TableCell>
                            <TableCell>{category.icon}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="questions">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Questions</CardTitle>
                        <CardDescription>
                          {questions.length} certification questions for this tenant
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Dialog open={newQuestionDialog} onOpenChange={setNewQuestionDialog}>
                          <DialogTrigger asChild>
                            <Button>
                              <PlusCircle className="w-4 h-4 mr-2" />
                              Add Question
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Create New Question</DialogTitle>
                              <DialogDescription>Add a new certification question</DialogDescription>
                            </DialogHeader>
                            <QuestionForm 
                              categories={categories}
                              tenantId={selectedTenant}
                              onSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", selectedTenant, "questions"] });
                                setNewQuestionDialog(false);
                                toast({ title: "Question created successfully" });
                              }}
                              onError={() => {
                                toast({ title: "Failed to create question", variant: "destructive" });
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline">
                          <FileText className="w-4 h-4 mr-2" />
                          Import CSV
                        </Button>
                        <Button variant="outline">
                          <FileText className="w-4 h-4 mr-2" />
                          Export Data
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4 mb-4">
                      <Input 
                        placeholder="Search questions..." 
                        className="max-w-sm"
                      />
                      <select className="border rounded px-3 py-2">
                        <option value="">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <select className="border rounded px-3 py-2">
                        <option value="">All Difficulties</option>
                        <option value="1">Level 1</option>
                        <option value="2">Level 2</option>
                        <option value="3">Level 3</option>
                        <option value="4">Level 4</option>
                        <option value="5">Level 5</option>
                      </select>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Question</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Subcategory</TableHead>
                          <TableHead>Difficulty</TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {questions.slice(0, 20).map((question: Question) => {
                          const category = categories.find(c => c.id === question.categoryId);
                          return (
                            <TableRow key={question.id}>
                              <TableCell className="max-w-sm">
                                <div className="truncate" title={question.text}>
                                  {question.text}
                                </div>
                              </TableCell>
                              <TableCell>{category?.name || 'Unknown'}</TableCell>
                              <TableCell>{question.subcategoryId}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={question.difficultyLevel >= 4 ? "destructive" : 
                                    question.difficultyLevel >= 3 ? "default" : "secondary"}
                                >
                                  Level {question.difficultyLevel}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {question.tags?.slice(0, 2).map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {question.tags && question.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{question.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-1">
                                  <Button variant="outline" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {questions.length > 20 && (
                      <div className="mt-4 text-center">
                        <Button variant="outline">
                          Load More Questions ({questions.length - 20} remaining)
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <UserManagement selectedTenant={selectedTenant} />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                {/* Tenant Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tenant Information</CardTitle>
                    <CardDescription>Basic information about this tenant</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Tenant Name</Label>
                          <p className="font-medium">{currentTenant?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Domain</Label>
                          <p className="font-medium">{currentTenant?.domain || 'Not set'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Status</Label>
                          <Badge variant={currentTenant?.isActive ? "default" : "secondary"}>
                            {currentTenant?.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Created</Label>
                          <p className="font-medium">
                            {currentTenant?.createdAt ? new Date(currentTenant.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (currentTenant) {
                              setEditingTenant(currentTenant);
                              setEditIsActive(currentTenant.isActive);
                              setEditTenantDialog(true);
                            }
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Tenant
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tenant Settings Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tenant Settings</CardTitle>
                    <CardDescription>Configure tenant-specific options</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Toggle Active Status */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">Active Status</div>
                          <div className="text-sm text-muted-foreground">
                            {currentTenant?.isActive 
                              ? "This tenant is currently active and accessible to users"
                              : "This tenant is inactive and not accessible to users"}
                          </div>
                        </div>
                        <Button
                          variant={currentTenant?.isActive ? "outline" : "default"}
                          onClick={() => {
                            if (selectedTenant) {
                              updateTenantMutation.mutate({
                                tenantId: selectedTenant,
                                updates: { isActive: !currentTenant?.isActive }
                              });
                            }
                          }}
                          disabled={updateTenantMutation.isPending}
                        >
                          {currentTenant?.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>

                      {/* Danger Zone */}
                      <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                        <div>
                          <div className="font-medium text-destructive">Deactivate Tenant</div>
                          <div className="text-sm text-muted-foreground">
                            Deactivate this tenant. Users will no longer be able to access it.
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (selectedTenant && confirm("Are you sure you want to deactivate this tenant? Users will no longer be able to access it.")) {
                              deleteTenantMutation.mutate(selectedTenant);
                            }
                          }}
                          disabled={!selectedTenant || !currentTenant?.isActive || deleteTenantMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deactivate Tenant
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="text-center text-muted-foreground">
                  Select a tenant from the left to view details
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}