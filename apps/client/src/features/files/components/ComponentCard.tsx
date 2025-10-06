import { useState } from 'react';
import { useTheme, getComponentStyles } from '@felix/theme-system';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ComponentCardProps {
  icon: string;
  title: string;
  count: number;
  description?: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: 'default' | 'accent' | 'primary';
  /**
   * Optional explicit component type key (e.g., 'class', 'function').
   * If omitted, the component will attempt to infer from `title`,
   * but passing this avoids mismatches like 'Classes' vs 'class'.
   */
  componentType?: string;
}

export function ComponentCard({ 
  icon, 
  title, 
  count, 
  description, 
  children, 
  defaultExpanded = false,
  variant = 'default',
  componentType
}: ComponentCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { theme } = useTheme();

  const variantStyles = {
    default: 'border-border bg-card',
    accent: 'border-accent bg-accent/5',
    primary: 'border-primary/30 bg-primary/5'
  };

  // Resolve the theme key to use for coloring
  const resolveTypeKey = () => {
    if (componentType) return componentType.toLowerCase();
    // Map common pluralized titles to canonical keys
    const t = title.toLowerCase();
    const map: Record<string,string> = {
      classes: 'class',
      functions: 'function',
      methods: 'method',
      interfaces: 'interface',
      types: 'type',
      variables: 'variable',
      properties: 'property',
      enums: 'enum',
      modules: 'module',
      namespaces: 'namespace',
      packages: 'package',
      imports: 'import',
      exports: 'export',
      files: 'file',
      directories: 'directory',
      components: 'component',
      hooks: 'hook',
      services: 'service',
      controllers: 'controller',
      models: 'model',
      schemas: 'schema',
      routes: 'route',
      middleware: 'middleware',
      tests: 'test',
      configs: 'config',
      utilities: 'util',
      helpers: 'helper',
    };
    return map[t] || t;
  };

  const typeKey = resolveTypeKey();
  const chipStyles = getComponentStyles(theme, typeKey);

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all duration-200",
      variantStyles[variant]
    )}>
      {/* Header */}
      <div 
        className={cn(
          "p-4 cursor-pointer transition-colors flex items-center gap-3 hover:shadow-sm",
          isExpanded && "border-b border-border"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ boxShadow: chipStyles?.color ? `inset 4px 0 0 0 ${chipStyles.color}` : undefined }}
      >
        <span className="text-xl">{icon}</span>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">{title}</h3>
            <span className="px-2 py-0.5 rounded text-xs font-medium border"
                  style={chipStyles}>
              {count}
            </span>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        <div className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Content */}
      {children && (
        <div className={cn(
          "bg-background/50 overflow-y-auto",
          isExpanded ? "max-h-[600px] p-4" : "max-h-[300px] p-4"
        )}>
          {children}
        </div>
      )}
    </div>
  );
}
