import type { NodeLabel } from '../types';

interface NodeLabelsLayerProps {
  labels: NodeLabel[];
}

export function NodeLabelsLayer({ labels }: NodeLabelsLayerProps) {
  return (
    <>
      {labels.map((label) => (
        <div
          key={label.id}
          className="absolute pointer-events-none text-xs bg-card/95 backdrop-blur-sm border border-border px-1 py-0.5 rounded whitespace-nowrap z-10"
          style={{ left: label.x, top: label.y, fontSize: `${label.size}px` }}
        >
          {label.name}
        </div>
      ))}
    </>
  );
}
