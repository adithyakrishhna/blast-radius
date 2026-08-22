import { z } from 'zod';
import { runRead } from '@/lib/db';
import type { DependencyChain } from '@/lib/types';

export const ChainExplainInput = z.object({
  targetId: z.string().min(1).max(200),
  affectedId: z.string().min(1).max(200),
});
export type ChainExplainInput = z.infer<typeof ChainExplainInput>;

// Q4 — Returns the shortest path between two nodes as a readable chain.
// This is the "why is this affected?" proof shown alongside the blast radius list.
const CYPHER = `
MATCH (target {id: $targetId}), (affected {id: $affectedId})
MATCH path = shortestPath((affected)-[*1..6]->(target))
RETURN
  [n IN nodes(path) | {type: labels(n)[0], name: n.name}] AS chain,
  [r IN relationships(path) | type(r)]                     AS links,
  length(path)                                             AS hops
`;

export async function chainExplain(input: ChainExplainInput): Promise<DependencyChain | null> {
  const result = await runRead(CYPHER, {
    targetId: input.targetId,
    affectedId: input.affectedId,
  });

  const r = result.records[0];
  if (!r) return null;

  return {
    chain: r.get('chain'),
    links: r.get('links'),
    hops: Number(r.get('hops')),
  };
}
