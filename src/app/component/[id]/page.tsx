'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ImpactSummary } from '@/components/ImpactSummary';
import { ChainList } from '@/components/ChainList';
import { GraphView } from '@/components/GraphView';
import { DbStatusBanner } from '@/components/DbStatusBanner';
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
  const name = id.replace(/^(svc-|db-|cred-|vendor-|cluster-)/, '').replace(/-/g, '-');

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
    const p = new URLSearchParams({ id, maxHops: String(maxHops) });
    criticality.forEach(c => p.append('criticality', c));

    fetch(`/api/blast-radius?${p}`)
      .then(r => r.json())
      .then(json => {
        if (json.ok) setData(json.data);
        else setError(json.error?.message ?? 'Query failed. Try again.');
      })
      .catch(() => setError('Could not reach the server. Check your connection.'))
      .finally(() => setLoading(false));
  }, [id, maxHops, includeSoft]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'impact', label: 'Affected components' },
    { key: 'graph', label: 'Graph' },
  ];

  return (
    <>
      <DbStatusBanner />
      <main className="mx-auto w-full max-w-4xl px-4 py-10">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-400" aria-label="breadcrumb">
          <Link href="/" className="hover:text-zinc-700 transition-colors">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="font-mono text-zinc-900 font-medium">{name}</span>
        </nav>

        {/* Impact summary — the first thing the manager reads */}
        <div className="fade-in">
          {loading ? (
            <SkeletonCard />
          ) : error ? (
            <ErrorState message={error} />
          ) : data ? (
            <ImpactSummary componentName={name} impact={data.impact} />
          ) : null}
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-6 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-zinc-700">
            <label htmlFor="hops" className="whitespace-nowrap font-medium">Max hops</label>
            <input
              id="hops"
              type="range" min={1} max={6} value={maxHops}
              onChange={e => setMaxHops(Number(e.target.value))}
              className="w-28 accent-amber-500"
              aria-valuenow={maxHops} aria-valuemin={1} aria-valuemax={6}
            />
            <span className="w-4 text-center font-mono font-bold text-zinc-900">{maxHops}</span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 font-medium">
            <input
              type="checkbox" checked={includeSoft}
              onChange={e => setIncludeSoft(e.target.checked)}
              className="accent-amber-500 h-4 w-4"
            />
            Include soft dependencies
          </label>
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-zinc-200" role="tablist">
          <nav className="-mb-px flex gap-1">
            {tabs.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 pb-3 pt-1 text-sm font-medium rounded-t-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                  ${tab === t.key
                    ? 'border-b-2 border-amber-500 text-zinc-900'
                    : 'text-zinc-400 hover:text-zinc-700'}`}
              >
                {t.label}
                {t.key === 'impact' && data && !loading && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-200 px-1.5 text-xs font-semibold text-zinc-600">
                    {data.affected.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="mt-6 fade-in" role="tabpanel">
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
                    description="No affected components to show. Adjust the controls above."
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
