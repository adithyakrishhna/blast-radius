import Link from 'next/link';
import { DbStatusBanner } from '@/components/DbStatusBanner';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { sharedFate } from '@/queries/sharedFate';
import { singlePointsOfFailure } from '@/queries/singlePointsOfFailure';

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

async function getData() {
  try {
    const [findings, spofs] = await Promise.all([sharedFate(), singlePointsOfFailure()]);
    return { findings, spofs, error: null };
  } catch (err) {
    return { findings: [], spofs: [], error: 'Database unreachable. Risk data is unavailable.' };
  }
}

export default async function RisksPage() {
  const { findings, spofs, error } = await getData();

  return (
    <>
      <DbStatusBanner />
      <main className="mx-auto w-full max-w-4xl px-4 py-10">

        <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-900">Home</Link>
          <span>/</span>
          <span className="text-zinc-900">Risks</span>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-zinc-900">Risk Dashboard</h1>
        <p className="mb-10 text-sm text-zinc-500">
          Hidden failure scenarios and ranked single points of failure across the estate.
        </p>

        {error && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Shared fate */}
        <section className="mb-12">
          <h2 className="mb-1 text-base font-semibold text-zinc-900">Shared fate findings</h2>
          <p className="mb-4 text-sm text-zinc-500">
            These services are configured as failovers for each other, but secretly share a common dependency —
            meaning one failure takes both out simultaneously.
          </p>

          {findings.length === 0 ? (
            <EmptyState
              title="No shared fate findings"
              description="No failover pairs share a common ancestor in the current dataset."
            />
          ) : (
            <div className="space-y-3">
              {findings.map((f, i) => (
                <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <p className="text-sm font-medium text-zinc-900">
                    <span className="font-mono">{f.primary}</span> fails over to{' '}
                    <span className="font-mono">{f.failover}</span>, but both depend on{' '}
                    <span className="font-mono font-semibold text-amber-800">{f.sharedResource}</span>{' '}
                    <Badge variant={f.sharedType as never}>{f.sharedType}</Badge>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {f.hopsFromPrimary} hop{f.hopsFromPrimary !== 1 ? 's' : ''} from primary ·{' '}
                    {f.hopsFromFailover} hop{f.hopsFromFailover !== 1 ? 's' : ''} from failover
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SPOF table */}
        <section>
          <h2 className="mb-1 text-base font-semibold text-zinc-900">Single points of failure</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Ranked by total contract value at risk if each component failed right now.
          </p>

          {spofs.length === 0 ? (
            <EmptyState
              title="No data"
              description="SPOF data could not be loaded."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Component</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Customers</th>
                    <th className="px-4 py-3 text-right">Contract value at risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {spofs.map((s, i) => (
                    <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/component/${s.id}`} className="font-mono font-medium text-zinc-900 hover:underline">
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><Badge variant={s.type as never}>{s.type}</Badge></td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{s.customers}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-900">{formatMoney(s.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
