import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-provider';
import {
  Home,
  BookOpen,
  Settings,
  Shield,
  ShoppingBag,
  Wallet,
  User,
  Download,
  Box,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';

// Navigation items for the sidebar - CLAY OS style
const getNavigationItems = (isAdmin: boolean) => {
  const studentItems = [
    {
      section: 'STUDENT',
      items: [
        {
          title: 'Dashboard',
          icon: Home,
          url: '/app',
        },
        {
          title: 'Marketplace',
          icon: ShoppingBag,
          url: '/app/marketplace',
        },
        {
          title: 'My Courses',
          icon: BookOpen,
          url: '/app/practice-tests',
        },
        {
          title: 'Wallet',
          icon: Wallet,
          url: '/app/wallet',
        },
        {
          title: 'Profile',
          icon: User,
          url: '/app/profile',
        },
        {
          title: 'Settings',
          icon: Settings,
          url: '/app/profile', // Settings are in profile page
        },
        {
          title: 'Import',
          icon: Download,
          url: '/app/data-import',
        },
      ],
    },
  ];

  const adminItems = isAdmin
    ? [
        {
          section: 'ADMIN',
          items: [
            {
              title: 'Admin Panel',
              icon: Shield,
              url: '/admin',
            },
          ],
        },
      ]
    : [];

  return [...studentItems, ...adminItems];
};

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const navigationItems = getNavigationItems(isAdmin);

  const isPathActive = (path: string) => {
    if (path === '/app') {
      return location === '/app' || location === '/app/dashboard';
    }
    return location.startsWith(path);
  };

  return (
    <Sidebar className="bg-sidebar-background border-sidebar-border">
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-transparent text-sidebar-foreground">
            <Box className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-sidebar-foreground tracking-tight">
              CertLab
            </h2>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar-background">
        <ScrollArea className="flex-1">
          {navigationItems.map((section) => (
            <div key={section.section} className="mb-4">
              <div className="px-4 py-2 mb-1">
                <p className="text-[10px] font-semibold text-sidebar-foreground/50 tracking-widest uppercase">
                  {section.section}
                </p>
              </div>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => item.url && setLocation(item.url)}
                          isActive={item.url ? isPathActive(item.url) : false}
                          className={cn(
                            'rounded-lg mx-2 my-1 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-10',
                            item.url &&
                              isPathActive(item.url) &&
                              'bg-sidebar-primary text-sidebar-primary-foreground'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          ))}
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
