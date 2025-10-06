import { useState } from 'react';
import { useTheme, getComponentStyles } from '@felix/theme-system';
import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Method {
  name: string;
  visibility: 'public' | 'private' | 'protected';
  parameters?: string[];
  returnType?: string;
  sourceCode?: string;
}

interface Property {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  defaultValue?: string;
}

interface ClassCardProps {
  name: string;
  methods?: Method[];
  properties?: Property[];
  extends?: string;
  implements?: string[];
  description?: string;
  sourceCode?: string;
  onDrillDown?: () => void;
}

export function ClassCard({
  name,
  methods = [],
  properties = [],
  extends: extendsClass,
  implements: implementsInterfaces = [],
  description,
  sourceCode,
  onDrillDown
}: ClassCardProps) {
  const [showMethods, setShowMethods] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const { theme } = useTheme();

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return '◦';
      case 'private': return '×';
      case 'protected': return '△';
      default: return '·';
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'text-info';
      case 'private': return 'text-destructive';
      case 'protected': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden"
         style={getComponentStyles(theme, 'class')}>
      {/* Header */}
      <div className="p-4 border-b"
           style={{
             backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : 'transparent',
             borderColor: theme.colors.border.primary
           }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔷</span>
              <h4 
                className="font-bold text-lg cursor-pointer hover:text-info"
                onClick={onDrillDown}
              >
                {name}
              </h4>
            </div>
            
            {description && (
              <p className="text-sm text-muted-foreground mb-2">{description}</p>
            )}
            
            {/* Inheritance Info */}
            <div className="space-y-1">
              {extendsClass && (
                <div className="text-xs flex items-center gap-2">
                  <span className="text-muted-foreground">Extends:</span>
                  <span className="bg-accent/20 px-2 py-1 rounded font-mono">
                    {extendsClass}
                  </span>
                </div>
              )}
              
              {implementsInterfaces.length > 0 && (
                <div className="text-xs flex items-center gap-2">
                  <span className="text-muted-foreground">Implements:</span>
                  <div className="flex flex-wrap gap-1">
                    {implementsInterfaces.map((iface, index) => (
                      <span 
                        key={index}
                        className="bg-accent/20 px-2 py-1 rounded font-mono"
                      >
                        {iface}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <span className="px-2 py-1 rounded text-xs border"
                  style={{
                    backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.secondary[50],
                    color: theme.type === 'dark' ? theme.colors.foreground.secondary : theme.colors.secondary[800],
                    borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.secondary[200]
                  }}>
              {methods.length} methods
            </span>
            <span className="px-2 py-1 rounded text-xs border"
                  style={{
                    backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.secondary[50],
                    color: theme.type === 'dark' ? theme.colors.foreground.secondary : theme.colors.secondary[800],
                    borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.secondary[200]
                  }}>
              {properties.length} props
            </span>
          </div>
        </div>
      </div>

      {/* Methods Section */}
      {methods.length > 0 && (
        <div className="border-b border-border">
          <button
            onClick={() => setShowMethods(!showMethods)}
            className="w-full p-3 flex items-center justify-between transition-colors hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Methods</span>
              <span className="px-2 py-0.5 rounded text-xs border"
                    style={{
                      backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.secondary[50],
                      color: theme.type === 'dark' ? theme.colors.foreground.secondary : theme.colors.secondary[800],
                      borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.secondary[200]
                    }}>
                {methods.length}
              </span>
            </div>
            {showMethods ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {showMethods && (
            <div className="p-3 bg-background/50 space-y-2">
              {methods.map((method, index) => (
                <div key={index} className="border rounded p-2"
                     style={{ borderColor: theme.colors.border.primary, backgroundColor: theme.type === 'dark' ? theme.colors.background.secondary : theme.colors.background.secondary }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getVisibilityIcon(method.visibility)}</span>
                    <span className="font-medium text-sm">{method.name}()</span>
                    <span className={cn("text-xs", getVisibilityColor(method.visibility))}>
                      {method.visibility}
                    </span>
                  </div>
                  
                  {method.parameters && method.parameters.length > 0 && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Parameters: {method.parameters.join(', ')}
                    </div>
                  )}
                  
                  {method.returnType && (
                    <div className="text-xs text-muted-foreground">
                      Returns: {method.returnType}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Properties Section */}
      {properties.length > 0 && (
        <div className="border-b border-border">
          <button
            onClick={() => setShowProperties(!showProperties)}
            className="w-full p-3 flex items-center justify-between transition-colors hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Properties</span>
              <span className="px-2 py-0.5 rounded text-xs border"
                    style={{
                      backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.secondary[50],
                      color: theme.type === 'dark' ? theme.colors.foreground.secondary : theme.colors.secondary[800],
                      borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.secondary[200]
                    }}>
                {properties.length}
              </span>
            </div>
            {showProperties ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {showProperties && (
            <div className="p-3 bg-background/50 space-y-2">
              {properties.map((property, index) => (
                <div key={index} className="border rounded p-2"
                     style={{ borderColor: theme.colors.border.primary, backgroundColor: theme.type === 'dark' ? theme.colors.background.secondary : theme.colors.background.secondary }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getVisibilityIcon(property.visibility)}</span>
                    <span className="font-medium text-sm">{property.name}</span>
                    <span className={cn("text-xs", getVisibilityColor(property.visibility))}>
                      {property.visibility}
                    </span>
                  </div>
                  
                  {property.type && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Type: {property.type}
                    </div>
                  )}
                  
                  {property.defaultValue && (
                    <div className="text-xs text-muted-foreground">
                      Default: {property.defaultValue}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Source Code */}
      {sourceCode && (
        <div className="p-3">
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 text-xs text-primary hover:underline mb-2"
          >
            {showCode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showCode ? 'Hide' : 'Show'} source code
          </button>
          
          {showCode && (
            <pre className="text-xs p-3 rounded overflow-auto max-h-48 font-mono border"
                 style={{
                   backgroundColor: theme.type === 'dark' ? theme.colors.background.secondary : theme.colors.background.secondary,
                   borderColor: theme.colors.border.primary
                 }}>
              {sourceCode}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
