import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { DbStatusBanner } from '@/components/DbStatusBanner';
import { singlePointsOfFailure } from '@/queries/singlePointsOfFailure';
import type { SinglePointOfFailure } from '@/lib/types';

// Pre-selected entry points that guarantee a good demo path
const QUICK_STARTS = [
  { id: 'db-sessions', name: 'redis-sessions', type: 'Database', desc: 'Session cache — hidden gateway SPOF' },
  { id: 'svc-payment', name: 'payment-service', type: 'Service', desc: 'Critical payments path' },
  { id: 'cred-auth0-cert', name: 'auth0-signing-cert', type: 'Credential', desc: 'Expires in 15 days' },
  { id: 'db-payments', name: 'postgres-payments', type: 'Database', desc: 'Shared by primary + failover' },
];

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

async function getTopRisks(): Promise<SinglePointOfFailure[]> {
  try {
    return await singlePointsOfFailure();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const risks = await getTopRisks();

  return (
    <>
      <DbStatusBanner />
      <main className="mx-auto w-full max-w-4xl px-4 py-16">

        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Blast Radius</h1>
          <p className="mt-3 text-lg text-zinc-500">
            Pick any component in your system. See exactly what breaks if it fails —
            which services stop, which customers are affected, and how much is at risk.
          </p>
        </div>

        {/* Search */}
        <div className="flex justify-center mb-10">
          <SearchBox />
        </div>

        {/* Quick starts */}
        <div className="mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Try these</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_STARTS.map(qs => (
              <Link
                key={qs.id}
                href={`/component/${qs.id}`}
                className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm hover:border-zinc-400 hover:shadow-sm transition-all"
              >
                <Badge variant={qs.type as never}>{qs.type}</Badge>
                <span className="font-mono font-medium text-zinc-900 mt-1">{qs.name}</span>
                <span className="text-xs text-zinc-500">{qs.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top risks */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Top single points of failure</h2>
          <Link href="/risks" className="text-sm text-zinc-500 hover:text-zinc-900 underline underline-offset-2">
            View all risks →
          </Link>
        </div>

        {risks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
            <p className="text-sm text-zinc-500">Risk data unavailable — database may be unreachable.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {risks.slice(0, 6).map(spof => (
              <Link key={spof.id} href={`/component/${spof.id}`}>
                <Card className="hover:border-zinc-400 hover:shadow-sm transition-all cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant={spof.type as never}>{spof.type}</Badge>
                    </div>
                    <CardTitle><span className="font-mono">{spof.name}</span></CardTitle>
                  </CardHeader>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold tabular-nums text-zinc-900">{formatMoney(spof.value)}</p>
                      <p className="text-xs text-zinc-500">at risk</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums text-zinc-700">{spof.customers}</p>
                      <p className="text-xs text-zinc-500">customers</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
