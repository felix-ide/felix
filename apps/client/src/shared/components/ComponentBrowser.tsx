import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { felixService } from '@/services/felixService';
import { cn } from '@/utils/cn';
import { 
  FileText, Box, Code, CircuitBoard, Layers, Package, Hash, Braces 
} from 'lucide-react';

interface ComponentNode {
  id: string;
  name: string;
  type: string;
  filePath?: string;
  language?: string;
  metadata?: any;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  component?: ComponentNode;
  components?: ComponentNode[];
}

interface ComponentBrowserProps {
  onComponentSelect?: (component: ComponentNode) => void;
  selectedComponentId?: string;
  searchText?: string;
  onSearchChange?: (text: string) => void;
  className?: string;
}

export function ComponentBrowser({
  onComponentSelect,
  selectedComponentId,
  searchText: externalSearchText,
  onSearchChange,
  className
}: ComponentBrowserProps) {
  const [components, setComponents] = useState<ComponentNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState(externalSearchText || '');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [activeNodeTypes, setActiveNodeTypes] = useState<Set<string>>(
    new Set(['file', 'class', 'function', 'method', 'interface', 'module', 'variable', 'property'])
  );

  // Load components on mount
  useEffect(() => {
    loadComponents();
  }, []);

  // Sync external search text
  useEffect(() => {
    if (externalSearchText !== undefined) {
      setSearchText(externalSearchText);
    }
  }, [externalSearchText]);

  const loadComponents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await felixService.getAllComponents();
      const allComponents = response.components || [];
      
      setComponents(allComponents.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        filePath: comp.filePath,
        language: comp.language,
        metadata: comp.metadata
      })));
    } catch (error) {
      console.error('Failed to load components:', error);
      setError(error instanceof Error ? error.message : 'Failed to load components');
    } finally {
      setIsLoading(false);
    }
  };

  // Build file tree from components
  const fileTree = useMemo(() => {
    const tree: FileTreeNode = { name: 'root', path: '', type: 'directory', children: [] };
    
    components.forEach(component => {
      if (!component.filePath) return;
      
      const parts = component.filePath.split('/').filter(p => p);
      let current = tree;
      let currentPath = '';
      
      // Build directory structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!current.children) current.children = [];
        
        let child = current.children.find(c => c.name === part && c.type === 'directory');
        if (!child) {
          child = {
            name: part,
            path: currentPath,
            type: 'directory',
            children: []
          };
          current.children.push(child);
        }
        current = child;
      }
      
      // Add file node
      const fileName = parts[parts.length - 1];
      currentPath = currentPath ? `${currentPath}/${fileName}` : fileName;
      
      if (!current.children) current.children = [];
      
      let fileNode = current.children.find(c => c.name === fileName && c.type === 'file');
      if (!fileNode) {
        fileNode = {
          name: fileName,
          path: currentPath,
          type: 'file',
          components: []
        };
        current.children.push(fileNode);
      }
      
      if (!fileNode.components) fileNode.components = [];
      fileNode.components.push(component);
    });
    
    // Sort children - directories first, then files, both alphabetically
    const sortChildren = (node: FileTreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortChildren);
      }
    };
    
    sortChildren(tree);
    return tree;
  }, [components]);

  // Filter components and tree based on search
  const filteredComponents = useMemo(() => {
    return components.filter(component => {
      if (!activeNodeTypes.has(component.type)) return false;
      if (searchText) {
        const search = searchText.toLowerCase();
        return component.name.toLowerCase().includes(search) ||
               component.filePath?.toLowerCase().includes(search) ||
               component.type.toLowerCase().includes(search);
      }
      return true;
    });
  }, [components, activeNodeTypes, searchText]);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleComponentSelect = (component: ComponentNode) => {
    onComponentSelect?.(component);
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    onSearchChange?.(text);
  };

  const toggleNodeTypeFilter = (type: string) => {
    const newTypes = new Set(activeNodeTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setActiveNodeTypes(newTypes);
  };

  const getNodeIcon = (type: string) => {
    const icons: Record<string, any> = {
      file: FileText,
      class: Box,
      function: Code,
      method: CircuitBoard,
      interface: Layers,
      module: Package,
      variable: Hash,
      property: Braces
    };
    return icons[type] || FileText;
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      file: 'text-green-600',
      class: 'text-primary',
      function: 'text-yellow-600',
      method: 'text-orange-600',
      interface: 'text-purple-600',
      module: 'text-indigo-600',
      variable: 'text-pink-600',
      property: 'text-red-600'
    };
    return colors[type] || 'text-muted-foreground';
  };

  const renderTreeNode = (node: FileTreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedPaths.has(node.path);
    const hasMatchingComponents = node.components?.some(comp => filteredComponents.includes(comp));
    const hasMatchingChildren = node.children?.some(child => 
      child.type === 'directory' || child.components?.some(comp => filteredComponents.includes(comp))
    );
    
    // Don't render if no matching content and we have a search filter
    if (searchText && !hasMatchingComponents && !hasMatchingChildren) {
      return null;
    }

    return (
      <div key={node.path}>
        {/* Directory/File Node */}
        <div
          className={cn(
            "flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer text-sm",
            depth > 0 && "ml-4"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleExpanded(node.path);
            }
          }}
        >
          {node.type === 'directory' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 mr-2 text-primary" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-primary" />
              )}
              <span className="font-medium">{node.name}</span>
            </>
          ) : (
            <>
              <File className="h-4 w-4 mr-2 ml-5 text-muted-foreground" />
              <span>{node.name}</span>
              {node.components && node.components.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  ({node.components.length})
                </span>
              )}
            </>
          )}
        </div>

        {/* Components within file */}
        {node.type === 'file' && node.components && (
          <div className={cn("", searchText && "block", !searchText && !isExpanded && "hidden")}>
            {node.components
              .filter(comp => filteredComponents.includes(comp))
              .map(component => {
                const Icon = getNodeIcon(component.type);
                const isSelected = selectedComponentId === component.id;
                
                return (
                  <div
                    key={component.id}
                    className={cn(
                      "flex items-center py-1 px-2 hover:bg-accent/30 cursor-pointer text-sm",
                      isSelected && "bg-primary/10 border-l-2 border-primary"
                    )}
                    style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
                    onClick={() => handleComponentSelect(component)}
                  >
                    <Icon className={cn("h-3 w-3 mr-2", getNodeColor(component.type))} />
                    <span className="truncate">{component.name}</span>
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {component.type}
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        {/* Child directories */}
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className={cn("p-4", className)}>
        <div className="text-red-500 text-sm">
          Error loading components: {error}
        </div>
      </div>
    );
  }

  const nodeTypes = ['file', 'class', 'function', 'method', 'interface', 'module', 'variable', 'property'];

  return (
    <div className={cn("h-full flex flex-col bg-background border-r border-border", className)}>
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold mb-3">Component Browser</h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter components..."
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-7 pl-7 pr-2 text-xs border border-border rounded bg-background"
          />
        </div>

        {/* Type Filters */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Component Types</div>
          <div className="flex flex-wrap gap-1">
            {nodeTypes.map(type => {
              const count = components.filter(c => c.type === type).length;
              if (count === 0) return null;
              
              return (
                <button
                  key={type}
                  onClick={() => toggleNodeTypeFilter(type)}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded transition-colors",
                    activeNodeTypes.has(type)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {type} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading components...
          </div>
        ) : filteredComponents.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No components found
          </div>
        ) : (
          <div className="p-2">
            {fileTree.children?.map(child => renderTreeNode(child, 0))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Total: {components.length}</span>
          <span>Filtered: {filteredComponents.length}</span>
        </div>
      </div>
    </div>
  );
}