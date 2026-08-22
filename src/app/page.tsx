import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import { Badge } from '@/components/ui/Badge';
import { DbStatusBanner } from '@/components/DbStatusBanner';
import { singlePointsOfFailure } from '@/queries/singlePointsOfFailure';
import type { SinglePointOfFailure } from '@/lib/types';

const QUICK_STARTS = [
  { id: 'db-sessions',    name: 'redis-sessions',   type: 'Database',   desc: 'Session cache — hidden gateway SPOF' },
  { id: 'svc-payment',    name: 'payment-service',  type: 'Service',    desc: 'Critical payments path' },
  { id: 'cred-auth0-cert',name: 'auth0-signing-cert',type: 'Credential',desc: 'Expires in 15 days' },
  { id: 'db-payments',    name: 'postgres-payments',type: 'Database',   desc: 'Shared by primary + failover' },
];

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

async function getTopRisks(): Promise<SinglePointOfFailure[]> {
  try { return await singlePointsOfFailure(); }
  catch { return []; }
}

export default async function HomePage() {
  const risks = await getTopRisks();

  return (
    <>
      <DbStatusBanner />
      <main className="mx-auto w-full max-w-4xl px-4 py-16">

        {/* Hero */}
        <div className="mb-14 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 leading-tight">
            If this breaks,<br />what happens?
          </h1>
          <p className="mt-4 text-lg text-zinc-500 max-w-xl mx-auto">
            Pick any component — a service, database, credential or vendor — and see the exact
            chain of failures, the customers affected, and the contracts at risk.
          </p>
        </div>

        {/* Search */}
        <div className="flex justify-center mb-12">
          <SearchBox />
        </div>

        {/* Quick starts */}
        <div className="mb-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Try these
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_STARTS.map(qs => (
              <Link
                key={qs.id}
                href={`/component/${qs.id}`}
                className="group flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3
                  hover:border-amber-300 hover:shadow-md
                  active:scale-[0.97] active:shadow-none active:bg-amber-50
                  transition-all duration-150"
              >
                <Badge variant={qs.type as never}>{qs.type}</Badge>
                <span className="font-mono text-sm font-semibold text-zinc-900 group-hover:text-amber-700 transition-colors">
                  {qs.name}
                </span>
                <span className="text-xs text-zinc-400 leading-snug">{qs.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top risks */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Top single points of failure</h2>
            <p className="text-sm text-zinc-500">Ranked by contract value at risk</p>
          </div>
          <Link
            href="/risks"
            className="text-sm font-medium text-amber-600 hover:text-amber-800 active:text-amber-900 underline underline-offset-2 transition-colors"
          >
            View all risks →
          </Link>
        </div>

        {risks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
            <p className="text-sm text-zinc-400">Risk data unavailable. Is the database running?</p>
            <Link href="/api/health" target="_blank" className="mt-2 inline-block text-xs text-zinc-400 underline">
              Check health →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {risks.slice(0, 6).map(spof => (
              <Link
                key={spof.id}
                href={`/component/${spof.id}`}
                className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4
                  hover:border-amber-300 hover:shadow-md
                  active:scale-[0.97] active:shadow-none active:bg-amber-50
                  transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge variant={spof.type as never}>{spof.type}</Badge>
                </div>
                <p className="font-mono text-sm font-semibold text-zinc-900 group-hover:text-amber-700 transition-colors truncate">
                  {spof.name}
                </p>
                <div className="flex items-end justify-between border-t border-zinc-100 pt-3">
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-red-600 leading-none">
                      {formatMoney(spof.value)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">at risk</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tabular-nums text-zinc-700 leading-none">
                      {spof.customers}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">customers</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
