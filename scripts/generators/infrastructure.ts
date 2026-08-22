// Generates regions, clusters, hosts, and databases for the e-commerce estate

export interface Region {
  id: string;
  name: string;
  provider: 'aws' | 'gcp' | 'azure';
}

export interface Cluster {
  id: string;
  name: string;
  nodeCount: number;
  regionId: string;
}

export interface Host {
  id: string;
  name: string;
  type: 'vm' | 'pod' | 'bare-metal';
  clusterId: string;
  regionId: string;
}

export interface Database {
  id: string;
  name: string;
  engine: 'postgres' | 'redis' | 'mongo';
  clusterId: string;
  hostId: string;
}

export function generateRegions(): Region[] {
  return [
    { id: 'region-us-east', name: 'us-east-1', provider: 'aws' },
    { id: 'region-eu-west', name: 'eu-west-1', provider: 'aws' },
    { id: 'region-ap-south', name: 'asia-south1', provider: 'gcp' },
  ];
}

export function generateClusters(regions: Region[]): Cluster[] {
  return [
    { id: 'cluster-prod-us', name: 'prod-us-east', nodeCount: 12, regionId: 'region-us-east' },
    { id: 'cluster-prod-eu', name: 'prod-eu-west', nodeCount: 8, regionId: 'region-eu-west' },
    { id: 'cluster-prod-ap', name: 'prod-ap-south', nodeCount: 6, regionId: 'region-ap-south' },
    { id: 'cluster-db-us', name: 'db-us-east', nodeCount: 6, regionId: 'region-us-east' },
    { id: 'cluster-db-eu', name: 'db-eu-west', nodeCount: 4, regionId: 'region-eu-west' },
    { id: 'cluster-cache', name: 'cache-global', nodeCount: 4, regionId: 'region-us-east' },
  ];
}

export function generateHosts(clusters: Cluster[]): Host[] {
  const hosts: Host[] = [];

  const clusterHosts: Record<string, { count: number; type: Host['type'] }> = {
    'cluster-prod-us': { count: 8, type: 'pod' },
    'cluster-prod-eu': { count: 5, type: 'pod' },
    'cluster-prod-ap': { count: 4, type: 'pod' },
    'cluster-db-us': { count: 4, type: 'vm' },
    'cluster-db-eu': { count: 3, type: 'vm' },
    'cluster-cache': { count: 3, type: 'vm' },
  };

  for (const cluster of clusters) {
    const cfg = clusterHosts[cluster.id];
    if (!cfg) continue;
    for (let i = 1; i <= cfg.count; i++) {
      hosts.push({
        id: `host-${cluster.id}-${i}`,
        name: `${cluster.name}-node-${i}`,
        type: cfg.type,
        clusterId: cluster.id,
        regionId: cluster.regionId,
      });
    }
  }

  return hosts;
}

export function generateDatabases(hosts: Host[]): Database[] {
  const dbHosts = hosts.filter(h => h.clusterId.startsWith('cluster-db') || h.clusterId === 'cluster-cache');

  const definitions: Omit<Database, 'hostId'>[] = [
    { id: 'db-users', name: 'postgres-users', engine: 'postgres', clusterId: 'cluster-db-us' },
    { id: 'db-orders', name: 'postgres-orders', engine: 'postgres', clusterId: 'cluster-db-us' },
    { id: 'db-payments', name: 'postgres-payments', engine: 'postgres', clusterId: 'cluster-db-us' },
    { id: 'db-inventory', name: 'postgres-inventory', engine: 'postgres', clusterId: 'cluster-db-us' },
    { id: 'db-catalog', name: 'mongo-catalog', engine: 'mongo', clusterId: 'cluster-db-us' },
    { id: 'db-analytics', name: 'postgres-analytics', engine: 'postgres', clusterId: 'cluster-db-eu' },
    { id: 'db-audit', name: 'postgres-audit', engine: 'postgres', clusterId: 'cluster-db-eu' },
    { id: 'db-recommendations', name: 'mongo-recommendations', engine: 'mongo', clusterId: 'cluster-db-eu' },
    { id: 'db-sessions', name: 'redis-sessions', engine: 'redis', clusterId: 'cluster-cache' },
    { id: 'db-cart', name: 'redis-cart', engine: 'redis', clusterId: 'cluster-cache' },
    { id: 'db-rate-limit', name: 'redis-rate-limit', engine: 'redis', clusterId: 'cluster-cache' },
    { id: 'db-notifications', name: 'mongo-notifications', engine: 'mongo', clusterId: 'cluster-db-eu' },
  ];

  return definitions.map(def => {
    const host = dbHosts.find(h => h.clusterId === def.clusterId) ?? dbHosts[0];
    return { ...def, hostId: host.id };
  });
}
