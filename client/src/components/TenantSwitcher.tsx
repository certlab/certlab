import { useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientStorage } from '@/lib/client-storage';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, ChevronDown } from 'lucide-react';
import type { Tenant } from '@shared/schema';

export default function TenantSwitcher() {
  const { user, switchTenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSwitching, setIsSwitching] = useState(false);

  // Fetch all tenants
  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: queryKeys.tenants.all(),
    queryFn: async () => {
      return await clientStorage.getTenants();
    },
  });

  // Get current tenant
  const { data: currentTenant } = useQuery<Tenant | undefined>({
    queryKey: queryKeys.tenants.detail(user?.tenantId),
    queryFn: async () => {
      if (!user?.tenantId) return undefined;
      return await clientStorage.getTenant(user.tenantId);
    },
    enabled: !!user?.tenantId,
  });

  const handleSwitchTenant = async (tenantId: number) => {
    if (tenantId === user?.tenantId || isSwitching) return;

    // Validate that the target tenant is active
    const targetTenant = tenants.find(t => t.id === tenantId);
    if (!targetTenant?.isActive) {
      toast({
        title: 'Cannot switch to inactive tenant',
        description: 'This tenant is not currently active',
        variant: 'destructive',
      });
      return;
    }

    setIsSwitching(true);
    try {
      await switchTenant(tenantId);
      
      // Invalidate all queries to refetch with new tenant context
      queryClient.invalidateQueries();
      
      toast({
        title: 'Tenant switched',
        description: `You are now viewing ${tenants.find(t => t.id === tenantId)?.name || 'the new tenant'}`,
      });
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      toast({
        title: 'Failed to switch tenant',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSwitching(false);
    }
  };

  if (!user || isLoading) return null;

  // Only show if there are multiple tenants
  if (tenants.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 border-border/50 hover:bg-accent/10"
          disabled={isSwitching}
        >
          <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
          <span className="text-sm font-medium max-w-[120px] truncate">
            {currentTenant?.name || 'Select Tenant'}
          </span>
          <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase">
          Switch Environment
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants
          .filter(tenant => tenant.isActive)
          .map((tenant) => (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => handleSwitchTenant(tenant.id)}
              className="cursor-pointer py-2.5 px-3"
              disabled={isSwitching}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{tenant.name}</span>
                    {tenant.id === user.tenantId && (
                      <Badge variant="secondary" className="text-xs w-fit mt-0.5">
                        Current
                      </Badge>
                    )}
                  </div>
                </div>
                {tenant.id === user.tenantId && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
