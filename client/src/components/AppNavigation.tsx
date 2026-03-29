import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-provider';
import { ChevronRight } from 'lucide-react';
import {
  Home,
  BookOpen,
  Trophy,
  Target,
  BarChart3,
  Edit,
  List,
  FileText,
  Database,
  Sparkles,
  Timer,
  ShoppingCart,
  Folder,
  Award,
  Wallet,
  PlusCircle,
  Languages,
  Heart,
  Settings,
  Building,
  UserCog,
  Accessibility,
  Flame,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useBranding } from '@/lib/branding-provider';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  adminOnly?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items?: NavItem[];
  href?: string; // For single-level items
  badge?: string;
  adminOnly?: boolean;
  defaultOpen?: boolean;
}

export function AppNavigation() {
  const location = useLocation();
  const { user } = useAuth();
  const { branding } = useBranding();
  const { state } = useSidebar();
  const isAdmin = user?.role === 'admin';

  // Navigation structure with 2-level hierarchy
  const navigationGroups: NavGroup[] = [
    // Dashboard (single-level)
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      href: '/app',
    },
    // Learn group
    {
      id: 'learn',
      label: 'Learn',
      icon: BookOpen,
      defaultOpen: true,
      items: [
        {
          id: 'daily-challenges',
          label: 'Daily Challenges',
          icon: Target,
          href: '/app/daily-challenges',
          badge: 'NEW',
        },
        {
          id: 'quiz-builder',
          label: 'Quiz Builder',
          icon: Edit,
          href: '/app/quiz-builder',
        },
        {
          id: 'my-quizzes',
          label: 'My Quizzes',
          icon: List,
          href: '/app/my-quizzes',
        },
        {
          id: 'my-questions',
          label: 'My Questions',
          icon: FileText,
          href: '/app/my-questions',
        },
        {
          id: 'practice-tests',
          label: 'Practice Tests',
          icon: FileText,
          href: '/app/practice-tests',
        },
        {
          id: 'question-bank',
          label: 'Question Bank',
          icon: Database,
          href: '/app/question-bank',
        },
      ],
    },
    // Study Resources group
    {
      id: 'study-resources',
      label: 'Study Resources',
      icon: Sparkles,
      items: [
        {
          id: 'study-notes',
          label: 'Study Notes',
          icon: BookOpen,
          href: '/app/study-notes',
        },
        {
          id: 'enhanced-notes',
          label: 'Enhanced Notes',
          icon: Sparkles,
          href: '/app/enhanced-study-notes',
        },
        {
          id: 'study-timer',
          label: 'Study Timer',
          icon: Timer,
          href: '/app/study-timer',
        },
        {
          id: 'marketplace',
          label: 'Marketplace',
          icon: ShoppingCart,
          href: '/app/marketplace',
        },
        {
          id: 'my-materials',
          label: 'My Materials',
          icon: Folder,
          href: '/app/my-materials',
        },
      ],
    },
    // Community group
    {
      id: 'community',
      label: 'Community',
      icon: Trophy,
      items: [
        {
          id: 'achievements',
          label: 'Achievements',
          icon: Award,
          href: '/app/achievements',
        },
        {
          id: 'leaderboard',
          label: 'Leaderboard',
          icon: Flame,
          href: '/app/leaderboard',
        },
        {
          id: 'certificates',
          label: 'Certificates',
          icon: Award,
          href: '/app/certificates',
        },
      ],
    },
    // Progress & Analytics group
    {
      id: 'progress-analytics',
      label: 'Progress & Analytics',
      icon: BarChart3,
      items: [
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          href: '/app/analytics',
        },
        {
          id: 'performance',
          label: 'Performance',
          icon: BarChart3,
          href: '/app/performance',
        },
        {
          id: 'wallet',
          label: 'Wallet',
          icon: Wallet,
          href: '/app/wallet',
        },
      ],
    },
    // Tools group
    {
      id: 'tools',
      label: 'Tools',
      icon: Settings,
      items: [
        {
          id: 'data-import',
          label: 'Import Sample Data',
          icon: Database,
          href: '/app/data-import',
        },
        {
          id: 'personal-import',
          label: 'Import Personal Questions',
          icon: PlusCircle,
          href: '/app/personal-import',
        },
        {
          id: 'i18n-demo',
          label: 'I18n Demo',
          icon: Languages,
          href: '/app/i18n-demo',
        },
        {
          id: 'credits',
          label: 'Credits',
          icon: Heart,
          href: '/app/credits',
        },
      ],
    },
    // Admin group (conditional)
    ...(isAdmin
      ? [
          {
            id: 'admin',
            label: 'Administration',
            icon: Settings,
            adminOnly: true,
            items: [
              {
                id: 'admin-dashboard',
                label: 'Admin Dashboard',
                icon: Building,
                href: '/admin',
                adminOnly: true,
              },
              {
                id: 'user-roles',
                label: 'User Roles',
                icon: UserCog,
                href: '/app/user-roles',
                adminOnly: true,
              },
              {
                id: 'reporting',
                label: 'Reporting',
                icon: BarChart3,
                href: '/app/reporting',
                adminOnly: true,
              },
              {
                id: 'accessibility',
                label: 'Accessibility',
                icon: Accessibility,
                href: '/app/accessibility',
                adminOnly: true,
              },
              {
                id: 'ui-structure',
                label: 'UI Structure',
                icon: Database,
                href: '/app/ui-structure',
                adminOnly: true,
              },
            ],
          } as NavGroup,
        ]
      : []),
  ];

  const isActivePath = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          {state === 'expanded' ? (
            <>
              <div className="flex items-center gap-2">
                <img
                  src={branding?.logoUrl || '/logo.png'}
                  alt={branding?.organizationName || 'CertLab'}
                  className="h-8 w-8 object-contain"
                />
                <span className="font-semibold text-lg">
                  {branding?.organizationName || 'CertLab'}
                </span>
              </div>
            </>
          ) : (
            <img
              src={branding?.logoUrl || '/logo.png'}
              alt={branding?.organizationName || 'CertLab'}
              className="h-8 w-8 object-contain"
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigationGroups.map((group) => {
              // Single-level navigation item
              if (group.href) {
                const Icon = group.icon;
                return (
                  <SidebarMenuItem key={group.id}>
                    <SidebarMenuButton asChild isActive={isActivePath(group.href)}>
                      <Link to={group.href}>
                        <Icon className="h-4 w-4" />
                        <span>{group.label}</span>
                        {group.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {group.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              // Group with sub-items
              if (group.items) {
                const Icon = group.icon;
                const hasActiveItem = group.items.some((item) => isActivePath(item.href));

                return (
                  <Collapsible
                    key={group.id}
                    asChild
                    defaultOpen={group.defaultOpen || hasActiveItem}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={group.label}>
                          <Icon className="h-4 w-4" />
                          <span>{group.label}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {group.items.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                              <SidebarMenuSubItem key={item.id}>
                                <SidebarMenuSubButton asChild isActive={isActivePath(item.href)}>
                                  <Link to={item.href}>
                                    <ItemIcon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                    {item.badge && (
                                      <Badge variant="secondary" className="ml-auto text-xs">
                                        {item.badge}
                                      </Badge>
                                    )}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              }

              return null;
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Admin separator */}
        {isAdmin && <SidebarSeparator className="my-2" />}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2 text-xs text-muted-foreground">
          {state === 'expanded' ? (
            <div className="space-y-1">
              <div>Press Cmd+B to toggle sidebar</div>
            </div>
          ) : (
            <div className="text-center">⌘B</div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
