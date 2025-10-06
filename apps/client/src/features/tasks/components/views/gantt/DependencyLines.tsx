import { useEffect, useRef } from 'react';
import { felixService } from '@/services/felixService';
import type { TaskDependency } from '@/types/api';

interface DependencyLinesProps {
  tasks: Array<{
    id: string;
    name: string;
    dependencies: string[];
  }>;
}

export function DependencyLines({ tasks }: DependencyLinesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDependencies = async () => {
      if (!svgRef.current || !containerRef.current || tasks.length === 0) return;
      const svgEl = svgRef.current;
      const containerEl = containerRef.current;

      try {
        // Load dependencies for all tasks
        const dependencyPromises = tasks.map(task => 
          felixService.getTaskDependencies(task.id).catch(() => ({ incoming: [], outgoing: [] }))
        );
        
        const dependencyResults = await Promise.all(dependencyPromises);
        const allDependencies: TaskDependency[] = [];
        
        dependencyResults.forEach(result => {
          if (result.incoming) {
            allDependencies.push(...result.incoming);
          }
          if (result.outgoing) {
            allDependencies.push(...result.outgoing);
          }
        });

        // Clear existing lines
        if (!svgEl) return;
        svgEl.innerHTML = '';

        // Draw dependency lines
        allDependencies.forEach(dep => {
          // dependency_task_id is the task that must complete first
          // dependent_task_id is the task that depends on it
          // So arrow should go FROM dependency_task_id TO dependent_task_id
          const sourceElement = document.querySelector(`[data-id="${dep.dependency_task_id}"]`);
          const targetElement = document.querySelector(`[data-id="${dep.dependent_task_id}"]`);

          if (sourceElement && targetElement) {
            const sourceBounds = sourceElement.getBoundingClientRect();
            const targetBounds = targetElement.getBoundingClientRect();
            const containerBounds = containerEl!.getBoundingClientRect();

            // Arrow goes from END of dependency task to START of dependent task
            const sourceX = sourceBounds.right - containerBounds.left;
            const sourceY = sourceBounds.top + sourceBounds.height / 2 - containerBounds.top;
            const targetX = targetBounds.left - containerBounds.left;
            const targetY = targetBounds.top + targetBounds.height / 2 - containerBounds.top;

            // Create arrow path
            const path = createArrowPath(sourceX, sourceY, targetX, targetY, dep.dependency_type);
            
            if (path) {
              svgEl.appendChild(path);
            }
          }
        });
      } catch (error) {
        console.error('Failed to load task dependencies:', error);
      }
    };

    // Load dependencies after a delay to ensure DOM is ready
    const timeoutId = setTimeout(loadDependencies, 500);
    return () => clearTimeout(timeoutId);
  }, [tasks]);

  const createArrowPath = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    type: string
  ): SVGPathElement | null => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    let d: string;

    // If target starts before source ends (overlapping or backwards)
    if (x2 < x1 + 10) {
      // Draw line that goes around to avoid crossing
      const buffer = 20;
      const midY = (y1 + y2) / 2;
      d = `M ${x1} ${y1} L ${x1 + buffer} ${y1} L ${x1 + buffer} ${midY} L ${x2 - buffer} ${midY} L ${x2 - buffer} ${y2} L ${x2} ${y2}`;
    } else if (Math.abs(y1 - y2) < 5) {
      // Same row - straight line
      d = `M ${x1} ${y1} L ${x2} ${y2}`;
    } else {
      // Normal case - smooth curve from end to start
      const controlDist = Math.min(50, (x2 - x1) * 0.4);
      d = `M ${x1} ${y1} C ${x1 + controlDist} ${y1}, ${x2 - controlDist} ${y2}, ${x2} ${y2}`;
    }

    path.setAttribute('d', d);
    
    // Style based on dependency type
    switch (type) {
      case 'blocks':
        path.setAttribute('stroke', '#ef4444'); // Red for blocking
        path.setAttribute('marker-end', 'url(#arrowhead-red)');
        break;
      case 'follows':
        path.setAttribute('stroke', '#3b82f6'); // Blue for follows
        path.setAttribute('marker-end', 'url(#arrowhead-blue)');
        break;
      case 'related':
        path.setAttribute('stroke', '#6b7280'); // Gray for related
        path.setAttribute('stroke-dasharray', '5,5');
        path.setAttribute('marker-end', 'url(#arrowhead-gray)');
        break;
      default:
        path.setAttribute('stroke', '#6b7280');
        path.setAttribute('marker-end', 'url(#arrowhead-gray)');
    }

    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.7');
    path.classList.add('dependency-arrow', `dependency-${type}`);

    return path;
  };

  return (
    <div ref={containerRef} className="dependency-lines-container">
      <svg
        ref={svgRef}
        className="dependency-lines-svg"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        {/* Define arrowhead markers */}
        <defs>
          <marker
            id="arrowhead-red"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
          <marker
            id="arrowhead-blue"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
          </marker>
          <marker
            id="arrowhead-gray"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#6b7280" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
