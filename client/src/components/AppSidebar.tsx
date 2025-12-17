import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-provider';
import { useTheme } from '@/lib/theme-provider';
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
  SidebarFooter,
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
  const { theme, setTheme } = useTheme();
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
      <SidebarHeader className="p-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-transparent text-sidebar-foreground">
            <Box className="size-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-sidebar-foreground tracking-wide">CertLab</h2>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar-background">
        <ScrollArea className="flex-1">
          {navigationItems.map((section) => (
            <div key={section.section} className="mb-6">
              <div className="px-4 mb-2">
                <p className="text-xs font-semibold text-sidebar-foreground/60 tracking-wider">
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
                            'rounded-lg mx-2 my-0.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
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

      <SidebarFooter className="border-t border-sidebar-border/50 p-4 bg-sidebar-background">
        {/* Theme Selector Dots */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              'w-5 h-5 rounded-full bg-[hsl(210,22%,35%)] border-2 transition-colors',
              theme === 'light'
                ? 'border-sidebar-foreground/80 ring-2 ring-sidebar-foreground/40'
                : 'border-sidebar-foreground/20 hover:border-sidebar-foreground/40'
            )}
            aria-label="Light theme"
            title="Light"
          />
          <button
            onClick={() => setTheme('dracula')}
            className={cn(
              'w-5 h-5 rounded-full bg-[hsl(265,89%,78%)] border-2 transition-colors',
              theme === 'dracula'
                ? 'border-sidebar-foreground/80 ring-2 ring-sidebar-foreground/40'
                : 'border-transparent hover:border-sidebar-foreground/40'
            )}
            aria-label="Dracula theme"
            title="Dracula"
          />
          <button
            onClick={() => setTheme('nord')}
            className={cn(
              'w-5 h-5 rounded-full bg-[hsl(213,32%,52%)] border-2 transition-colors',
              theme === 'nord'
                ? 'border-sidebar-foreground/80 ring-2 ring-sidebar-foreground/40'
                : 'border-transparent hover:border-sidebar-foreground/40'
            )}
            aria-label="Nord theme"
            title="Nord"
          />
          <button
            onClick={() => setTheme('catppuccin')}
            className={cn(
              'w-5 h-5 rounded-full bg-[hsl(217,92%,76%)] border-2 transition-colors',
              theme === 'catppuccin'
                ? 'border-sidebar-foreground/80 ring-2 ring-sidebar-foreground/40'
                : 'border-transparent hover:border-sidebar-foreground/40'
            )}
            aria-label="Catppuccin theme"
            title="Catppuccin"
          />
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              'w-5 h-5 rounded-full bg-[hsl(240,10%,8%)] border-2 transition-colors',
              theme === 'dark'
                ? 'border-sidebar-foreground/80 ring-2 ring-sidebar-foreground/40'
                : 'border-transparent hover:border-sidebar-foreground/40'
            )}
            aria-label="Dark theme"
            title="Dark"
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
