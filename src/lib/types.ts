// Shared domain types used across queries, API routes, and components

export type NodeLabel =
  | 'Service'
  | 'Database'
  | 'Cluster'
  | 'Host'
  | 'Region'
  | 'Credential'
  | 'Vendor'
  | 'Feature'
  | 'Customer'
  | 'Contract'
  | 'Team';

export type Criticality = 'hard' | 'soft';

export type ActiveWindow = 'always' | 'business-hours' | 'nightly' | 'weekly';

export type ServiceTier = 'critical' | 'standard' | 'batch';

export type CustomerTier = 'enterprise' | 'business' | 'starter';

export interface AffectedNode {
  type: NodeLabel;
  id: string;
  name: string;
  hops: number;
}

export interface ChainNode {
  type: NodeLabel;
  name: string;
}

export interface DependencyChain {
  chain: ChainNode[];
  links: string[];
  hops: number;
}

export interface BusinessImpact {
  brokenFeatures: string[];
  customersAffected: number;
  contractValueAtRisk: number;
  sampleCustomers: string[];
}

export interface SharedFateFinding {
  primary: string;
  failover: string;
  sharedType: string;
  sharedResource: string;
  hopsFromPrimary: number;
  hopsFromFailover: number;
}

export interface SinglePointOfFailure {
  type: NodeLabel;
  id: string;
  name: string;
  customers: number;
  value: number;
}

export interface SearchResult {
  id: string;
  name: string;
  type: NodeLabel;
  extra?: string; // tier, engine, category, etc.
}

// Standard API response envelope
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
