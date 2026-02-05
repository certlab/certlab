import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storage } from '@/lib/storage-factory';
import { queryKeys } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Edit2, Search, Shield, UserCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@shared/schema';

type UserRole = 'user' | 'admin';

export default function UserRolesPage() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: queryKeys.admin.users.all(),
    queryFn: () => storage.getAllUsers(),
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      return await storage.updateUser(userId, { role });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
      setEditDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: 'Role updated successfully',
        description: `User role has been changed to ${variables.role}.`,
      });
    },
    onError: (error) => {
      console.error('Failed to update user role:', error);
      toast({
        title: 'Failed to update role',
        description: 'An error occurred while updating the user role. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Filter and search users
  const filteredUsers = useMemo(() => {
    let result = users;

    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter((user) => user.role === roleFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.firstName?.toLowerCase()?.includes(query) ||
          user.lastName?.toLowerCase()?.includes(query) ||
          user.id.toLowerCase().includes(query)
      );
    }

    return result;
  }, [users, roleFilter, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const adminUsers = users.filter((u) => u.role === 'admin').length;
    const regularUsers = users.filter((u) => u.role === 'user').length;

    return {
      total: totalUsers,
      admins: adminUsers,
      users: regularUsers,
    };
  }, [users]);

  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    // Ensure role is one of the valid UserRole values, default to 'user' if invalid
    const validRole = user.role === 'admin' || user.role === 'user' ? user.role : 'user';
    setNewRole(validRole);
    setEditDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (!selectedUser) return;
    updateRoleMutation.mutate({
      userId: selectedUser.id,
      role: newRole,
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' ? 'default' : 'secondary';
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">User Roles Management</h1>
              <p className="text-muted-foreground">
                Manage user roles and permissions across the platform
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administrators</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
              <p className="text-xs text-muted-foreground">Users with admin privileges</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
              <p className="text-xs text-muted-foreground">Standard user accounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  View and manage user roles. {filteredUsers.length} of {users.length} users shown
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-full sm:w-[200px]"
                  />
                </div>
                {/* Role Filter */}
                <Select
                  value={roleFilter}
                  onValueChange={(value: 'all' | 'admin' | 'user') => setRoleFilter(value)}
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Loading users...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Tenant ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : 'Unknown User'}
                            </div>
                            <div className="text-xs text-muted-foreground">{user.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role === 'admin' ? 'Administrator' : 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.tenantId}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(user)}
                            className="hover:bg-accent"
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit Role
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching your criteria</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.firstName} {selectedUser?.lastName} (
              {selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={(value: UserRole) => setNewRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex flex-col">
                      <span className="font-medium">User</span>
                      <span className="text-xs text-muted-foreground">
                        Standard user with limited privileges
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col">
                      <span className="font-medium">Administrator</span>
                      <span className="text-xs text-muted-foreground">
                        Full access to all features and settings
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRole !== selectedUser?.role && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Warning:</strong> Changing user roles will immediately affect their access
                  permissions. {newRole === 'admin' && 'Admin users have full system access.'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending || newRole === selectedUser?.role}
            >
              {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
