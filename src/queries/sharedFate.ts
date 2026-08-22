import { runRead } from '@/lib/db';
import type { SharedFateFinding } from '@/lib/types';

// Q2 — The headline feature.
// Finds pairs of services where one is a FAILS_OVER_TO of the other,
// yet both reach the same shared node (DB, credential, cluster, etc.).
// This is the "your backup was never really a backup" query.
// No clean SQL equivalent: requires bidirectional graph traversal and shared-ancestor intersection.
const CYPHER = `
MATCH (a:Service)-[:FAILS_OVER_TO]->(b:Service)
MATCH pathA = (a)-[:DEPENDS_ON|READS_FROM|WRITES_TO|HOSTED_ON|PART_OF|LOCATED_IN|AUTHENTICATES_WITH*1..6]->(shared)
MATCH pathB = (b)-[:DEPENDS_ON|READS_FROM|WRITES_TO|HOSTED_ON|PART_OF|LOCATED_IN|AUTHENTICATES_WITH*1..6]->(shared)
WHERE a <> b
RETURN
  a.name                  AS primary,
  b.name                  AS failover,
  labels(shared)[0]       AS sharedType,
  shared.name             AS sharedResource,
  min(length(pathA))      AS hopsFromPrimary,
  min(length(pathB))      AS hopsFromFailover
ORDER BY hopsFromPrimary ASC
LIMIT 50
`;

export async function sharedFate(): Promise<SharedFateFinding[]> {
  const result = await runRead(CYPHER);

  return result.records.map(r => ({
    primary: r.get('primary'),
    failover: r.get('failover'),
    sharedType: r.get('sharedType'),
    sharedResource: r.get('sharedResource'),
    hopsFromPrimary: Number(r.get('hopsFromPrimary')),
    hopsFromFailover: Number(r.get('hopsFromFailover')),
  }));
}
