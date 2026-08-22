import { z } from 'zod';
import { runRead } from '@/lib/db';
import type { SearchResult } from '@/lib/types';

export const SearchInput = z.object({
  q: z.string().min(1).max(100),
});
export type SearchInput = z.infer<typeof SearchInput>;

// Searches across Service, Database, Credential, and Vendor by name (case-insensitive).
// Returns up to 20 results for the typeahead on the landing page.
const CYPHER = `
MATCH (n)
WHERE (n:Service OR n:Database OR n:Credential OR n:Vendor OR n:Cluster)
  AND toLower(n.name) CONTAINS toLower($q)
RETURN labels(n)[0] AS type, n.id AS id, n.name AS name,
       coalesce(n.tier, n.engine, n.category, n.type, '') AS extra
ORDER BY n.name
LIMIT 20
`;

export async function search(input: SearchInput): Promise<SearchResult[]> {
  const result = await runRead(CYPHER, { q: input.q });

  return result.records.map(r => ({
    type: r.get('type'),
    id: r.get('id'),
    name: r.get('name'),
    extra: r.get('extra') ?? '',
  }));
}
