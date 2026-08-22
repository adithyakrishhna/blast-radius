import Link from 'next/link';
import type { AffectedNode } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

const HOP_RING: Record<number, string> = {
  1: 'border-l-4 border-orange-400',
  2: 'border-l-4 border-amber-400',
  3: 'border-l-4 border-yellow-300',
  4: 'border-l-4 border-green-400',
  5: 'border-l-4 border-blue-400',
  6: 'border-l-4 border-zinc-300',
};

const HOP_LABELS: Record<number, string> = {
  1: 'Direct impact — 1 hop',
  2: '2 hops away',
  3: '3 hops away',
  4: '4 hops away',
  5: '5 hops away',
  6: '6 hops away',
};

export function ChainList({ nodes }: { nodes: AffectedNode[] }) {
  if (nodes.length === 0) return null;

  const byHop = nodes.reduce<Record<number, AffectedNode[]>>((acc, n) => {
    (acc[n.hops] ??= []).push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(byHop)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([hop, group]) => (
          <div key={hop}>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
              {HOP_LABELS[Number(hop)] ?? `${hop} hops away`}
              <span className="ml-2 font-normal text-zinc-300">({group.length})</span>
            </p>
            <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden">
              {group.map((n, i) => (
                <Link
                  key={n.id || n.name}
                  href={n.id ? `/component/${n.id}` : '#'}
                  className={`flex items-center gap-3 px-4 py-3 text-sm text-zinc-700
                    hover:bg-amber-50 hover:text-zinc-900
                    active:bg-amber-100 active:scale-[0.99]
                    transition-all duration-150
                    ${HOP_RING[Number(hop)] ?? ''}
                    ${i > 0 ? 'border-t border-zinc-100' : ''}`}
                >
                  <Badge variant={n.type as never}>{n.type}</Badge>
                  <span className="font-mono font-medium text-zinc-900">{n.name}</span>
                  <span className="ml-auto text-xs text-zinc-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
