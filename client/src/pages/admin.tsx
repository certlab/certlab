import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Users, FileText, FolderOpen, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function AdminDashboard() {
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [newTenantDialog, setNewTenantDialog] = useState(false);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newSubcategoryDialog, setNewSubcategoryDialog] = useState(false);
  const [newQuestionDialog, setNewQuestionDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tenants
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/admin/tenants"],
  });

  // Fetch tenant statistics if tenant is selected
  const { data: tenantStats } = useQuery({
    queryKey: ["/api/admin/tenants", selectedTenant, "stats"],
    enabled: !!selectedTenant,
  });

  // Fetch tenant categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/admin/tenants", selectedTenant, "categories"],
    enabled: !!selectedTenant,
  });

  // Fetch tenant questions (paginated)
  const { data: questions = [] } = useQuery({
    queryKey: ["/api/admin/tenants", selectedTenant, "questions"],
    enabled: !!selectedTenant,
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: (data: { name: string; domain?: string }) =>
      apiRequest("/api/admin/tenants", {
        method: "POST",
        body: JSON.stringify(data),
      }),
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
    mutationFn: (data: { name: string; description?: string; icon?: string }) =>
      apiRequest(`/api/admin/tenants/${selectedTenant}/categories`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
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

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: (tenantId: number) =>
      apiRequest(`/api/admin/tenants/${tenantId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setSelectedTenant(null);
      toast({ title: "Tenant deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete tenant", variant: "destructive" });
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
                        <CardDescription>Certification questions for this tenant</CardDescription>
                      </div>
                      <Button>
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Question</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Difficulty</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {questions.slice(0, 10).map((question: Question) => (
                          <TableRow key={question.id}>
                            <TableCell className="max-w-md truncate">{question.text}</TableCell>
                            <TableCell>{question.categoryId}</TableCell>
                            <TableCell>
                              <Badge variant="outline">Level {question.difficultyLevel}</Badge>
                            </TableCell>
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

              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>Users belonging to this tenant</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      User management coming soon...
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Tenant Settings</CardTitle>
                    <CardDescription>Configure tenant-specific options</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">Delete Tenant</div>
                          <div className="text-sm text-muted-foreground">
                            Permanently delete this tenant and all associated data
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Are you sure? This action cannot be undone.")) {
                              deleteTenantMutation.mutate(selectedTenant);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Tenant
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