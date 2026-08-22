// Deliberately planted shared-fate risks.
// Each one is a hidden failure scenario that the shared-fate query (Q2) is designed to find.
// These are documented here so they can be pointed to in the video and README.

// LANDMINE 1: payment-service FAILS_OVER_TO payment-service-eu
// but BOTH write to postgres-payments (db-payments) on cluster-db-us.
// If cluster-db-us goes down, BOTH the primary and its supposed failover die together.
// This is already wired in services.ts (failover relation) and the db relations
// (both svc-payment and svc-payment-eu write to db-payments).
// The shared-fate query finds this because:
//   payment-service --WRITES_TO--> postgres-payments
//   payment-service-eu --WRITES_TO--> postgres-payments
// They share the same database — the failover is useless against a DB outage.

// LANDMINE 2: auth-service and api-gateway both depend on cred-internal-jwt.
// If the JWT signing cert expires (it's set to expire in 15 days), BOTH fail simultaneously.
// api-gateway can't authenticate any request, and auth-service can't issue tokens.
// The blast radius of cred-internal-jwt is enormous — every service behind the gateway is affected.
// This is already wired in credential relations in services.ts.

// LANDMINE 3: payment-service and auth-service both use vendor-auth0 indirectly
// through cred-auth0-cert which is also expiring soon.
// auth-service --AUTHENTICATES_WITH--> cred-auth0-cert
// checkout-service --DEPENDS_ON--> payment-service (hard)
// checkout-service --DEPENDS_ON--> auth (via api-gateway)
// One cert expiry takes down both auth and payments simultaneously.

// LANDMINE 4: analytics-etl and report-generator both read from db-analytics (cluster-db-eu).
// They also both depend on db-orders (cluster-db-us).
// If cluster-db-eu goes down, ALL reporting and analytics stops at once.
// These two batch services look independent but share two databases.

// LANDMINE 5: session-service is a single point of failure for auth-service,
// which is a hard dependency of api-gateway.
// Path: api-gateway -[hard]-> auth-service -[hard]-> session-service -[hard]-> redis-sessions
// redis-sessions is on cluster-cache — if cache cluster goes down, auth breaks, gateway breaks,
// every authenticated endpoint in the system goes dark.

export const LANDMINE_DESCRIPTIONS = [
  {
    id: 'landmine-1',
    title: 'Payment failover shares the same database',
    description:
      'payment-service fails over to payment-service-eu, but both write to postgres-payments on cluster-db-us. ' +
      'A database cluster failure takes out both simultaneously — the failover offers zero protection.',
    query: 'Q2 (shared-fate): finds that payment-service and payment-service-eu share db-payments',
    nodesInvolved: ['svc-payment', 'svc-payment-eu', 'db-payments', 'cluster-db-us'],
  },
  {
    id: 'landmine-2',
    title: 'Internal JWT cert expiry cascades to gateway and auth simultaneously',
    description:
      'api-gateway and auth-service both AUTHENTICATES_WITH cred-internal-jwt. ' +
      'The cert expires in 15 days. When it does, authentication and routing fail at the same moment.',
    query: 'Q7 (SPOF): cred-internal-jwt appears near the top of the risk ranking',
    nodesInvolved: ['cred-internal-jwt', 'svc-api-gateway', 'svc-auth'],
  },
  {
    id: 'landmine-3',
    title: 'Auth0 cert expiry kills auth and checkout',
    description:
      'auth-service depends on cred-auth0-cert (expiring in 15 days). ' +
      'checkout-service hard-depends on auth (via api-gateway). ' +
      'One cert expiry collapses the entire authenticated purchase flow.',
    query: 'Q1 (blast-radius): cred-auth0-cert blast radius reaches checkout and all downstream',
    nodesInvolved: ['cred-auth0-cert', 'svc-auth', 'svc-session', 'svc-checkout'],
  },
  {
    id: 'landmine-4',
    title: 'Reporting pipeline looks independent but shares two databases',
    description:
      'analytics-etl and report-generator each read from db-analytics and db-orders. ' +
      'They appear to be separate batch jobs, but a single database cluster failure silences both.',
    query: 'Q2 (shared-fate): finds db-analytics and db-orders as shared ancestors of both batch services',
    nodesInvolved: ['svc-analytics-etl', 'svc-report-gen', 'db-analytics', 'db-orders'],
  },
  {
    id: 'landmine-5',
    title: 'Redis session cache is a hidden gateway single point of failure',
    description:
      'session-service is a hard dependency of auth-service, which is a hard dependency of api-gateway. ' +
      'Redis-sessions sits on cluster-cache — if the cache cluster fails, every authenticated request to the gateway fails.',
    query: 'Q7 (SPOF): db-sessions / cluster-cache appear with very high customer impact',
    nodesInvolved: ['db-sessions', 'svc-session', 'svc-auth', 'svc-api-gateway', 'cluster-cache'],
  },
];
