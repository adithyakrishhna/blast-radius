import { z } from 'zod';
import { runRead } from '@/lib/db';
import type { BusinessImpact } from '@/lib/types';

export const BusinessImpactInput = z.object({
  id: z.string().min(1).max(200),
  maxHops: z.number().int().min(1).max(6).default(4),
});
export type BusinessImpactInput = z.infer<typeof BusinessImpactInput>;

// Q3 — Translates a technical failure into plain-English business numbers.
// Traverses up to the component, then follows Service → Feature → Customer → Contract.
const CYPHER = `
MATCH (target {id: $id})<-[*1..6]-(s:Service)-[:POWERS]->(f:Feature)
MATCH (c:Customer)-[:USES]->(f)
OPTIONAL MATCH (c)-[:HAS_CONTRACT]->(ct:Contract)
RETURN
  collect(DISTINCT f.name)     AS brokenFeatures,
  count(DISTINCT c)            AS customersAffected,
  sum(DISTINCT ct.value)       AS contractValueAtRisk,
  collect(DISTINCT c.name)[..10] AS sampleCustomers
`;

export async function businessImpact(input: BusinessImpactInput): Promise<BusinessImpact> {
  const result = await runRead(CYPHER, { id: input.id });
  const r = result.records[0];

  return {
    brokenFeatures: r?.get('brokenFeatures') ?? [],
    customersAffected: Number(r?.get('customersAffected') ?? 0),
    contractValueAtRisk: Number(r?.get('contractValueAtRisk') ?? 0),
    sampleCustomers: r?.get('sampleCustomers') ?? [],
  };
}
