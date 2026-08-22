import neo4j from 'neo4j-driver';

const uri = process.env.COGNODB_URI;
const user = process.env.COGNODB_USER;
const password = process.env.COGNODB_PASSWORD;
const database = process.env.COGNODB_DATABASE ?? 'neo4j';

if (!uri || !user || !password) {
  console.error('ERROR: Set COGNODB_URI, COGNODB_USER, COGNODB_PASSWORD in your .env file');
  process.exit(1);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

type QueryDef = { name: string; cypher: string; params: Record<string, unknown> };

const queries: QueryDef[] = [
  {
    name: 'Q1 — Blast radius (multi-hop)',
    cypher: `MATCH path = (target {id: $id})<-[r:DEPENDS_ON|READS_FROM|WRITES_TO|AUTHENTICATES_WITH|CALLS_VENDOR*1..$maxHops]-(affected)
             WHERE ALL(rel IN relationships(path) WHERE rel.criticality IN $criticalities)
             WITH affected, min(length(path)) AS hops
             RETURN labels(affected)[0] AS type, affected.id, affected.name, hops
             ORDER BY hops ASC, affected.name LIMIT 200`,
    params: { id: 'db-sessions', maxHops: 4, criticalities: ['hard', 'soft'] },
  },
  {
    name: 'Q2 — Shared fate',
    cypher: `MATCH (a:Service)-[:FAILS_OVER_TO]->(b:Service)
             MATCH pathA = (a)-[:DEPENDS_ON|READS_FROM|WRITES_TO|HOSTED_ON|PART_OF|LOCATED_IN|AUTHENTICATES_WITH*1..$maxHops]->(shared)
             MATCH pathB = (b)-[:DEPENDS_ON|READS_FROM|WRITES_TO|HOSTED_ON|PART_OF|LOCATED_IN|AUTHENTICATES_WITH*1..$maxHops]->(shared)
             WHERE a <> b
             RETURN a.name AS primary, b.name AS failover, labels(shared)[0] AS sharedType, shared.name AS sharedResource,
                    min(length(pathA)) AS hopsFromPrimary, min(length(pathB)) AS hopsFromFailover
             ORDER BY hopsFromPrimary ASC LIMIT 50`,
    params: { maxHops: 4 },
  },
  {
    name: 'Q3 — Business impact',
    cypher: `MATCH (target {id: $id})<-[*1..$maxHops]-(s:Service)-[:POWERS]->(f:Feature)
             MATCH (c:Customer)-[:USES]->(f)
             OPTIONAL MATCH (c)-[:HAS_CONTRACT]->(ct:Contract)
             RETURN collect(DISTINCT f.name) AS brokenFeatures,
                    count(DISTINCT c) AS customersAffected,
                    sum(DISTINCT ct.value) AS contractValueAtRisk,
                    collect(DISTINCT c.name)[..10] AS sampleCustomers`,
    params: { id: 'db-sessions', maxHops: 4 },
  },
  {
    name: 'Q4 — Explain the chain',
    cypher: `MATCH (target {id: $targetId}), (affected {id: $affectedId})
             MATCH path = shortestPath((affected)-[*1..$maxHops]->(target))
             RETURN [n IN nodes(path) | {type: labels(n)[0], name: n.name}] AS chain,
                    [r IN relationships(path) | type(r)] AS links,
                    length(path) AS hops`,
    params: { targetId: 'db-sessions', affectedId: 'svc-api-gateway', maxHops: 6 },
  },
  {
    name: 'Q5 — Time-windowed blast radius',
    cypher: `MATCH path = (target {id: $id})<-[rels*1..$maxHops]-(affected)
             WHERE ALL(r IN rels WHERE r.activeWindow IN $activeWindows)
             WITH affected, min(length(path)) AS hops
             RETURN labels(affected)[0] AS type, affected.name, hops
             ORDER BY hops LIMIT 200`,
    params: { id: 'db-payments', maxHops: 4, activeWindows: ['always'] },
  },
  {
    name: 'Q6 — What-if / planned deprecation',
    cypher: `MATCH path = (target {id: $id})<-[*1..$maxHops]-(affected)
             WHERE NOT any(n IN nodes(path) WHERE n.id IN $simulatedDownIds AND n.id <> $id)
             WITH affected, min(length(path)) AS hops
             RETURN labels(affected)[0] AS type, affected.name, hops
             ORDER BY hops LIMIT 200`,
    params: { id: 'db-sessions', maxHops: 4, simulatedDownIds: [] },
  },
  {
    name: 'Q7 — Single points of failure',
    cypher: `MATCH (n)
             WHERE n:Service OR n:Database OR n:Credential OR n:Vendor OR n:Cluster
             OPTIONAL MATCH (n)<-[*1..$maxHops]-(s:Service)-[:POWERS]->(f:Feature)<-[:USES]-(c:Customer)-[:HAS_CONTRACT]->(ct:Contract)
             WITH n, count(DISTINCT c) AS customers, sum(DISTINCT ct.value) AS value
             WHERE customers > 0
             RETURN labels(n)[0] AS type, n.id, n.name, customers, value
             ORDER BY value DESC LIMIT 25`,
    params: { maxHops: 4 },
  },
];

async function verify() {
  let failed = false;

  try {
    await driver.verifyConnectivity();
    console.log('[verify] Connected.\n');

    // Node counts
    const session = driver.session({ database, defaultAccessMode: neo4j.session.READ });
    try {
      const nodeResult = await session.run(
        `MATCH (n)
         WITH labels(n)[0] AS label, count(n) AS cnt
         RETURN label, cnt ORDER BY cnt DESC`,
      );
      console.log('Node counts:');
      let total = 0;
      nodeResult.records.forEach(r => {
        const cnt = r.get('cnt') as number;
        total += cnt;
        console.log(`  ${r.get('label')}: ${cnt}`);
      });
      console.log(`  TOTAL nodes: ${total}`);
      if (total < 100) {
        console.error('  ERROR: too few nodes — did seeding complete?');
        failed = true;
      }

      const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) AS total');
      const relTotal = relResult.records[0]?.get('total') as number;
      console.log(`  TOTAL relationships: ${relTotal}\n`);
    } finally {
      await session.close();
    }

    // Run all 7 queries
    for (const q of queries) {
      const s = driver.session({ database, defaultAccessMode: neo4j.session.READ });
      const start = Date.now();
      try {
        const result = await s.run(q.cypher, q.params);
        const elapsed = Date.now() - start;
        const rows = result.records.length;
        const status = rows > 0 ? 'OK' : 'WARN — zero rows!';
        console.log(`${q.name}: ${rows} rows in ${elapsed}ms [${status}]`);
        if (rows === 0) {
          console.error(`  Check that data is seeded and IDs match.`);
          failed = true;
        }
        if (elapsed > 2000) {
          console.warn(`  WARNING: query took ${elapsed}ms — consider adding indexes or reducing depth`);
        }
      } catch (err) {
        console.error(`${q.name}: FAILED — ${err}`);
        failed = true;
      } finally {
        await s.close();
      }
    }

    if (failed) {
      console.error('\nVerification FAILED. Fix issues above before proceeding.');
      process.exit(1);
    } else {
      console.log('\nAll checks passed.');
    }
  } catch (err) {
    console.error('Cannot connect to database:', err);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

verify();
