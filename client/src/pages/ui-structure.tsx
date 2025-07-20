import { useState, useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  NodeTypes,
  Handle,
  Position,
  ConnectionMode,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, RotateCcw, Database, Router, Layout, Component, Zap, Globe, Settings } from "lucide-react";

interface UINodeData {
  label: string;
  type: string;
  level: number;
  description?: string;
  nodeType: string;
}

// Custom Node Component
const CustomNode = ({ data }: { data: UINodeData }) => {
  const getNodeColor = (type: string) => {
    const colors = {
      'app': 'bg-purple-500',
      'provider': 'bg-cyan-500',
      'router': 'bg-emerald-500',
      'page': 'bg-amber-500',
      'component': 'bg-red-500',
      'layout': 'bg-blue-500',
      'ui-element': 'bg-lime-500',
      'utility': 'bg-gray-500',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  const getNodeIcon = (type: string) => {
    const icons = {
      'app': Globe,
      'provider': Zap,
      'router': Router,
      'page': Layout,
      'component': Component,
      'layout': Layout,
      'ui-element': Component,
      'utility': Settings,
    };
    const IconComponent = icons[type as keyof typeof icons] || Component;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 border-white bg-white min-w-[120px] ${getNodeColor(data.type)} bg-opacity-10`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      
      <div className="flex items-center space-x-2 mb-1">
        <div className={`w-6 h-6 rounded-full ${getNodeColor(data.type)} flex items-center justify-center text-white`}>
          {getNodeIcon(data.type)}
        </div>
        <div className="text-sm font-semibold text-gray-800">{data.label}</div>
      </div>
      
      <div className="text-xs text-gray-600">
        <Badge variant="secondary" className="text-xs">
          {data.type}
        </Badge>
      </div>
      
      {data.description && (
        <div className="text-xs text-gray-500 mt-2 line-clamp-2">
          {data.description}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </div>
  );
};

export default function UIStructurePage() {
  const nodeTypes: NodeTypes = useMemo(() => ({
    custom: CustomNode,
  }), []);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Generate initial nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodeData = [
      // Level 0
      { id: 'app', label: 'SecuraCert App', type: 'app', level: 0, description: 'Root application container', x: 400, y: 50 },
      
      // Level 1
      { id: 'providers', label: 'Providers', type: 'provider', level: 1, description: 'Application providers', x: 200, y: 200 },
      { id: 'router', label: 'Router', type: 'router', level: 1, description: 'Wouter routing system', x: 600, y: 200 },
      
      // Level 2
      { id: 'query-client', label: 'Query Client', type: 'provider', level: 2, description: 'TanStack Query for data fetching', x: 100, y: 350 },
      { id: 'theme-provider', label: 'Theme Provider', type: 'provider', level: 2, description: '7 theme system with localStorage', x: 250, y: 350 },
      { id: 'tooltip-provider', label: 'Tooltip Provider', type: 'provider', level: 2, description: 'Radix UI tooltips', x: 400, y: 350 },
      
      { id: 'auth-check', label: 'Auth Check', type: 'router', level: 2, description: 'Authentication guard', x: 550, y: 350 },
      { id: 'routes', label: 'Protected Routes', type: 'router', level: 2, description: 'Authenticated user routes', x: 700, y: 350 },
      
      // Level 3 (selective key routes)
      { id: 'login-page', label: 'Login Page', type: 'page', level: 3, description: 'User authentication', x: 450, y: 500 },
      { id: 'dashboard', label: 'Dashboard', type: 'page', level: 3, description: 'Main dashboard page', x: 600, y: 500 },
      { id: 'quiz-routes', label: 'Quiz Routes', type: 'router', level: 3, description: 'Learning session pages', x: 750, y: 500 },
      { id: 'admin', label: 'Admin Dashboard', type: 'page', level: 3, description: 'Multi-tenant administration', x: 900, y: 500 },
    ];

    const connections = [
      // Level 0 to 1
      { from: 'app', to: 'providers' },
      { from: 'app', to: 'router' },
      
      // Level 1 to 2
      { from: 'providers', to: 'query-client' },
      { from: 'providers', to: 'theme-provider' },
      { from: 'providers', to: 'tooltip-provider' },
      { from: 'router', to: 'auth-check' },
      { from: 'router', to: 'routes' },
      
      // Level 2 to 3
      { from: 'auth-check', to: 'login-page' },
      { from: 'routes', to: 'dashboard' },
      { from: 'routes', to: 'quiz-routes' },
      { from: 'routes', to: 'admin' },
    ];

    const nodes: Node<UINodeData>[] = nodeData.map(node => ({
      id: node.id,
      type: 'custom',
      position: { x: node.x, y: node.y },
      data: {
        label: node.label,
        type: node.type,
        level: node.level,
        description: node.description,
        nodeType: node.type,
      },
    }));

    const edges: Edge[] = connections.map((conn, index) => ({
      id: `${conn.from}-${conn.to}`,
      source: conn.from,
      target: conn.to,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: '#94a3b8',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94a3b8',
      },
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<UINodeData> | null>(null);

  const onConnect = useCallback((params: any) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<UINodeData>) => {
    setSelectedNode(node);
  }, []);

  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchesSearch = node.data.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           node.data.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || node.data.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [nodes, searchTerm, filterType]);

  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  }, [edges, filteredNodes]);

  const resetView = useCallback(() => {
    setSearchTerm("");
    setFilterType("all");
    setSelectedNode(null);
  }, []);

  const exportImage = useCallback(() => {
    // This would require additional setup for image export
    // For now, we'll show a placeholder
    alert("Export functionality would be implemented with react-flow/export or html2canvas");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-full mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">UI Structure Visualization</h1>
          <p className="text-muted-foreground">
            Interactive map of the SecuraCert application architecture (React Flow powered)
          </p>
        </div>

        {/* Controls */}
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="app">App</SelectItem>
              <SelectItem value="provider">Provider</SelectItem>
              <SelectItem value="router">Router</SelectItem>
              <SelectItem value="page">Page</SelectItem>
              <SelectItem value="component">Component</SelectItem>
              <SelectItem value="layout">Layout</SelectItem>
              <SelectItem value="ui-element">UI Element</SelectItem>
              <SelectItem value="utility">Utility</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportImage}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* React Flow Canvas */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <div className="w-full h-[600px] rounded-lg overflow-hidden">
                  <ReactFlow
                    nodes={filteredNodes}
                    edges={filteredEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    connectionMode={ConnectionMode.Loose}
                    fitView
                    attributionPosition="bottom-left"
                  >
                    <Controls />
                    <Background color="#94a3b8" gap={20} />
                  </ReactFlow>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="space-y-4">
            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Node Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { type: 'app', color: 'bg-purple-500', label: 'Application' },
                  { type: 'provider', color: 'bg-cyan-500', label: 'Provider' },
                  { type: 'router', color: 'bg-emerald-500', label: 'Router' },
                  { type: 'page', color: 'bg-amber-500', label: 'Page' },
                  { type: 'component', color: 'bg-red-500', label: 'Component' },
                  { type: 'layout', color: 'bg-blue-500', label: 'Layout' },
                  { type: 'ui-element', color: 'bg-lime-500', label: 'UI Element' },
                  { type: 'utility', color: 'bg-gray-500', label: 'Utility' }
                ].map(item => (
                  <div key={item.type} className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full ${item.color}`} />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Selected Node Info */}
            {selectedNode && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Selected Node</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <div className="font-medium">{selectedNode.data.label}</div>
                    <Badge variant="secondary" className="mt-1">
                      {selectedNode.data.type}
                    </Badge>
                  </div>
                  {selectedNode.data.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedNode.data.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Level: {selectedNode.data.level}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>• Click nodes to view details</p>
                <p>• Drag nodes to reposition</p>
                <p>• Use controls to pan and zoom</p>
                <p>• Search to filter nodes</p>
                <p>• Filter by node type</p>
                <p>• Built with React Flow</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}