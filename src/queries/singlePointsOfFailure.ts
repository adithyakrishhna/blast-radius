import { runRead } from '@/lib/db';
import type { SinglePointOfFailure } from '@/lib/types';

// Q7 — Rank components by business impact if they failed.
// Used on the landing page to show the most dangerous nodes at a glance.
// Depth capped at 4 to stay under 2s on the free-tier instance.
const CYPHER = `
MATCH (n)
WHERE n:Service OR n:Database OR n:Credential OR n:Vendor OR n:Cluster
OPTIONAL MATCH (n)<-[*1..4]-(s:Service)-[:POWERS]->(f:Feature)<-[:USES]-(c:Customer)-[:HAS_CONTRACT]->(ct:Contract)
WITH n, count(DISTINCT c) AS customers, sum(DISTINCT ct.value) AS value
WHERE customers > 0
RETURN labels(n)[0] AS type, n.id AS id, n.name AS name, customers, value
ORDER BY value DESC
LIMIT 25
`;

export async function singlePointsOfFailure(): Promise<SinglePointOfFailure[]> {
  const result = await runRead(CYPHER);

  return result.records.map(r => ({
    type: r.get('type'),
    id: r.get('id'),
    name: r.get('name'),
    customers: Number(r.get('customers')),
    value: Number(r.get('value')),
  }));
}
