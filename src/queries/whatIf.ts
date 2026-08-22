import { z } from 'zod';
import { runRead } from '@/lib/db';
import type { AffectedNode } from '@/lib/types';

export const WhatIfInput = z.object({
  id: z.string().min(1).max(200),
  maxHops: z.number().int().min(1).max(6).default(4),
  simulatedDownIds: z.array(z.string().max(200)).max(20).default([]),
});
export type WhatIfInput = z.infer<typeof WhatIfInput>;

// Q6 — What-if / planned deprecation.
// Same traversal as blast radius but excludes any node in simulatedDownIds from the path.
// This lets you answer "what breaks if I take X and Y out at the same time?"
// without touching the database.
const CYPHER = `
MATCH path = (target {id: $id})<-[*1..6]-(affected)
WHERE NOT any(n IN nodes(path) WHERE n.id IN $simulatedDownIds AND n.id <> $id)
WITH affected, min(length(path)) AS hops
RETURN labels(affected)[0] AS type, affected.name AS name, hops
ORDER BY hops
LIMIT 200
`;

export async function whatIf(input: WhatIfInput): Promise<AffectedNode[]> {
  const result = await runRead(CYPHER, {
    id: input.id,
    simulatedDownIds: input.simulatedDownIds,
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
