import type { AffectedNode } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

// Groups affected nodes by hop distance and renders each group.
export function ChainList({ nodes }: { nodes: AffectedNode[] }) {
  if (nodes.length === 0) return null;

  const byHop = nodes.reduce<Record<number, AffectedNode[]>>((acc, n) => {
    if (!acc[n.hops]) acc[n.hops] = [];
    acc[n.hops].push(n);
    return acc;
  }, {});

  const hopLabels: Record<number, string> = {
    1: 'Direct impact',
    2: '2 hops away',
    3: '3 hops away',
    4: '4 hops away',
    5: '5 hops away',
    6: '6 hops away',
  };

  return (
    <div className="space-y-6">
      {Object.entries(byHop).map(([hop, nodes]) => (
        <div key={hop}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {hopLabels[Number(hop)] ?? `${hop} hops away`}
          </p>
          <div className="space-y-1">
            {nodes.map(n => (
              <a
                key={n.id || n.name}
                href={n.id ? `/component/${n.id}` : '#'}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Badge variant={n.type as never}>{n.type}</Badge>
                <span className="font-mono">{n.name}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
