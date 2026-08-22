// Generates features, customers, and contracts for the business layer

export interface Feature {
  id: string;
  name: string;
  description: string;
  userFacing: boolean;
  poweredBy: string[]; // service IDs that POWER this feature
}

export interface Customer {
  id: string;
  name: string;
  tier: 'enterprise' | 'business' | 'starter';
  userCount: number;
  usesFeatureIds: string[];
}

export interface Contract {
  id: string;
  customerId: string;
  value: number;
  renewalDate: string;
  slaUptime: number; // percentage e.g. 99.9
}

export function generateFeatures(): Feature[] {
  return [
    {
      id: 'feat-checkout',
      name: 'Checkout & Payment',
      description: 'End-to-end purchase flow including cart, payment processing, and order confirmation',
      userFacing: true,
      poweredBy: ['svc-checkout', 'svc-payment', 'svc-order', 'svc-cart'],
    },
    {
      id: 'feat-product-browse',
      name: 'Product Browsing',
      description: 'Browse and search the product catalog with filters and recommendations',
      userFacing: true,
      poweredBy: ['svc-product-catalog', 'svc-search', 'svc-recommendation'],
    },
    {
      id: 'feat-account-management',
      name: 'Account Management',
      description: 'User registration, login, profile settings, and preferences',
      userFacing: true,
      poweredBy: ['svc-auth', 'svc-user-profile', 'svc-session'],
    },
    {
      id: 'feat-order-tracking',
      name: 'Order Tracking',
      description: 'Real-time order status, shipping updates, and delivery tracking',
      userFacing: true,
      poweredBy: ['svc-order', 'svc-shipping', 'svc-notification'],
    },
    {
      id: 'feat-notifications',
      name: 'Email & SMS Notifications',
      description: 'Transactional emails and SMS for orders, promotions, and alerts',
      userFacing: true,
      poweredBy: ['svc-notification', 'svc-email', 'svc-sms'],
    },
    {
      id: 'feat-inventory-management',
      name: 'Inventory Management',
      description: 'Real-time stock levels, low-stock alerts, and reorder management',
      userFacing: false,
      poweredBy: ['svc-inventory'],
    },
    {
      id: 'feat-reviews',
      name: 'Reviews & Ratings',
      description: 'Customer product reviews, ratings, and moderation',
      userFacing: true,
      poweredBy: ['svc-review', 'svc-user-profile'],
    },
    {
      id: 'feat-wishlist',
      name: 'Wishlist & Saved Items',
      description: 'Save products for later, share wishlists, and receive price drop alerts',
      userFacing: true,
      poweredBy: ['svc-wishlist', 'svc-product-catalog'],
    },
    {
      id: 'feat-analytics-dashboard',
      name: 'Merchant Analytics Dashboard',
      description: 'Sales reports, customer insights, and performance metrics for merchants',
      userFacing: false,
      poweredBy: ['svc-analytics-etl', 'svc-report-gen'],
    },
    {
      id: 'feat-fraud-protection',
      name: 'Fraud Protection',
      description: 'Real-time transaction fraud scoring and prevention',
      userFacing: false,
      poweredBy: ['svc-fraud', 'svc-payment'],
    },
    {
      id: 'feat-media-uploads',
      name: 'Product Media & Images',
      description: 'Product image uploads, CDN delivery, and image optimization',
      userFacing: true,
      poweredBy: ['svc-media'],
    },
    {
      id: 'feat-api-access',
      name: 'Partner API Access',
      description: 'REST API access for third-party integrations and partners',
      userFacing: false,
      poweredBy: ['svc-api-gateway', 'svc-auth'],
    },
    {
      id: 'feat-webhooks',
      name: 'Webhook Integrations',
      description: 'Real-time event webhooks for order status, inventory, and payment events',
      userFacing: false,
      poweredBy: ['svc-webhook', 'svc-notification'],
    },
    {
      id: 'feat-invoicing',
      name: 'Automated Invoicing',
      description: 'Nightly invoice generation and dispatch for B2B customers',
      userFacing: false,
      poweredBy: ['svc-invoice', 'svc-email'],
    },
    {
      id: 'feat-audit-log',
      name: 'Compliance Audit Log',
      description: 'Full audit trail of all platform actions for compliance reporting',
      userFacing: false,
      poweredBy: ['svc-audit-logger'],
    },
  ];
}

// Customers — a mix of enterprise, business, and starter tiers
// Enterprise customers use all features; starter customers use a few
export function generateCustomers(): Customer[] {
  const customers: Customer[] = [];

  // Enterprise customers (10) — high value, use all core features
  const enterpriseNames = [
    'Acme Corporation', 'Globex Industries', 'Initech Solutions', 'Umbrella Retail',
    'Stark Enterprises', 'Wayne Commerce', 'Pied Piper Goods', 'Dunder Mifflin Online',
    'Prestige Worldwide', 'Bluth Company Store',
  ];
  const allFeatures = ['feat-checkout', 'feat-product-browse', 'feat-account-management',
    'feat-order-tracking', 'feat-notifications', 'feat-reviews', 'feat-wishlist',
    'feat-analytics-dashboard', 'feat-api-access', 'feat-webhooks', 'feat-invoicing',
    'feat-audit-log', 'feat-media-uploads'];

  enterpriseNames.forEach((name, i) => {
    customers.push({
      id: `cust-enterprise-${i + 1}`,
      name,
      tier: 'enterprise',
      userCount: 5000 + i * 1200,
      usesFeatureIds: allFeatures,
    });
  });

  // Business customers (40) — use core commerce features
  const businessFeatures = ['feat-checkout', 'feat-product-browse', 'feat-account-management',
    'feat-order-tracking', 'feat-notifications', 'feat-reviews', 'feat-wishlist'];

  for (let i = 1; i <= 40; i++) {
    customers.push({
      id: `cust-business-${i}`,
      name: `Business Customer ${i}`,
      tier: 'business',
      userCount: 200 + i * 50,
      usesFeatureIds: businessFeatures,
    });
  }

  // Starter customers (100) — use minimal features
  const starterFeatures = ['feat-checkout', 'feat-product-browse', 'feat-account-management'];

  for (let i = 1; i <= 100; i++) {
    customers.push({
      id: `cust-starter-${i}`,
      name: `Starter Customer ${i}`,
      tier: 'starter',
      userCount: 10 + i * 5,
      usesFeatureIds: starterFeatures,
    });
  }

  return customers;
}

export function generateContracts(customers: Customer[]): Contract[] {
  const contracts: Contract[] = [];
  const now = new Date();

  customers.forEach((customer, i) => {
    let value: number;
    let slaUptime: number;

    if (customer.tier === 'enterprise') {
      value = 80000 + i * 15000;
      slaUptime = 99.99;
    } else if (customer.tier === 'business') {
      value = 8000 + i * 800;
      slaUptime = 99.9;
    } else {
      value = 500 + i * 50;
      slaUptime = 99.5;
    }

    const renewalDate = new Date(now.getTime() + (90 + i * 7) * 24 * 60 * 60 * 1000);

    contracts.push({
      id: `contract-${customer.id}`,
      customerId: customer.id,
      value,
      renewalDate: renewalDate.toISOString().split('T')[0],
      slaUptime,
    });
  });

  return contracts;
}
