import { z } from 'zod';
import { runRead } from '@/lib/db';
import type { AffectedNode } from '@/lib/types';

export const BlastRadiusInput = z.object({
  id: z.string().min(1).max(200),
  maxHops: z.number().int().min(1).max(6).default(4),
  criticalities: z.array(z.enum(['hard', 'soft'])).min(1).default(['hard', 'soft']),
});
export type BlastRadiusInput = z.infer<typeof BlastRadiusInput>;

// Q1 — Multi-hop traversal: everything that depends on the target component.
// Depth hardcoded to *1..6 — CognoDB does not support parameterised path depth.
// The caller's maxHops filters the returned rows after the query.
const CYPHER = `
MATCH path = (target {id: $id})<-[r:DEPENDS_ON|READS_FROM|WRITES_TO|AUTHENTICATES_WITH|CALLS_VENDOR*1..6]-(affected)
WHERE ALL(rel IN relationships(path) WHERE rel.criticality IN $criticalities)
WITH affected, min(length(path)) AS hops
RETURN labels(affected)[0] AS type, affected.id AS id, affected.name AS name, hops
ORDER BY hops ASC, affected.name
LIMIT 200
`;

export async function blastRadius(input: BlastRadiusInput): Promise<AffectedNode[]> {
  const result = await runRead(CYPHER, {
    id: input.id,
    criticalities: input.criticalities,
  });

  return result.records
    .map(r => ({
      type: r.get('type'),
      id: r.get('id'),
      name: r.get('name'),
      hops: Number(r.get('hops')),
    }))
    .filter(n => n.hops <= input.maxHops);
}
