# Data Model

## Overview

The graph models a typical e-commerce microservice estate. Every node is a real thing (a service, a database, a customer). Every relationship is a real dependency. The product answers: **"If this breaks, what else breaks?"**

---

## Diagram

```mermaid
graph TD
    Region["Region\n(aws/gcp/azure)"]
    Cluster["Cluster\n(nodeCount)"]
    Host["Host\n(vm/pod/bare-metal)"]
    Database["Database\n(postgres/redis/mongo)"]
    Credential["Credential\n(api-key/cert/oauth)"]
    Vendor["Vendor\n(payments/email/auth/cdn)"]
    Service["Service\n(critical/standard/batch)"]
    Team["Team\n(oncallRotation)"]
    Feature["Feature\n(userFacing)"]
    Customer["Customer\n(enterprise/business/starter)"]
    Contract["Contract\n(value, slaUptime)"]

    Cluster -->|LOCATED_IN| Region
    Host -->|PART_OF| Cluster
    Host -->|LOCATED_IN| Region
    Database -->|PART_OF| Cluster
    Database -->|HOSTED_ON| Host

    Service -->|HOSTED_ON| Host
    Service -->|DEPENDS_ON| Service
    Service -->|READS_FROM| Database
    Service -->|WRITES_TO| Database
    Service -->|AUTHENTICATES_WITH| Credential
    Service -->|CALLS_VENDOR| Vendor
    Service -->|POWERS| Feature
    Service -->|OWNED_BY| Team
    Service -->|FAILS_OVER_TO| Service

    Customer -->|USES| Feature
    Customer -->|HAS_CONTRACT| Contract
```

---

## Node Labels

| Label | Key Properties |
|---|---|
| `Service` | `id`, `name`, `tier` (critical/standard/batch), `team`, `language`, `owner` |
| `Database` | `id`, `name`, `engine` (postgres/redis/mongo), `cluster` |
| `Cluster` | `id`, `name`, `nodeCount` |
| `Host` | `id`, `name`, `type` (vm/pod/bare-metal) |
| `Region` | `id`, `name`, `provider` (aws/gcp/azure) |
| `Credential` | `id`, `name`, `type` (api-key/cert/oauth), `expiresAt` |
| `Vendor` | `id`, `name`, `category` (payments/email/auth/cdn/sms) |
| `Feature` | `id`, `name`, `description`, `userFacing` (bool) |
| `Customer` | `id`, `name`, `tier` (enterprise/business/starter), `userCount` |
| `Contract` | `id`, `value` (number), `renewalDate`, `slaUptime` |
| `Team` | `id`, `name`, `oncallRotation` |

---

## Relationship Types

| Relationship | From → To | Key Properties |
|---|---|---|
| `DEPENDS_ON` | Service → Service | `criticality` (hard/soft), `activeWindow`, `protocol` |
| `READS_FROM` | Service → Database | `criticality`, `activeWindow` |
| `WRITES_TO` | Service → Database | `criticality`, `activeWindow` |
| `HOSTED_ON` | Service, Database → Host | — |
| `PART_OF` | Host → Cluster, Database → Cluster | — |
| `LOCATED_IN` | Host, Cluster → Region | — |
| `AUTHENTICATES_WITH` | Service → Credential | `criticality` |
| `CALLS_VENDOR` | Service → Vendor | `criticality`, `activeWindow`, `hasFallback` |
| `POWERS` | Service → Feature | `criticality` |
| `USES` | Customer → Feature | — |
| `HAS_CONTRACT` | Customer → Contract | — |
| `OWNED_BY` | Service → Team | — |
| `FAILS_OVER_TO` | Service → Service | — |

---

## Properties That Carry Product Value

- **`criticality`** — `hard` means the caller dies without it; `soft` means degraded. Blast radius propagation follows only `hard` edges by default.
- **`activeWindow`** — `always`, `business-hours`, `nightly`, `weekly`. The 3am graph is a genuinely different graph from the 2pm one.
- **`hasFallback`** — on `CALLS_VENDOR`. A vendor with no fallback is a sharper risk.

---

## Dataset Note

The data is **synthetic**, modelled on a typical e-commerce microservice estate. No real production data is used or implied. The dataset targets 4,000–7,000 nodes and relationships to stay within the CognoDB free-tier limits (1 GB disk, 0.5 vCPU).
