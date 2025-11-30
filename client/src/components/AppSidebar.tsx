import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-provider';
import {
  Home,
  BookOpen,
  Database,
  Settings,
  Shield,
  ChevronDown,
  Search,
  Target,
  GraduationCap,
  Coins,
} from 'lucide-react';
import { cn, getInitials, getUserDisplayName } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import TenantSwitcher from '@/components/TenantSwitcher';

// Navigation items for the sidebar
const getNavigationItems = (isAdmin: boolean) => [
  {
    title: 'Dashboard',
    icon: Home,
    url: '/app',
    isActive: true,
  },
  {
    title: 'Learning',
    icon: BookOpen,
    items: [
      { title: 'Practice Tests', url: '/app/practice-tests' },
      { title: 'Study Notes', url: '/app/study-notes' },
      { title: 'Challenges', url: '/app/challenges' },
      { title: 'Study Materials', url: '/app/marketplace' },
    ],
  },
  {
    title: 'Progress',
    icon: Target,
    items: [
      { title: 'Achievements', url: '/app/achievements' },
      { title: 'My Profile', url: '/app/profile' },
    ],
  },
  {
    title: 'Data',
    icon: Database,
    items: [
      { title: 'Question Bank', url: '/app/question-bank' },
      { title: 'Import Sample Data', url: '/app/data-import' },
    ],
  },
  ...(isAdmin
    ? [
        {
          title: 'Admin',
          icon: Shield,
          items: [
            { title: 'Admin Dashboard', url: '/admin' },
            { title: 'UI Structure', url: '/app/ui-structure' },
            { title: 'Accessibility', url: '/app/accessibility' },
          ],
        },
      ]
    : []),
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    Learning: true,
    Progress: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Get token balance
  const { data: tokenData } = useQuery<{ balance: number }>({
    queryKey: queryKeys.user.tokenBalance(currentUser?.id),
    enabled: !!currentUser?.id,
    staleTime: 30000, // 30 seconds to reduce unnecessary queries
    gcTime: 5 * 60 * 1000,
  });

  const navigationItems = getNavigationItems(isAdmin);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const isPathActive = (path: string) => {
    if (path === '/app') {
      return location === '/app' || location === '/app/dashboard';
    }
    return location.startsWith(path);
  };

  // Filter navigation items based on search
  const filteredItems = searchQuery
    ? navigationItems.filter((item) => {
        const matchesTitle = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubItems = item.items?.some((subItem) =>
          subItem.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return matchesTitle || matchesSubItems;
      })
    : navigationItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Cert Lab</h2>
            <p className="text-xs text-muted-foreground">Certification Training</p>
          </div>
        </div>

        {/* Tenant Switcher */}
        <div className="mt-3">
          <TenantSwitcher />
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-muted pl-9 pr-4 py-2"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="flex-1 px-3">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.items ? (
                      <>
                        <SidebarMenuButton
                          onClick={() => toggleExpanded(item.title)}
                          className={cn(
                            'w-full justify-between rounded-xl',
                            expandedItems[item.title] && 'bg-accent/50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform',
                              expandedItems[item.title] && 'rotate-180'
                            )}
                          />
                        </SidebarMenuButton>
                        {expandedItems[item.title] && (
                          <SidebarMenuSub>
                            {item.items
                              .filter((subItem) =>
                                searchQuery
                                  ? subItem.title.toLowerCase().includes(searchQuery.toLowerCase())
                                  : true
                              )
                              .map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    onClick={() => setLocation(subItem.url)}
                                    isActive={isPathActive(subItem.url)}
                                    className="cursor-pointer rounded-lg"
                                  >
                                    {subItem.title}
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                          </SidebarMenuSub>
                        )}
                      </>
                    ) : (
                      <SidebarMenuButton
                        onClick={() => item.url && setLocation(item.url)}
                        isActive={item.url ? isPathActive(item.url) : false}
                        className="rounded-xl"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        {/* Token Balance */}
        {tokenData && (
          <div
            className="flex items-center gap-2 rounded-xl bg-accent/50 px-3 py-2 mb-2 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setLocation('/app/dashboard')}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
                setLocation('/app/dashboard');
              } else if (e.key === 'Enter') {
                setLocation('/app/dashboard');
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${tokenData.balance} tokens available`}
          >
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{tokenData.balance}</span>
            <span className="text-xs text-muted-foreground">tokens</span>
          </div>
        )}

        {/* Settings */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setLocation('/app/profile')} className="rounded-xl">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User Profile */}
        {currentUser && (
          <div className="flex items-center justify-between rounded-xl px-3 py-2 mt-2 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xs">
                  {getInitials(currentUser.firstName, currentUser.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {getUserDisplayName(currentUser)}
                </span>
                <span className="text-xs text-muted-foreground">Student</span>
              </div>
            </div>
            {isAdmin && (
              <Badge variant="outline" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
