'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ImpactSummary } from '@/components/ImpactSummary';
import { ChainList } from '@/components/ChainList';
import { GraphView } from '@/components/GraphView';
import { DbStatusBanner } from '@/components/DbStatusBanner';
import { SkeletonCard } from '@/components/ui/Skeleton';
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

  const [data, setData]           = useState<BlastData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tab, setTab]             = useState<Tab>('impact');
  const [maxHops, setMaxHops]     = useState(4);
  const [includeSoft, setIncludeSoft] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    const criticality = includeSoft ? ['hard', 'soft'] : ['hard'];
    const p = new URLSearchParams({ id, maxHops: String(maxHops) });
    criticality.forEach(c => p.append('criticality', c));

    fetch(`/api/blast-radius?${p}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(json => {
        if (json.ok) setData(json.data);
        else setError(json.error?.message ?? 'Query failed. Try again.');
      })
      .catch(err => { if (err.name !== 'AbortError') setError('Could not reach the server.'); })
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

        <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-400" aria-label="breadcrumb">
          <Link href="/" className="hover:text-zinc-700 transition-colors">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="font-mono text-zinc-900 font-medium">{name}</span>
        </nav>

        {/* Impact summary — always visible; fades while updating */}
        <div className="fade-in relative">
          {loading && !data ? (
            <SkeletonCard />
          ) : error ? (
            <ErrorState message={error} />
          ) : data ? (
            <ImpactSummary componentName={name} impact={data.impact} />
          ) : null}

          {/* Small spinner while updating (after first load) */}
          {loading && data && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-white border border-zinc-200 px-3 py-1 text-xs text-zinc-500 shadow-sm">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-amber-500" />
              Updating…
            </div>
          )}
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
                className={`px-4 pb-3 pt-1 text-sm font-medium rounded-t-md transition-all duration-150
                  active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
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

        {/* Tab content — keep old content visible while loading new */}
        <div className="mt-6 fade-in" role="tabpanel">
          {loading && !data ? (
            /* First-load skeleton */
            <div className="space-y-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-11 rounded-lg bg-zinc-100 animate-pulse" />
              ))}
            </div>
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
