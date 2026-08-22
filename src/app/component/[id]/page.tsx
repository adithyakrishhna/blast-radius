'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ImpactSummary } from '@/components/ImpactSummary';
import { ChainList } from '@/components/ChainList';
import { GraphView } from '@/components/GraphView';
import { DbStatusBanner } from '@/components/DbStatusBanner';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AffectedNode, BusinessImpact } from '@/lib/types';

type Tab = 'impact' | 'graph';

interface BlastData {
  affected: AffectedNode[];
  impact: BusinessImpact;
}

export default function ComponentPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
  const name = id.replace(/^(svc-|db-|cred-|vendor-|cluster-)/, '');

  const [data, setData] = useState<BlastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('impact');
  const [maxHops, setMaxHops] = useState(4);
  const [includeSoft, setIncludeSoft] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const criticality = includeSoft ? ['hard', 'soft'] : ['hard'];
    const params = new URLSearchParams({ id, maxHops: String(maxHops) });
    criticality.forEach(c => params.append('criticality', c));

    fetch(`/api/blast-radius?${params}`)
      .then(r => r.json())
      .then(json => {
        if (json.ok) setData(json.data);
        else setError(json.error?.message ?? 'Query failed');
      })
      .catch(() => setError('Could not reach the server. Check your connection.'))
      .finally(() => setLoading(false));
  }, [id, maxHops, includeSoft]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'impact', label: 'Impact' },
    { key: 'graph', label: 'Graph' },
  ];

  return (
    <>
      <DbStatusBanner />
      <main className="mx-auto w-full max-w-4xl px-4 py-10">

        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-900">Home</Link>
          <span>/</span>
          <span className="font-mono text-zinc-900">{name}</span>
        </div>

        {/* Impact summary */}
        {loading ? (
          <SkeletonCard />
        ) : error ? (
          <ErrorState message={error} />
        ) : data ? (
          <ImpactSummary componentName={name} impact={data.impact} />
        ) : null}

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <label htmlFor="hops" className="whitespace-nowrap">Max hops</label>
            <input
              id="hops"
              type="range" min={1} max={6} value={maxHops}
              onChange={e => setMaxHops(Number(e.target.value))}
              className="w-24 accent-zinc-900"
            />
            <span className="w-4 text-center font-mono font-semibold">{maxHops}</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input
              type="checkbox" checked={includeSoft}
              onChange={e => setIncludeSoft(e.target.checked)}
              className="accent-zinc-900"
            />
            Include soft dependencies
          </label>
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-zinc-200">
          <nav className="-mb-px flex gap-6">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-3 text-sm font-medium transition-colors focus-visible:outline-none
                  ${tab === t.key
                    ? 'border-b-2 border-zinc-900 text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {loading ? (
            <SkeletonTable rows={6} />
          ) : error ? null : !data ? null : (
            <>
              {tab === 'impact' && (
                data.affected.length === 0 ? (
                  <EmptyState
                    title="No affected components found"
                    description="Nothing depends on this component at the current depth and criticality settings. Try increasing max hops or enabling soft dependencies."
                  />
                ) : (
                  <ChainList nodes={data.affected} />
                )
              )}

              {tab === 'graph' && (
                data.affected.length === 0 ? (
                  <EmptyState
                    title="Nothing to visualise"
                    description="No affected components to show in the graph."
                  />
                ) : (
                  <GraphView targetId={id} targetName={name} nodes={data.affected} />
                )
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
