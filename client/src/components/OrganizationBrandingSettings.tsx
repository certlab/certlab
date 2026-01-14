/**
 * OrganizationBrandingSettings Component
 *
 * Admin interface for configuring organization-wide branding and theming.
 * Allows admins to customize:
 * - Logo and visual identity
 * - Color scheme (primary, secondary, accent)
 * - Typography settings
 * - Default theme selection
 *
 * @module organization-branding-settings
 */

import { useState, useEffect } from 'react';
import { useBranding } from '@/lib/branding-provider';
import { useAuth } from '@/lib/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Palette,
  Type,
  Image as ImageIcon,
  Save,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import type { OrganizationBranding } from '@shared/schema';
import { organizationBrandingSchema } from '@shared/schema';
import { themes } from '@/lib/theme-constants';

export function OrganizationBrandingSettings() {
  const { user } = useAuth();
  const { branding, updateBranding, isLoading: brandingLoading } = useBranding();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<OrganizationBranding>>({
    tenantId: 1,
    isActive: true,
    allowUserThemeSelection: true,
  });

  // Load branding data when component mounts or branding changes
  useEffect(() => {
    if (branding) {
      setFormData(branding);
    }
  }, [branding]);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </CardContent>
      </Card>
    );
  }

  const handleInputChange = (field: keyof OrganizationBranding, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save branding settings.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const brandingData: OrganizationBranding = {
        tenantId: formData.tenantId || 1,
        logoUrl: formData.logoUrl,
        logoWidth: formData.logoWidth,
        logoHeight: formData.logoHeight,
        faviconUrl: formData.faviconUrl,
        splashScreenUrl: formData.splashScreenUrl,
        splashScreenDuration: formData.splashScreenDuration,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        accentColor: formData.accentColor,
        backgroundColor: formData.backgroundColor,
        surfaceColor: formData.surfaceColor,
        fontFamily: formData.fontFamily,
        headingFontFamily: formData.headingFontFamily,
        organizationName: formData.organizationName,
        organizationTagline: formData.organizationTagline,
        defaultTheme: formData.defaultTheme,
        allowUserThemeSelection: formData.allowUserThemeSelection ?? true,
        enabledThemes: formData.enabledThemes,
        customCss: formData.customCss,
        isActive: formData.isActive ?? true,
        updatedAt: new Date(),
        updatedBy: user.id,
      };

      // Validate with Zod schema before saving
      const validation = organizationBrandingSchema.safeParse(brandingData);

      if (!validation.success) {
        const errors = validation.error.issues
          .map((err: any) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        toast({
          title: 'Validation Error',
          description: `Please fix the following errors: ${errors}`,
          variant: 'destructive',
        });
        return;
      }

      await updateBranding(brandingData);

      toast({
        title: 'Success',
        description: 'Organization branding updated successfully.',
      });
    } catch (error) {
      console.error('Failed to save branding:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to save branding settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (branding) {
      setFormData(branding);
      toast({
        title: 'Reset',
        description: 'Form reset to last saved values.',
      });
    }
  };

  if (brandingLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Organization Branding</h2>
        <p className="text-muted-foreground">
          Customize your organization's look and feel across the entire application.
        </p>
      </div>

      <Tabs defaultValue="colors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="identity">
            <ImageIcon className="h-4 w-4 mr-2" />
            Visual Identity
          </TabsTrigger>
          <TabsTrigger value="typography">
            <Type className="h-4 w-4 mr-2" />
            Typography
          </TabsTrigger>
          <TabsTrigger value="themes">
            <Palette className="h-4 w-4 mr-2" />
            Themes
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>
                Define your organization's color palette. These colors will be applied across the
                entire application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor || '#0066cc'}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.primaryColor || '#0066cc'}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      placeholder="#0066cc"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Main brand color for buttons, links, and primary elements
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={formData.secondaryColor || '#6b7280'}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.secondaryColor || '#6b7280'}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      placeholder="#6b7280"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supporting color for secondary actions and elements
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={formData.accentColor || '#10b981'}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.accentColor || '#10b981'}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      placeholder="#10b981"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Highlight color for important elements and notifications
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={formData.backgroundColor || '#ffffff'}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.backgroundColor || '#ffffff'}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Main background color for the application
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surfaceColor">Surface Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="surfaceColor"
                      type="color"
                      value={formData.surfaceColor || '#f9fafb'}
                      onChange={(e) => handleInputChange('surfaceColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.surfaceColor || '#f9fafb'}
                      onChange={(e) => handleInputChange('surfaceColor', e.target.value)}
                      placeholder="#f9fafb"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Color for cards and elevated surfaces
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visual Identity Tab */}
        <TabsContent value="identity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visual Identity</CardTitle>
              <CardDescription>
                Configure your organization's logo, favicon, and splash screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  value={formData.organizationName || ''}
                  onChange={(e) => handleInputChange('organizationName', e.target.value)}
                  placeholder="Your Organization Name"
                />
                <p className="text-xs text-muted-foreground">
                  This will be displayed in the header and other places
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationTagline">Tagline (Optional)</Label>
                <Input
                  id="organizationTagline"
                  type="text"
                  value={formData.organizationTagline || ''}
                  onChange={(e) => handleInputChange('organizationTagline', e.target.value)}
                  placeholder="Your organization's tagline"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={formData.logoUrl || ''}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  URL to your organization's logo (PNG, SVG recommended)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logoWidth">Logo Width (px)</Label>
                  <Input
                    id="logoWidth"
                    type="number"
                    min="20"
                    max="200"
                    value={formData.logoWidth || 40}
                    onChange={(e) => handleInputChange('logoWidth', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoHeight">Logo Height (px)</Label>
                  <Input
                    id="logoHeight"
                    type="number"
                    min="20"
                    max="200"
                    value={formData.logoHeight || 40}
                    onChange={(e) => handleInputChange('logoHeight', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  type="url"
                  value={formData.faviconUrl || ''}
                  onChange={(e) => handleInputChange('faviconUrl', e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                />
                <p className="text-xs text-muted-foreground">
                  Favicon displayed in browser tabs (16x16 or 32x32 recommended)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="splashScreenUrl">Splash Screen URL (Optional)</Label>
                <Input
                  id="splashScreenUrl"
                  type="url"
                  value={formData.splashScreenUrl || ''}
                  onChange={(e) => handleInputChange('splashScreenUrl', e.target.value)}
                  placeholder="https://example.com/splash.png"
                />
                <p className="text-xs text-muted-foreground">Image shown during app loading</p>
              </div>

              {formData.splashScreenUrl && (
                <div className="space-y-2">
                  <Label htmlFor="splashScreenDuration">Splash Screen Duration (ms)</Label>
                  <Input
                    id="splashScreenDuration"
                    type="number"
                    min="500"
                    max="10000"
                    value={formData.splashScreenDuration || 2000}
                    onChange={(e) =>
                      handleInputChange('splashScreenDuration', parseInt(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    How long to show the splash screen (default: 2000ms)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Customize fonts used throughout the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Body Font Family</Label>
                <Input
                  id="fontFamily"
                  type="text"
                  value={formData.fontFamily || ''}
                  onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                  placeholder="Inter, system-ui, sans-serif"
                />
                <p className="text-xs text-muted-foreground">
                  Font family for body text. Use web-safe fonts or include Google Fonts in custom
                  CSS.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headingFontFamily">Heading Font Family</Label>
                <Input
                  id="headingFontFamily"
                  type="text"
                  value={formData.headingFontFamily || ''}
                  onChange={(e) => handleInputChange('headingFontFamily', e.target.value)}
                  placeholder="Poppins, sans-serif"
                />
                <p className="text-xs text-muted-foreground">
                  Font family for headings and titles. Leave empty to use body font.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customCss">Custom CSS (Advanced)</Label>
                <textarea
                  id="customCss"
                  className="w-full h-32 px-3 py-2 text-sm rounded-md border border-input bg-background"
                  value={formData.customCss || ''}
                  onChange={(e) => handleInputChange('customCss', e.target.value)}
                  placeholder={`/* Custom CSS */\n@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');\n\nh1, h2, h3 {\n  font-family: 'Poppins', sans-serif;\n}`}
                />
                <p className="text-xs text-muted-foreground">
                  Advanced: Add custom CSS to further customize the application appearance.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ Warning: Custom CSS can affect application security and functionality. Only add
                  styles that have been carefully reviewed and come from trusted sources.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Themes Tab */}
        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>
                Configure default theme and user theme selection options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultTheme">Default Theme</Label>
                <Select
                  value={formData.defaultTheme || 'light'}
                  onValueChange={(value) => handleInputChange('defaultTheme', value)}
                >
                  <SelectTrigger id="defaultTheme">
                    <SelectValue placeholder="Select default theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        <div className="flex items-center gap-2">
                          <theme.icon className="h-4 w-4" />
                          <span>{theme.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Theme applied by default for new users and logged-out visitors
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowUserThemeSelection">Allow User Theme Selection</Label>
                  <p className="text-xs text-muted-foreground">
                    Let users choose their preferred theme from available options
                  </p>
                </div>
                <Switch
                  id="allowUserThemeSelection"
                  checked={formData.allowUserThemeSelection ?? true}
                  onCheckedChange={(checked) =>
                    handleInputChange('allowUserThemeSelection', checked)
                  }
                />
              </div>

              {formData.allowUserThemeSelection && (
                <div className="space-y-2">
                  <Label>Enabled Themes</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select which themes users can choose from. Leave empty to allow all themes.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {themes.map((theme) => (
                      <div key={theme.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`theme-${theme.value}`}
                          checked={
                            !formData.enabledThemes ||
                            formData.enabledThemes.length === 0 ||
                            formData.enabledThemes.includes(theme.value)
                          }
                          onChange={(e) => {
                            const currentThemes = formData.enabledThemes || [];
                            const newThemes = e.target.checked
                              ? [...currentThemes, theme.value]
                              : currentThemes.filter((t) => t !== theme.value);
                            handleInputChange('enabledThemes', newThemes);
                          }}
                          className="rounded border-gray-300"
                        />
                        <label
                          htmlFor={`theme-${theme.value}`}
                          className="text-sm flex items-center gap-2"
                        >
                          <theme.icon className="h-4 w-4" />
                          {theme.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardFooter className="flex justify-between pt-6">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
