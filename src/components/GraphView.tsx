'use client';

import { useEffect, useRef } from 'react';
import type { AffectedNode } from '@/lib/types';

// Hop-distance colour scale — bold near, fades with distance
const HOP_COLORS: Record<number, string> = {
  0: '#ef4444', // target — red
  1: '#f97316', // hop 1 — orange
  2: '#eab308', // hop 2 — amber
  3: '#22c55e', // hop 3 — green
  4: '#3b82f6', // hop 4 — blue
  5: '#8b5cf6', // hop 5 — violet
  6: '#6b7280', // hop 6 — grey
};

interface Props {
  targetId: string;
  targetName: string;
  nodes: AffectedNode[];
}

export function GraphView({ targetId, targetName, nodes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamically import to avoid SSR
    import('react-force-graph-2d').then(mod => {
      const ForceGraph2D = mod.default;

      const graphNodes = [
        { id: targetId, name: targetName, hops: 0 },
        ...nodes.map(n => ({ id: n.id || n.name, name: n.name, hops: n.hops, type: n.type })),
      ];

      const graphLinks = nodes.map(n => ({
        source: n.id || n.name,
        target: targetId,
      }));

      if (graphRef.current) return; // already mounted

      const elem = document.createElement('div');
      containerRef.current!.appendChild(elem);

      // @ts-expect-error dynamic import
      graphRef.current = ForceGraph2D({
        width: containerRef.current!.clientWidth,
        height: 420,
      })(elem)
        .graphData({ nodes: graphNodes, links: graphLinks })
        .nodeLabel((n: { name: string }) => n.name)
        .nodeColor((n: { hops: number }) => HOP_COLORS[n.hops] ?? HOP_COLORS[6])
        .nodeRelSize(6)
        .linkColor(() => '#d1d5db')
        .linkWidth(1)
        .onNodeClick((n: { id: string }) => {
          if (n.id !== targetId) window.location.href = `/component/${n.id}`;
        });
    });

    return () => {
      if (graphRef.current) {
        // @ts-expect-error dynamic import
        graphRef.current._destructor?.();
        graphRef.current = null;
      }
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [targetId, targetName, nodes]);

  return (
    <div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden bg-zinc-50 border border-zinc-200" style={{ height: 420 }} />
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
        {Object.entries(HOP_COLORS).map(([hop, color]) => (
          <span key={hop} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {hop === '0' ? 'Target' : `${hop} hop${Number(hop) > 1 ? 's' : ''}`}
          </span>
        ))}
      </div>
    </div>
  );
}
