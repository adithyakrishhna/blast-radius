// Generates services, teams, credentials, vendors, and all their dependency edges

import type { Host, Database } from './infrastructure';

export interface Team {
  id: string;
  name: string;
  oncallRotation: string;
}

export interface Credential {
  id: string;
  name: string;
  type: 'api-key' | 'cert' | 'oauth';
  expiresAt: string; // ISO date string
}

export interface Vendor {
  id: string;
  name: string;
  category: 'payments' | 'email' | 'auth' | 'cdn' | 'sms';
}

export interface Service {
  id: string;
  name: string;
  tier: 'critical' | 'standard' | 'batch';
  language: string;
  owner: string;
  hostId: string;
  teamId: string;
}

export interface ServiceDependency {
  fromId: string;
  toId: string;
  criticality: 'hard' | 'soft';
  activeWindow: 'always' | 'business-hours' | 'nightly' | 'weekly';
  protocol: string;
}

export interface DbRelation {
  serviceId: string;
  dbId: string;
  type: 'READS_FROM' | 'WRITES_TO';
  criticality: 'hard' | 'soft';
  activeWindow: 'always' | 'business-hours' | 'nightly' | 'weekly';
}

export interface CredentialRelation {
  serviceId: string;
  credentialId: string;
  criticality: 'hard' | 'soft';
}

export interface VendorRelation {
  serviceId: string;
  vendorId: string;
  criticality: 'hard' | 'soft';
  activeWindow: 'always' | 'business-hours' | 'nightly' | 'weekly';
  hasFallback: boolean;
}

export interface FailoverRelation {
  primaryId: string;
  failoverId: string;
}

export function generateTeams(): Team[] {
  return [
    { id: 'team-platform', name: 'Platform', oncallRotation: 'platform-oncall' },
    { id: 'team-payments', name: 'Payments', oncallRotation: 'payments-oncall' },
    { id: 'team-commerce', name: 'Commerce', oncallRotation: 'commerce-oncall' },
    { id: 'team-identity', name: 'Identity', oncallRotation: 'identity-oncall' },
    { id: 'team-data', name: 'Data & ML', oncallRotation: 'data-oncall' },
    { id: 'team-infra', name: 'Infrastructure', oncallRotation: 'infra-oncall' },
  ];
}

export function generateCredentials(): Credential[] {
  const now = new Date();
  const soon = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days
  const near = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000); // 45 days
  const far = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

  return [
    { id: 'cred-stripe-key', name: 'stripe-api-key', type: 'api-key', expiresAt: far.toISOString() },
    { id: 'cred-sendgrid-key', name: 'sendgrid-api-key', type: 'api-key', expiresAt: near.toISOString() },
    { id: 'cred-auth0-cert', name: 'auth0-signing-cert', type: 'cert', expiresAt: soon.toISOString() }, // expiring soon — risk
    { id: 'cred-cdn-token', name: 'cloudfront-token', type: 'api-key', expiresAt: far.toISOString() },
    { id: 'cred-twilio-key', name: 'twilio-api-key', type: 'api-key', expiresAt: near.toISOString() },
    { id: 'cred-datadog-key', name: 'datadog-api-key', type: 'api-key', expiresAt: far.toISOString() },
    { id: 'cred-internal-jwt', name: 'internal-jwt-secret', type: 'cert', expiresAt: soon.toISOString() }, // expiring soon — risk
    { id: 'cred-s3-access', name: 's3-access-key', type: 'api-key', expiresAt: far.toISOString() },
    { id: 'cred-google-oauth', name: 'google-oauth-client', type: 'oauth', expiresAt: far.toISOString() },
    { id: 'cred-pagerduty-key', name: 'pagerduty-api-key', type: 'api-key', expiresAt: near.toISOString() },
  ];
}

export function generateVendors(): Vendor[] {
  return [
    { id: 'vendor-stripe', name: 'Stripe', category: 'payments' },
    { id: 'vendor-paypal', name: 'PayPal', category: 'payments' },
    { id: 'vendor-sendgrid', name: 'SendGrid', category: 'email' },
    { id: 'vendor-auth0', name: 'Auth0', category: 'auth' },
    { id: 'vendor-cloudfront', name: 'CloudFront', category: 'cdn' },
    { id: 'vendor-twilio', name: 'Twilio', category: 'sms' },
    { id: 'vendor-datadog', name: 'Datadog', category: 'cdn' },
    { id: 'vendor-pagerduty', name: 'PagerDuty', category: 'sms' },
  ];
}

export function generateServices(hosts: Host[]): Service[] {
  const prodUsHosts = hosts.filter(h => h.clusterId === 'cluster-prod-us');
  const prodEuHosts = hosts.filter(h => h.clusterId === 'cluster-prod-eu');
  const prodApHosts = hosts.filter(h => h.clusterId === 'cluster-prod-ap');

  const pick = (arr: Host[], i: number) => arr[i % arr.length].id;

  return [
    // --- Critical tier ---
    { id: 'svc-api-gateway', name: 'api-gateway', tier: 'critical', language: 'Go', owner: 'platform', hostId: pick(prodUsHosts, 0), teamId: 'team-platform' },
    { id: 'svc-auth', name: 'auth-service', tier: 'critical', language: 'Go', owner: 'identity', hostId: pick(prodUsHosts, 1), teamId: 'team-identity' },
    { id: 'svc-session', name: 'session-service', tier: 'critical', language: 'Node', owner: 'identity', hostId: pick(prodUsHosts, 2), teamId: 'team-identity' },
    { id: 'svc-payment', name: 'payment-service', tier: 'critical', language: 'Java', owner: 'payments', hostId: pick(prodUsHosts, 3), teamId: 'team-payments' },
    { id: 'svc-payment-eu', name: 'payment-service-eu', tier: 'critical', language: 'Java', owner: 'payments', hostId: pick(prodEuHosts, 0), teamId: 'team-payments' },
    { id: 'svc-order', name: 'order-service', tier: 'critical', language: 'Java', owner: 'commerce', hostId: pick(prodUsHosts, 4), teamId: 'team-commerce' },
    { id: 'svc-checkout', name: 'checkout-service', tier: 'critical', language: 'Node', owner: 'commerce', hostId: pick(prodUsHosts, 5), teamId: 'team-commerce' },
    { id: 'svc-inventory', name: 'inventory-service', tier: 'critical', language: 'Python', owner: 'commerce', hostId: pick(prodUsHosts, 6), teamId: 'team-commerce' },
    { id: 'svc-user-profile', name: 'user-profile-service', tier: 'critical', language: 'Go', owner: 'identity', hostId: pick(prodUsHosts, 7), teamId: 'team-identity' },
    { id: 'svc-product-catalog', name: 'product-catalog-service', tier: 'critical', language: 'Node', owner: 'commerce', hostId: pick(prodUsHosts, 0), teamId: 'team-commerce' },

    // --- Standard tier ---
    { id: 'svc-notification', name: 'notification-service', tier: 'standard', language: 'Python', owner: 'platform', hostId: pick(prodUsHosts, 1), teamId: 'team-platform' },
    { id: 'svc-email', name: 'email-service', tier: 'standard', language: 'Node', owner: 'platform', hostId: pick(prodEuHosts, 1), teamId: 'team-platform' },
    { id: 'svc-sms', name: 'sms-service', tier: 'standard', language: 'Node', owner: 'platform', hostId: pick(prodEuHosts, 2), teamId: 'team-platform' },
    { id: 'svc-search', name: 'search-service', tier: 'standard', language: 'Python', owner: 'commerce', hostId: pick(prodUsHosts, 2), teamId: 'team-commerce' },
    { id: 'svc-recommendation', name: 'recommendation-service', tier: 'standard', language: 'Python', owner: 'data', hostId: pick(prodApHosts, 0), teamId: 'team-data' },
    { id: 'svc-review', name: 'review-service', tier: 'standard', language: 'Go', owner: 'commerce', hostId: pick(prodUsHosts, 3), teamId: 'team-commerce' },
    { id: 'svc-wishlist', name: 'wishlist-service', tier: 'standard', language: 'Go', owner: 'commerce', hostId: pick(prodUsHosts, 4), teamId: 'team-commerce' },
    { id: 'svc-pricing', name: 'pricing-service', tier: 'standard', language: 'Java', owner: 'commerce', hostId: pick(prodUsHosts, 5), teamId: 'team-commerce' },
    { id: 'svc-cart', name: 'cart-service', tier: 'standard', language: 'Node', owner: 'commerce', hostId: pick(prodUsHosts, 6), teamId: 'team-commerce' },
    { id: 'svc-shipping', name: 'shipping-service', tier: 'standard', language: 'Python', owner: 'commerce', hostId: pick(prodEuHosts, 3), teamId: 'team-commerce' },
    { id: 'svc-tax', name: 'tax-service', tier: 'standard', language: 'Java', owner: 'commerce', hostId: pick(prodEuHosts, 4), teamId: 'team-commerce' },
    { id: 'svc-fraud', name: 'fraud-detection-service', tier: 'standard', language: 'Python', owner: 'payments', hostId: pick(prodUsHosts, 7), teamId: 'team-payments' },
    { id: 'svc-webhook', name: 'webhook-service', tier: 'standard', language: 'Go', owner: 'platform', hostId: pick(prodApHosts, 1), teamId: 'team-platform' },
    { id: 'svc-media', name: 'media-service', tier: 'standard', language: 'Go', owner: 'platform', hostId: pick(prodApHosts, 2), teamId: 'team-platform' },

    // --- Batch tier ---
    { id: 'svc-analytics-etl', name: 'analytics-etl', tier: 'batch', language: 'Python', owner: 'data', hostId: pick(prodApHosts, 3), teamId: 'team-data' },
    { id: 'svc-report-gen', name: 'report-generator', tier: 'batch', language: 'Python', owner: 'data', hostId: pick(prodEuHosts, 0), teamId: 'team-data' },
    { id: 'svc-invoice', name: 'invoice-service', tier: 'batch', language: 'Java', owner: 'payments', hostId: pick(prodEuHosts, 1), teamId: 'team-payments' },
    { id: 'svc-data-sync', name: 'data-sync-service', tier: 'batch', language: 'Python', owner: 'data', hostId: pick(prodApHosts, 0), teamId: 'team-data' },
    { id: 'svc-audit-logger', name: 'audit-logger', tier: 'batch', language: 'Go', owner: 'platform', hostId: pick(prodEuHosts, 2), teamId: 'team-platform' },
    { id: 'svc-cleanup', name: 'data-cleanup-service', tier: 'batch', language: 'Python', owner: 'data', hostId: pick(prodApHosts, 1), teamId: 'team-data' },
  ];
}

export function generateServiceDependencies(): ServiceDependency[] {
  return [
    // api-gateway is the front door
    { fromId: 'svc-api-gateway', toId: 'svc-auth', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },
    { fromId: 'svc-api-gateway', toId: 'svc-user-profile', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },
    { fromId: 'svc-api-gateway', toId: 'svc-product-catalog', criticality: 'hard', activeWindow: 'always', protocol: 'REST' },
    { fromId: 'svc-api-gateway', toId: 'svc-cart', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },
    { fromId: 'svc-api-gateway', toId: 'svc-search', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },

    // auth depends on session
    { fromId: 'svc-auth', toId: 'svc-session', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },

    // checkout orchestrates the purchase flow
    { fromId: 'svc-checkout', toId: 'svc-cart', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },
    { fromId: 'svc-checkout', toId: 'svc-payment', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },
    { fromId: 'svc-checkout', toId: 'svc-inventory', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },
    { fromId: 'svc-checkout', toId: 'svc-order', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },
    { fromId: 'svc-checkout', toId: 'svc-tax', criticality: 'hard', activeWindow: 'always', protocol: 'REST' },
    { fromId: 'svc-checkout', toId: 'svc-shipping', criticality: 'hard', activeWindow: 'always', protocol: 'REST' },
    { fromId: 'svc-checkout', toId: 'svc-notification', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },

    // payment depends on fraud detection
    { fromId: 'svc-payment', toId: 'svc-fraud', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },

    // order depends on inventory and pricing
    { fromId: 'svc-order', toId: 'svc-inventory', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },
    { fromId: 'svc-order', toId: 'svc-pricing', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },

    // notification dispatches via email and sms
    { fromId: 'svc-notification', toId: 'svc-email', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },
    { fromId: 'svc-notification', toId: 'svc-sms', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },

    // recommendation depends on catalog and user profile
    { fromId: 'svc-recommendation', toId: 'svc-product-catalog', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },
    { fromId: 'svc-recommendation', toId: 'svc-user-profile', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },

    // search depends on catalog
    { fromId: 'svc-search', toId: 'svc-product-catalog', criticality: 'hard', activeWindow: 'always', protocol: 'REST' },

    // batch jobs
    { fromId: 'svc-analytics-etl', toId: 'svc-order', criticality: 'soft', activeWindow: 'nightly', protocol: 'REST' },
    { fromId: 'svc-analytics-etl', toId: 'svc-user-profile', criticality: 'soft', activeWindow: 'nightly', protocol: 'REST' },
    { fromId: 'svc-report-gen', toId: 'svc-analytics-etl', criticality: 'soft', activeWindow: 'weekly', protocol: 'REST' },
    { fromId: 'svc-invoice', toId: 'svc-order', criticality: 'soft', activeWindow: 'nightly', protocol: 'REST' },
    { fromId: 'svc-invoice', toId: 'svc-payment', criticality: 'soft', activeWindow: 'nightly', protocol: 'REST' },
    { fromId: 'svc-data-sync', toId: 'svc-user-profile', criticality: 'soft', activeWindow: 'nightly', protocol: 'REST' },
    { fromId: 'svc-audit-logger', toId: 'svc-api-gateway', criticality: 'soft', activeWindow: 'always', protocol: 'gRPC' },
    { fromId: 'svc-cleanup', toId: 'svc-order', criticality: 'soft', activeWindow: 'weekly', protocol: 'REST' },
    { fromId: 'svc-webhook', toId: 'svc-notification', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },

    // cart and wishlist
    { fromId: 'svc-cart', toId: 'svc-pricing', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },
    { fromId: 'svc-cart', toId: 'svc-product-catalog', criticality: 'hard', activeWindow: 'always', protocol: 'REST' },
    { fromId: 'svc-wishlist', toId: 'svc-product-catalog', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },
    { fromId: 'svc-wishlist', toId: 'svc-user-profile', criticality: 'soft', activeWindow: 'always', protocol: 'gRPC' },

    // media
    { fromId: 'svc-media', toId: 'svc-product-catalog', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },

    // review
    { fromId: 'svc-review', toId: 'svc-user-profile', criticality: 'hard', activeWindow: 'always', protocol: 'gRPC' },
    { fromId: 'svc-review', toId: 'svc-order', criticality: 'soft', activeWindow: 'always', protocol: 'REST' },
  ];
}

export function generateDbRelations(): DbRelation[] {
  return [
    // auth + session
    { serviceId: 'svc-auth', dbId: 'db-users', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },
    { serviceId: 'svc-session', dbId: 'db-sessions', type: 'WRITES_TO', criticality: 'hard', activeWindow: 'always' },
    { serviceId: 'svc-session', dbId: 'db-sessions', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },

    // user profile
    { serviceId: 'svc-user-profile', dbId: 'db-users', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },
    { serviceId: 'svc-user-profile', dbId: 'db-users', type: 'WRITES_TO', criticality: 'hard', activeWindow: 'always' },

    // payment
    { serviceId: 'svc-payment', dbId: 'db-payments', type: 'WRITES_TO', criticality: 'hard', activeWindow: 'always' },
    { serviceId: 'svc-payment', dbId: 'db-payments', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },
    { serviceId: 'svc-payment-eu', dbId: 'db-payments', type: 'WRITES_TO', criticality: 'hard', activeWindow: 'always' },
    { serviceId: 'svc-payment-eu', dbId: 'db-payments', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },

    // order
    { serviceId: 'svc-order', dbId: 'db-orders', type: 'WRITES_TO', criticality: 'hard', activeWindow: 'always' },
    { serviceId: 'svc-order', dbId: 'db-orders', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },

    // inventory
    { serviceId: 'svc-inventory', dbId: 'db-inventory', type: 'WRITES_TO', criticality: 'hard', activeWindow: 'always' },
    { serviceId: 'svc-inventory', dbId: 'db-inventory', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },

    // catalog
    { serviceId: 'svc-product-catalog', dbId: 'db-catalog', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },
    { serviceId: 'svc-product-catalog', dbId: 'db-catalog', type: 'WRITES_TO', criticality: 'hard', activeWindow: 'business-hours' },

    // cart uses redis
    { serviceId: 'svc-cart', dbId: 'db-cart', type: 'WRITES_TO', criticality: 'hard', activeWindow: 'always' },
    { serviceId: 'svc-cart', dbId: 'db-cart', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },

    // api-gateway rate limiting
    { serviceId: 'svc-api-gateway', dbId: 'db-rate-limit', type: 'READS_FROM', criticality: 'soft', activeWindow: 'always' },
    { serviceId: 'svc-api-gateway', dbId: 'db-rate-limit', type: 'WRITES_TO', criticality: 'soft', activeWindow: 'always' },

    // notification
    { serviceId: 'svc-notification', dbId: 'db-notifications', type: 'WRITES_TO', criticality: 'soft', activeWindow: 'always' },
    { serviceId: 'svc-notification', dbId: 'db-notifications', type: 'READS_FROM', criticality: 'soft', activeWindow: 'always' },

    // analytics + reporting
    { serviceId: 'svc-analytics-etl', dbId: 'db-analytics', type: 'WRITES_TO', criticality: 'soft', activeWindow: 'nightly' },
    { serviceId: 'svc-analytics-etl', dbId: 'db-orders', type: 'READS_FROM', criticality: 'soft', activeWindow: 'nightly' },
    { serviceId: 'svc-report-gen', dbId: 'db-analytics', type: 'READS_FROM', criticality: 'soft', activeWindow: 'weekly' },

    // recommendation
    { serviceId: 'svc-recommendation', dbId: 'db-recommendations', type: 'READS_FROM', criticality: 'soft', activeWindow: 'always' },
    { serviceId: 'svc-recommendation', dbId: 'db-recommendations', type: 'WRITES_TO', criticality: 'soft', activeWindow: 'nightly' },

    // fraud
    { serviceId: 'svc-fraud', dbId: 'db-payments', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },

    // audit
    { serviceId: 'svc-audit-logger', dbId: 'db-audit', type: 'WRITES_TO', criticality: 'soft', activeWindow: 'always' },

    // invoice
    { serviceId: 'svc-invoice', dbId: 'db-orders', type: 'READS_FROM', criticality: 'soft', activeWindow: 'nightly' },
    { serviceId: 'svc-invoice', dbId: 'db-payments', type: 'READS_FROM', criticality: 'soft', activeWindow: 'nightly' },

    // search
    { serviceId: 'svc-search', dbId: 'db-catalog', type: 'READS_FROM', criticality: 'hard', activeWindow: 'always' },

    // review
    { serviceId: 'svc-review', dbId: 'db-orders', type: 'READS_FROM', criticality: 'soft', activeWindow: 'always' },

    // data-sync
    { serviceId: 'svc-data-sync', dbId: 'db-users', type: 'READS_FROM', criticality: 'soft', activeWindow: 'nightly' },
    { serviceId: 'svc-data-sync', dbId: 'db-analytics', type: 'WRITES_TO', criticality: 'soft', activeWindow: 'nightly' },
  ];
}

export function generateCredentialRelations(): CredentialRelation[] {
  return [
    { serviceId: 'svc-payment', credentialId: 'cred-stripe-key', criticality: 'hard' },
    { serviceId: 'svc-payment-eu', credentialId: 'cred-stripe-key', criticality: 'hard' },
    { serviceId: 'svc-email', credentialId: 'cred-sendgrid-key', criticality: 'soft' },
    { serviceId: 'svc-auth', credentialId: 'cred-auth0-cert', criticality: 'hard' },
    { serviceId: 'svc-media', credentialId: 'cred-cdn-token', criticality: 'soft' },
    { serviceId: 'svc-sms', credentialId: 'cred-twilio-key', criticality: 'soft' },
    { serviceId: 'svc-api-gateway', credentialId: 'cred-internal-jwt', criticality: 'hard' },
    { serviceId: 'svc-auth', credentialId: 'cred-internal-jwt', criticality: 'hard' },
    { serviceId: 'svc-session', credentialId: 'cred-internal-jwt', criticality: 'hard' },
    { serviceId: 'svc-media', credentialId: 'cred-s3-access', criticality: 'soft' },
    { serviceId: 'svc-user-profile', credentialId: 'cred-google-oauth', criticality: 'soft' },
    { serviceId: 'svc-audit-logger', credentialId: 'cred-datadog-key', criticality: 'soft' },
  ];
}

export function generateVendorRelations(): VendorRelation[] {
  return [
    { serviceId: 'svc-payment', vendorId: 'vendor-stripe', criticality: 'hard', activeWindow: 'always', hasFallback: true },
    { serviceId: 'svc-payment', vendorId: 'vendor-paypal', criticality: 'soft', activeWindow: 'always', hasFallback: true },
    { serviceId: 'svc-payment-eu', vendorId: 'vendor-stripe', criticality: 'hard', activeWindow: 'always', hasFallback: false }, // landmine: no fallback
    { serviceId: 'svc-email', vendorId: 'vendor-sendgrid', criticality: 'soft', activeWindow: 'always', hasFallback: false },
    { serviceId: 'svc-auth', vendorId: 'vendor-auth0', criticality: 'hard', activeWindow: 'always', hasFallback: false }, // landmine: no fallback
    { serviceId: 'svc-api-gateway', vendorId: 'vendor-cloudfront', criticality: 'soft', activeWindow: 'always', hasFallback: false },
    { serviceId: 'svc-sms', vendorId: 'vendor-twilio', criticality: 'soft', activeWindow: 'always', hasFallback: false },
    { serviceId: 'svc-audit-logger', vendorId: 'vendor-datadog', criticality: 'soft', activeWindow: 'always', hasFallback: false },
    { serviceId: 'svc-notification', vendorId: 'vendor-pagerduty', criticality: 'soft', activeWindow: 'always', hasFallback: false },
  ];
}

// Failover relations — used by the shared-fate query to find hidden risks
export function generateFailoverRelations(): FailoverRelation[] {
  return [
    // payment-service fails over to payment-service-eu — planted landmine
    { primaryId: 'svc-payment', failoverId: 'svc-payment-eu' },
  ];
}
