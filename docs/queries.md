# Cypher Queries

All queries are parameterised via the official Neo4j driver. No string concatenation into Cypher anywhere in the codebase. Path depth is hardcoded to a maximum of 6 — CognoDB does not support parameterised path ranges (`*1..$n`); the application layer enforces user-supplied depth limits by filtering results.

---

## Q1 — Blast radius (multi-hop traversal)

**What it answers:** Everything that breaks if this component fails, with hop distance.

**Why it requires a graph:** The chain from a database to a customer contract crosses heterogeneous node types (Database → Service → Feature → Customer → Contract). In SQL, each hop requires a JOIN across a different table, and the depth is unknown at query time — requiring a recursive CTE that materialises every intermediate result set.

```cypher
MATCH path = (target {id: $id})<-[r:DEPENDS_ON|READS_FROM|WRITES_TO|AUTHENTICATES_WITH|CALLS_VENDOR*1..6]-(affected)
WHERE ALL(rel IN relationships(path) WHERE rel.criticality IN $criticalities)
WITH affected, min(length(path)) AS hops
RETURN labels(affected)[0] AS type, affected.id, affected.name, hops
ORDER BY hops ASC, affected.name
LIMIT 200
```

**Parameters:** `$id` (target node ID), `$criticalities` (`["hard"]` or `["hard","soft"]`)

---

## Q2 — Shared fate (the headline query)

**What it answers:** Two services configured as failovers for each other that secretly share a common dependency — making the failover useless.

**Why it's awkward for SQL:** This requires bidirectional graph traversal from two nodes, intersecting at shared ancestors. In SQL: two recursive CTEs on both sides, a JOIN on the intersection, and an application-side graph walk to find ancestor overlap. In Cypher, it is three MATCH clauses.

```cypher
MATCH (a:Service)-[:FAILS_OVER_TO]->(b:Service)
MATCH pathA = (a)-[:DEPENDS_ON|READS_FROM|WRITES_TO|HOSTED_ON|PART_OF|LOCATED_IN|AUTHENTICATES_WITH*1..6]->(shared)
MATCH pathB = (b)-[:DEPENDS_ON|READS_FROM|WRITES_TO|HOSTED_ON|PART_OF|LOCATED_IN|AUTHENTICATES_WITH*1..6]->(shared)
WHERE a <> b
RETURN a.name AS primary,
       b.name AS failover,
       labels(shared)[0] AS sharedType,
       shared.name AS sharedResource,
       min(length(pathA)) AS hopsFromPrimary,
       min(length(pathB)) AS hopsFromFailover
ORDER BY hopsFromPrimary ASC
LIMIT 50
```

### The SQL equivalent (for comparison)

The equivalent in Postgres requires two recursive CTEs and a self-join at the intersection. This is the query the README leads with to justify the graph database choice:

```sql
-- Step 1: find all ancestors of the primary service
WITH RECURSIVE ancestors_a AS (
  SELECT to_id AS node_id, 1 AS depth
  FROM dependencies WHERE from_id = 'svc-payment'
  UNION ALL
  SELECT d.to_id, a.depth + 1
  FROM dependencies d
  JOIN ancestors_a a ON d.from_id = a.node_id
  WHERE a.depth < 6
),
-- Step 2: find all ancestors of the failover service
ancestors_b AS (
  SELECT to_id AS node_id, 1 AS depth
  FROM dependencies WHERE from_id = 'svc-payment-eu'
  UNION ALL
  SELECT d.to_id, b.depth + 1
  FROM dependencies d
  JOIN ancestors_b b ON d.from_id = b.node_id
  WHERE b.depth < 6
)
-- Step 3: intersect — nodes reachable from both
SELECT a.node_id, a.depth AS hops_from_primary, b.depth AS hops_from_failover
FROM ancestors_a a
JOIN ancestors_b b ON a.node_id = b.node_id
ORDER BY a.depth;
-- This only covers one relationship type. For six types across heterogeneous
-- tables, multiply the CTE complexity accordingly.
```

The Cypher version handles all relationship types, any depth, and heterogeneous node types in a single readable query.

---

## Q3 — Business impact

**What it answers:** Translates a technical failure into customers and money.

```cypher
MATCH (target {id: $id})<-[*1..6]-(s:Service)-[:POWERS]->(f:Feature)
MATCH (c:Customer)-[:USES]->(f)
OPTIONAL MATCH (c)-[:HAS_CONTRACT]->(ct:Contract)
RETURN collect(DISTINCT f.name)       AS brokenFeatures,
       count(DISTINCT c)              AS customersAffected,
       sum(DISTINCT ct.value)         AS contractValueAtRisk,
       collect(DISTINCT c.name)[..10] AS sampleCustomers
```

**Parameters:** `$id`

---

## Q4 — Explain the chain

**What it answers:** The exact shortest path between two nodes — the "why is this affected?" proof.

```cypher
MATCH (target {id: $targetId}), (affected {id: $affectedId})
MATCH path = shortestPath((affected)-[*1..6]->(target))
RETURN [n IN nodes(path) | {type: labels(n)[0], name: n.name}] AS chain,
       [r IN relationships(path) | type(r)]                     AS links,
       length(path)                                             AS hops
```

**Parameters:** `$targetId`, `$affectedId`

---

## Q5 — Time-windowed blast radius

**What it answers:** The 3am blast radius is a genuinely different graph from the 2pm one. Only traverses edges whose `activeWindow` is currently active.

**Why no commercial tool has this:** Dependency edges carry an `activeWindow` property. Nightly batch jobs, weekly reports, and business-hours-only services are invisible in a live traffic map but are exactly the dependencies that fail silently at 3am.

```cypher
MATCH path = (target {id: $id})<-[*1..6]-(affected)
WHERE ALL(r IN relationships(path) WHERE r.activeWindow IN $activeWindows)
WITH affected, min(length(path)) AS hops
RETURN labels(affected)[0] AS type, affected.name, hops
ORDER BY hops
LIMIT 200
```

**Parameters:** `$id`, `$activeWindows` (e.g. `["always"]` for 3am, `["always","business-hours"]` for 2pm)

---

## Q6 — What-if / planned deprecation

**What it answers:** Same as blast radius, but with one or more nodes treated as already down — without touching the database.

```cypher
MATCH path = (target {id: $id})<-[*1..6]-(affected)
WHERE NOT any(n IN nodes(path) WHERE n.id IN $simulatedDownIds AND n.id <> $id)
WITH affected, min(length(path)) AS hops
RETURN labels(affected)[0] AS type, affected.name, hops
ORDER BY hops
LIMIT 200
```

**Parameters:** `$id`, `$simulatedDownIds` (list of node IDs to treat as removed)

---

## Q7 — Single points of failure, ranked

**What it answers:** Which components would hurt most if they failed right now. Used on the landing page.

```cypher
MATCH (n)
WHERE n:Service OR n:Database OR n:Credential OR n:Vendor OR n:Cluster
OPTIONAL MATCH (n)<-[*1..4]-(s:Service)-[:POWERS]->(f:Feature)<-[:USES]-(c:Customer)-[:HAS_CONTRACT]->(ct:Contract)
WITH n, count(DISTINCT c) AS customers, sum(DISTINCT ct.value) AS value
WHERE customers > 0
RETURN labels(n)[0] AS type, n.id, n.name, customers, value
ORDER BY value DESC
LIMIT 25
```

Depth capped at 4 (not 6) to stay under 2 seconds on the free-tier instance.
