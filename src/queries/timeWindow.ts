import { z } from 'zod';
import { runRead } from '@/lib/db';
import type { AffectedNode } from '@/lib/types';

export const TimeWindowInput = z.object({
  id: z.string().min(1).max(200),
  maxHops: z.number().int().min(1).max(6).default(4),
  activeWindows: z
    .array(z.enum(['always', 'business-hours', 'nightly', 'weekly']))
    .min(1)
    .default(['always']),
});
export type TimeWindowInput = z.infer<typeof TimeWindowInput>;

// Q5 — Time-aware blast radius.
// The 3am graph is a different graph from the 2pm graph.
// Only traverses relationships whose activeWindow matches what's currently active.
// This is the differentiator no commercial tool has.
const CYPHER = `
MATCH path = (target {id: $id})<-[*1..6]-(affected)
WHERE ALL(r IN relationships(path) WHERE r.activeWindow IN $activeWindows)
WITH affected, min(length(path)) AS hops
RETURN labels(affected)[0] AS type, affected.name AS name, hops
ORDER BY hops
LIMIT 200
`;

export async function timeWindow(input: TimeWindowInput): Promise<AffectedNode[]> {
  const result = await runRead(CYPHER, {
    id: input.id,
    activeWindows: input.activeWindows,
  });

  return result.records
    .map(r => ({
      type: r.get('type'),
      id: '',
      name: r.get('name'),
      hops: Number(r.get('hops')),
    }))
    .filter(n => n.hops <= input.maxHops);
}
