import neo4j from 'neo4j-driver';
import { generateRegions, generateClusters, generateHosts, generateDatabases } from './generators/infrastructure';
import {
  generateTeams, generateCredentials, generateVendors, generateServices,
  generateServiceDependencies, generateDbRelations, generateCredentialRelations,
  generateVendorRelations, generateFailoverRelations,
} from './generators/services';
import { generateFeatures, generateCustomers, generateContracts } from './generators/business';
import { LANDMINE_DESCRIPTIONS } from './generators/landmines';

const RESET = process.argv.includes('--reset');

const uri = process.env.COGNODB_URI;
const user = process.env.COGNODB_USER;
const password = process.env.COGNODB_PASSWORD;
const database = process.env.COGNODB_DATABASE ?? 'neo4j';

if (!uri || !user || !password) {
  console.error('ERROR: Set COGNODB_URI, COGNODB_USER, COGNODB_PASSWORD in your .env file');
  process.exit(1);
}


const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function run(cypher: string, params: Record<string, unknown> = {}): Promise<void> {
  const session = driver.session({ database, defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

async function runBatch(cypher: string, rows: unknown[]): Promise<void> {
  const session = driver.session({ database, defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.run(cypher, { rows });
  } finally {
    await session.close();
  }
}

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

async function createConstraintsAndIndexes() {
  log('Creating constraints and indexes...');
  const statements = [
    'CREATE CONSTRAINT service_id  IF NOT EXISTS FOR (s:Service)    REQUIRE s.id IS UNIQUE',
    'CREATE CONSTRAINT database_id IF NOT EXISTS FOR (d:Database)   REQUIRE d.id IS UNIQUE',
    'CREATE CONSTRAINT host_id     IF NOT EXISTS FOR (h:Host)       REQUIRE h.id IS UNIQUE',
    'CREATE CONSTRAINT cluster_id  IF NOT EXISTS FOR (c:Cluster)    REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT region_id   IF NOT EXISTS FOR (r:Region)     REQUIRE r.id IS UNIQUE',
    'CREATE CONSTRAINT feature_id  IF NOT EXISTS FOR (f:Feature)    REQUIRE f.id IS UNIQUE',
    'CREATE CONSTRAINT customer_id IF NOT EXISTS FOR (c:Customer)   REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT contract_id IF NOT EXISTS FOR (c:Contract)   REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT vendor_id   IF NOT EXISTS FOR (v:Vendor)     REQUIRE v.id IS UNIQUE',
    'CREATE CONSTRAINT cred_id     IF NOT EXISTS FOR (c:Credential) REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT team_id     IF NOT EXISTS FOR (t:Team)       REQUIRE t.id IS UNIQUE',
    'CREATE INDEX service_name IF NOT EXISTS FOR (s:Service)  ON (s.name)',
    'CREATE INDEX database_name IF NOT EXISTS FOR (d:Database) ON (d.name)',
    'CREATE INDEX customer_name IF NOT EXISTS FOR (c:Customer) ON (c.name)',
  ];
  for (const stmt of statements) {
    await run(stmt);
  }
  log('Constraints and indexes ready.');
}

async function resetData() {
  log('Resetting existing data (batched DETACH DELETE)...');
  const labels = ['Contract', 'Customer', 'Feature', 'Vendor', 'Credential',
    'Service', 'Database', 'Host', 'Cluster', 'Region', 'Team'];
  for (const label of labels) {
    let deleted = 1;
    while (deleted > 0) {
      const session = driver.session({ database, defaultAccessMode: neo4j.session.WRITE });
      try {
        const result = await session.run(
          `MATCH (n:${label}) WITH n LIMIT 500 DETACH DELETE n RETURN count(n) AS deleted`,
        );
        deleted = (result.records[0]?.get('deleted') as number) ?? 0;
        if (deleted > 0) log(`  Deleted ${deleted} ${label} nodes`);
      } finally {
        await session.close();
      }
    }
  }
  log('Reset complete.');
}

async function seedInfrastructure() {
  log('Seeding infrastructure (regions, clusters, hosts, databases)...');

  const regions = generateRegions();
  const clusters = generateClusters(regions);
  const hosts = generateHosts(clusters);
  const databases = generateDatabases(hosts);

  await runBatch(
    'UNWIND $rows AS row CREATE (r:Region {id: row.id, name: row.name, provider: row.provider})',
    regions,
  );
  log(`  ${regions.length} regions`);

  await runBatch(
    'UNWIND $rows AS row CREATE (c:Cluster {id: row.id, name: row.name, nodeCount: row.nodeCount})',
    clusters,
  );
  // LOCATED_IN region
  await runBatch(
    `UNWIND $rows AS row
     MATCH (c:Cluster {id: row.id}), (r:Region {id: row.regionId})
     CREATE (c)-[:LOCATED_IN]->(r)`,
    clusters,
  );
  log(`  ${clusters.length} clusters`);

  await runBatch(
    'UNWIND $rows AS row CREATE (h:Host {id: row.id, name: row.name, type: row.type})',
    hosts,
  );
  // PART_OF cluster + LOCATED_IN region
  await runBatch(
    `UNWIND $rows AS row
     MATCH (h:Host {id: row.id}), (c:Cluster {id: row.clusterId}), (r:Region {id: row.regionId})
     CREATE (h)-[:PART_OF]->(c)
     CREATE (h)-[:LOCATED_IN]->(r)`,
    hosts,
  );
  log(`  ${hosts.length} hosts`);

  await runBatch(
    `UNWIND $rows AS row
     CREATE (d:Database {id: row.id, name: row.name, engine: row.engine})`,
    databases,
  );
  await runBatch(
    `UNWIND $rows AS row
     MATCH (d:Database {id: row.id}), (h:Host {id: row.hostId}), (c:Cluster {id: row.clusterId})
     CREATE (d)-[:HOSTED_ON]->(h)
     CREATE (d)-[:PART_OF]->(c)`,
    databases,
  );
  log(`  ${databases.length} databases`);

  return { regions, clusters, hosts, databases };
}

async function seedServices() {
  log('Seeding services, teams, credentials, vendors...');

  const teams = generateTeams();
  const credentials = generateCredentials();
  const vendors = generateVendors();
  const services = generateServices([]);  // hosts not needed — IDs are hardcoded

  await runBatch(
    'UNWIND $rows AS row CREATE (t:Team {id: row.id, name: row.name, oncallRotation: row.oncallRotation})',
    teams,
  );
  log(`  ${teams.length} teams`);

  await runBatch(
    `UNWIND $rows AS row
     CREATE (c:Credential {id: row.id, name: row.name, type: row.type, expiresAt: row.expiresAt})`,
    credentials,
  );
  log(`  ${credentials.length} credentials`);

  await runBatch(
    'UNWIND $rows AS row CREATE (v:Vendor {id: row.id, name: row.name, category: row.category})',
    vendors,
  );
  log(`  ${vendors.length} vendors`);

  await runBatch(
    `UNWIND $rows AS row
     CREATE (s:Service {id: row.id, name: row.name, tier: row.tier, language: row.language, owner: row.owner})`,
    services,
  );
  // HOSTED_ON + OWNED_BY
  await runBatch(
    `UNWIND $rows AS row
     MATCH (s:Service {id: row.id}), (h:Host {id: row.hostId}), (t:Team {id: row.teamId})
     CREATE (s)-[:HOSTED_ON]->(h)
     CREATE (s)-[:OWNED_BY]->(t)`,
    services,
  );
  log(`  ${services.length} services`);

  // Service → Service dependencies
  const deps = generateServiceDependencies();
  await runBatch(
    `UNWIND $rows AS row
     MATCH (a:Service {id: row.fromId}), (b:Service {id: row.toId})
     CREATE (a)-[:DEPENDS_ON {criticality: row.criticality, activeWindow: row.activeWindow, protocol: row.protocol}]->(b)`,
    deps,
  );
  log(`  ${deps.length} service dependencies`);

  // DB relations
  const dbRels = generateDbRelations();
  const reads = dbRels.filter(r => r.type === 'READS_FROM');
  const writes = dbRels.filter(r => r.type === 'WRITES_TO');

  await runBatch(
    `UNWIND $rows AS row
     MATCH (s:Service {id: row.serviceId}), (d:Database {id: row.dbId})
     CREATE (s)-[:READS_FROM {criticality: row.criticality, activeWindow: row.activeWindow}]->(d)`,
    reads,
  );
  await runBatch(
    `UNWIND $rows AS row
     MATCH (s:Service {id: row.serviceId}), (d:Database {id: row.dbId})
     CREATE (s)-[:WRITES_TO {criticality: row.criticality, activeWindow: row.activeWindow}]->(d)`,
    writes,
  );
  log(`  ${dbRels.length} database relations`);

  // Credential relations
  const credRels = generateCredentialRelations();
  await runBatch(
    `UNWIND $rows AS row
     MATCH (s:Service {id: row.serviceId}), (c:Credential {id: row.credentialId})
     CREATE (s)-[:AUTHENTICATES_WITH {criticality: row.criticality}]->(c)`,
    credRels,
  );
  log(`  ${credRels.length} credential relations`);

  // Vendor relations
  const vendorRels = generateVendorRelations();
  await runBatch(
    `UNWIND $rows AS row
     MATCH (s:Service {id: row.serviceId}), (v:Vendor {id: row.vendorId})
     CREATE (s)-[:CALLS_VENDOR {criticality: row.criticality, activeWindow: row.activeWindow, hasFallback: row.hasFallback}]->(v)`,
    vendorRels,
  );
  log(`  ${vendorRels.length} vendor relations`);

  // Failover relations (the shared-fate landmine)
  const failoverRels = generateFailoverRelations();
  await runBatch(
    `UNWIND $rows AS row
     MATCH (a:Service {id: row.primaryId}), (b:Service {id: row.failoverId})
     CREATE (a)-[:FAILS_OVER_TO]->(b)`,
    failoverRels,
  );
  log(`  ${failoverRels.length} failover relations (shared-fate landmines)`);
}

async function seedBusiness() {
  log('Seeding features, customers, contracts...');

  const features = generateFeatures();
  const customers = generateCustomers();
  const contracts = generateContracts(customers);

  await runBatch(
    `UNWIND $rows AS row
     CREATE (f:Feature {id: row.id, name: row.name, description: row.description, userFacing: row.userFacing})`,
    features,
  );
  // POWERS relations
  for (const feature of features) {
    if (feature.poweredBy.length === 0) continue;
    await runBatch(
      `UNWIND $rows AS row
       MATCH (s:Service {id: row.serviceId}), (f:Feature {id: row.featureId})
       CREATE (s)-[:POWERS {criticality: 'hard'}]->(f)`,
      feature.poweredBy.map(svcId => ({ serviceId: svcId, featureId: feature.id })),
    );
  }
  log(`  ${features.length} features`);

  // Customers in batches of 50
  const BATCH = 50;
  for (let i = 0; i < customers.length; i += BATCH) {
    const batch = customers.slice(i, i + BATCH);
    await runBatch(
      `UNWIND $rows AS row
       CREATE (c:Customer {id: row.id, name: row.name, tier: row.tier, userCount: row.userCount})`,
      batch,
    );
  }
  // USES relations
  for (const customer of customers) {
    await runBatch(
      `UNWIND $rows AS row
       MATCH (c:Customer {id: row.customerId}), (f:Feature {id: row.featureId})
       CREATE (c)-[:USES]->(f)`,
      customer.usesFeatureIds.map(fId => ({ customerId: customer.id, featureId: fId })),
    );
  }
  log(`  ${customers.length} customers`);

  // Contracts
  for (let i = 0; i < contracts.length; i += BATCH) {
    const batch = contracts.slice(i, i + BATCH);
    await runBatch(
      `UNWIND $rows AS row
       MATCH (c:Customer {id: row.customerId})
       CREATE (ct:Contract {id: row.id, value: row.value, renewalDate: row.renewalDate, slaUptime: row.slaUptime})
       CREATE (c)-[:HAS_CONTRACT]->(ct)`,
      batch,
    );
  }
  log(`  ${contracts.length} contracts`);
}

async function printSummary() {
  log('\n--- Seed summary ---');
  const session = driver.session({ database, defaultAccessMode: neo4j.session.READ });
  try {
    const nodeResult = await session.run(
      `MATCH (n)
       WITH labels(n)[0] AS label, count(n) AS cnt
       RETURN label, cnt ORDER BY cnt DESC`,
    );
    nodeResult.records.forEach(r => {
      log(`  ${r.get('label')}: ${r.get('cnt')} nodes`);
    });

    const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) AS total');
    log(`  Total relationships: ${relResult.records[0]?.get('total')}`);
  } finally {
    await session.close();
  }

  log('\nPlanted landmines:');
  LANDMINE_DESCRIPTIONS.forEach(lm => {
    log(`  [${lm.id}] ${lm.title}`);
    log(`    → ${lm.query}`);
  });
}

async function main() {
  try {
    await driver.verifyConnectivity();
    log('Connected to CognoDB.');

    await createConstraintsAndIndexes();

    if (RESET) {
      await resetData();
    }

    await seedInfrastructure();
    await seedServices();
    await seedBusiness();
    await printSummary();

    log('\nSeed complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

main();
