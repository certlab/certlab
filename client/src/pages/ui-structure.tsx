import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStructure } from "@/hooks/useUIStructure";
import { useDevUISync } from "@/hooks/useDevUISync";
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Home,
  Shield,
  Trophy,
  Eye,
  Settings,
  Database,
  BookOpen,
  BarChart3,
  Users,
  FileText,
  Layout,
  Component,
  RefreshCw,
  Clock,
  // Standardized icon set
  Folder,
  Puzzle,
  Activity,
  GraduationCap,
  FileQuestion,
  Award,
  Medal,
  TrendingUp,
  BarChart2,
  Palette,
  Building,
  HelpCircle,
  User,
  LogIn,
  Navigation,
  PanelLeft,
  Monitor,
  PlusCircle,
  Filter,
  Gauge,
  Bell,
  Wrench,
  Layers,
  AlertTriangle
} from "lucide-react";

interface RouteHierarchy {
  id: string;
  label: string;
  route: string;
  type: 'route' | 'component' | 'provider' | 'utility';
  description: string;
  icon: string;
  children?: RouteHierarchy[];
  dependencies?: string[];
}

const UIStructurePage = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('dashboard');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['dashboard', 'quiz', 'admin']));
  const [searchTerm, setSearchTerm] = useState("");
  
  // Load dynamic UI structure data
  const { structureData, loading, error } = useUIStructure();
  
  // Enable automatic syncing in development
  useDevUISync();
  
  // Use dynamic data from JSON file - this ensures consistent type-based icons
  const routeHierarchy: RouteHierarchy[] = structureData?.routes || [];


  // Flatten hierarchy for easy lookup
  const allNodes = useMemo(() => {
    const nodes: Record<string, RouteHierarchy> = {};
    const addNode = (node: RouteHierarchy) => {
      nodes[node.id] = node;
      node.children?.forEach(addNode);
    };
    routeHierarchy.forEach(addNode);
    return nodes;
  }, [routeHierarchy]);

  const selectedNode = allNodes[selectedNodeId];

  const getNodeColor = (type: string) => {
    const colors = {
      'route': 'bg-purple-500',
      'component': 'bg-blue-500',
      'provider': 'bg-cyan-500',
      'utility': 'bg-gray-500',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  const getNodeIcon = (iconName: string) => {
    const icons = {
      'Home': Home,
      'BookOpen': BookOpen,
      'Settings': Settings,
      'Trophy': Trophy,
      'Eye': Eye,
      'Shield': Shield,
      'BarChart3': BarChart3,
      'Database': Database,
      'Users': Users,
      'FileText': FileText,
      'Component': Component,
      'Folder': Folder,
      'Puzzle': Puzzle,
      'Activity': Activity,
      'GraduationCap': GraduationCap,
      'FileQuestion': FileQuestion,
      'Award': Award,
      'Medal': Medal,
      'TrendingUp': TrendingUp,
      'BarChart2': BarChart2,
      'Palette': Palette,
      'Building': Building,
      'HelpCircle': HelpCircle,
      'User': User,
      'LogIn': LogIn,
      'Navigation': Navigation,
      'PanelLeft': PanelLeft,
      'Monitor': Monitor,
      'PlusCircle': PlusCircle,
      'Filter': Filter,
      'Gauge': Gauge,
      'Bell': Bell,
      'Wrench': Wrench,
      'Layers': Layers,
      'AlertTriangle': AlertTriangle,
      'Search': Search,
      'Layout': Layout
    };
    const IconComponent = icons[iconName as keyof typeof icons] || Component;
    return <IconComponent className="w-4 h-4" />;
  };

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const filteredRoutes = useMemo(() => {
    if (!searchTerm) return routeHierarchy;
    
    return routeHierarchy.filter(route => {
      const matchesRoute = route.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          route.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesChildren = route.children?.some(child =>
        child.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        child.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return matchesRoute || matchesChildren;
    });
  }, [searchTerm, routeHierarchy]);

  // Tree navigation component
  const TreeNode = ({ node, level = 0 }: { node: RouteHierarchy; level?: number }) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div className="space-y-1">
        <div
          className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => setSelectedNodeId(node.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(node.id);
              }}
              className="p-0.5 hover:bg-background/20 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          
          <div className={`w-6 h-6 rounded-md ${getNodeColor(node.type)} flex items-center justify-center text-white`}>
            {getNodeIcon(node.icon)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{node.label}</div>
            <div className="text-xs text-muted-foreground">{node.route}</div>
          </div>
          
          <Badge variant="secondary" className="text-xs">
            {node.type}
          </Badge>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="space-y-1">
            {node.children!.map(child => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">UI Structure Navigation</h1>
              <p className="text-muted-foreground mt-2">
                Explore the Cert Lab application routes, components, and dependencies through an intuitive tree navigation.
              </p>
            </div>
            
            {structureData && (
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Last updated: {new Date(structureData.lastUpdated).toLocaleString()}</span>
                </div>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>{structureData.generatedBy}</span>
                </Badge>
              </div>
            )}
          </div>

          {loading && (
            <Card>
              <CardContent className="pt-6 text-center">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading UI structure...</p>
              </CardContent>
            </Card>
          )}

          {!loading && routeHierarchy.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No UI structure data available. The dynamic sync may be initializing.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Debug: structureData={structureData ? 'loaded' : 'null'}, routes={structureData?.routes?.length || 0}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Main Layout */}
          {!loading && routeHierarchy.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Navigation Tree Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Navigation Tree</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search routes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Icon Legend */}
                  <div className="text-xs text-muted-foreground space-y-1 pt-3 mt-3 border-t">
                    <div className="font-medium text-foreground mb-2">Node Types:</div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Folder className="w-3 h-3 text-purple-500" />
                        <span>Routes</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-3 h-3 text-blue-500" />
                        <span>Pages</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Puzzle className="w-3 h-3 text-green-500" />
                        <span>Components</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Layers className="w-3 h-3 text-cyan-500" />
                        <span>Providers</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Wrench className="w-3 h-3 text-orange-500" />
                        <span>Utilities</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Layout className="w-3 h-3 text-pink-500" />
                        <span>Layouts</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px] px-4 pb-4">
                    <div className="space-y-1">
                      {filteredRoutes.length > 0 ? (
                        filteredRoutes.map(route => (
                          <TreeNode key={route.id} node={route} />
                        ))
                      ) : routeHierarchy.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="text-sm">No routes loaded yet...</div>
                          <div className="text-xs mt-1">Data syncing: {structureData ? 'Complete' : 'In progress'}</div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="text-sm">No routes match your search</div>
                          <div className="text-xs mt-1">Try a different search term</div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Details Panel */}
            <div className="lg:col-span-3">
              {selectedNode ? (
                <div className="space-y-6">
                  {/* Selected Node Details */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg ${getNodeColor(selectedNode.type)} flex items-center justify-center text-white`}>
                          {getNodeIcon(selectedNode.icon)}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-2xl">{selectedNode.label}</CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{selectedNode.type}</Badge>
                            <code className="text-sm bg-muted px-2 py-1 rounded">{selectedNode.route}</code>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-lg">{selectedNode.description}</p>
                    </CardContent>
                  </Card>

                  {/* Dependencies */}
                  {selectedNode.dependencies && selectedNode.dependencies.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Dependencies</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedNode.dependencies.map((dep, index) => (
                            <div 
                              key={index}
                              className="flex items-center space-x-2 p-3 bg-muted rounded-lg"
                            >
                              <Database className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium">{dep}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Child Components */}
                  {selectedNode.children && selectedNode.children.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Components ({selectedNode.children.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedNode.children.map((child) => (
                            <div 
                              key={child.id}
                              className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => setSelectedNodeId(child.id)}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`w-8 h-8 rounded-md ${getNodeColor(child.type)} flex items-center justify-center text-white flex-shrink-0`}>
                                  {getNodeIcon(child.icon)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{child.label}</div>
                                  <div className="text-sm text-muted-foreground mt-1">{child.description}</div>
                                  <div className="flex items-center justify-between mt-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {child.type}
                                    </Badge>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Empty State for Leaf Nodes */}
                  {(!selectedNode.children || selectedNode.children.length === 0) && selectedNode.type === 'component' && (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                          <Component className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Component Details</h3>
                        <p className="text-muted-foreground">
                          This is a leaf component with no child components. 
                          Check the dependencies above to understand its integrations.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                      <Layout className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Select a Route</h3>
                    <p className="text-muted-foreground">
                      Choose a route from the navigation tree to explore its components and dependencies.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UIStructurePage;