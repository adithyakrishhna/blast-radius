'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DbStatusBanner } from '@/components/DbStatusBanner';
import { ImpactSummary } from '@/components/ImpactSummary';
import { ChainList } from '@/components/ChainList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AffectedNode, BusinessImpact, SearchResult } from '@/lib/types';

interface WhatIfData {
  affected: AffectedNode[];
  impact: BusinessImpact;
}

const PRESET_COMPONENTS: SearchResult[] = [
  { id: 'svc-payment',    name: 'payment-service',    type: 'Service',    extra: 'critical' },
  { id: 'db-sessions',    name: 'redis-sessions',     type: 'Database',   extra: 'redis' },
  { id: 'svc-auth',       name: 'auth-service',       type: 'Service',    extra: 'critical' },
  { id: 'cred-auth0-cert',name: 'auth0-signing-cert', type: 'Credential', extra: 'expires soon' },
  { id: 'svc-inventory',  name: 'inventory-service',  type: 'Service',    extra: 'critical' },
  { id: 'db-payments',    name: 'postgres-payments',  type: 'Database',   extra: 'postgres' },
];

export default function PlanPage() {
  const [targetId, setTargetId]   = useState('db-sessions');
  const [downIds, setDownIds]     = useState<string[]>([]);
  const [data, setData]           = useState<WhatIfData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    const p = new URLSearchParams({ id: targetId, maxHops: '4' });
    downIds.forEach(d => p.append('down', d));

    fetch(`/api/what-if?${p}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(json => {
        if (json.ok) setData(json.data);
        else setError(json.error?.message ?? 'Query failed.');
      })
      .catch(err => { if (err.name !== 'AbortError') setError('Could not reach the server.'); })
      .finally(() => setLoading(false));
  }, [targetId, downIds]);

  function toggleDown(id: string) {
    setDownIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const targetComp = PRESET_COMPONENTS.find(c => c.id === targetId);

  return (
    <>
      <DbStatusBanner />
      <main className="mx-auto w-full max-w-4xl px-4 py-10">

        <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/" className="hover:text-zinc-700 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium">Simulate failure</span>
        </nav>

        <h1 className="mb-1 text-2xl font-bold text-zinc-900">Simulate failure</h1>
        <p className="mb-8 text-sm text-zinc-500">
          Mark components as down. See the projected blast radius without touching the database.
        </p>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">

          {/* ── Left panel: controls ── */}
          <div className="space-y-6">

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">Target component</p>
              <div className="space-y-1 rounded-xl border border-zinc-200 bg-white p-1">
                {PRESET_COMPONENTS.map(c => {
                  const isSelected = targetId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setTargetId(c.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm
                        transition-all duration-150 active:scale-[0.98]
                        ${isSelected
                          ? 'bg-amber-50 border border-amber-300 text-zinc-900 shadow-sm'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent'}`}
                    >
                      <Badge variant={c.type as never}>{c.type}</Badge>
                      <span className="font-mono font-medium truncate">{c.name}</span>
                      {isSelected && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">Also mark as down</p>
              <div className="space-y-1 rounded-xl border border-zinc-200 bg-white p-1">
                {PRESET_COMPONENTS.filter(c => c.id !== targetId).map(c => {
                  const isDown = downIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm
                        transition-all duration-150 active:scale-[0.98]
                        ${isDown
                          ? 'bg-red-50 border border-red-200 text-zinc-900'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isDown}
                        onChange={() => toggleDown(c.id)}
                        className="accent-red-500 h-4 w-4 flex-shrink-0"
                      />
                      <span className="font-mono font-medium truncate">{c.name}</span>
                    </label>
                  );
                })}
              </div>
              {downIds.length > 0 && (
                <button
                  onClick={() => setDownIds([])}
                  className="mt-2 w-full rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  Clear all ({downIds.length})
                </button>
              )}
            </div>
          </div>

          {/* ── Right panel: results ── */}
          {/* Key UX fix: never clear content while loading — fade + spinner instead */}
          <div className="relative">

            {/* Small spinner — absolutely positioned so it never shifts layout */}
            {loading && data && (
              <div className="absolute top-0 right-0 z-10 pointer-events-none">
                <div className="flex items-center gap-1.5 rounded-full bg-white border border-zinc-200 px-3 py-1 text-xs text-zinc-500 shadow-sm">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-amber-500" />
                  Updating…
                </div>
              </div>
            )}

            {/* No opacity change — content stays fully visible while loading */}
            <div className="space-y-6">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                  <p className="text-sm font-medium text-red-800">Something went wrong</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              ) : data ? (
                <>
                  <ImpactSummary componentName={targetComp?.name ?? targetId} impact={data.impact} />
                  {data.affected.length === 0 ? (
                    <EmptyState
                      title="No affected components"
                      description="Nothing depends on this component within 4 hops with the current simulation."
                    />
                  ) : (
                    <ChainList nodes={data.affected} />
                  )}
                </>
              ) : (
                /* Initial skeleton — only shown before first load */
                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 h-36 animate-pulse" />
                  <div className="space-y-2">
                    {[1,2,3,4].map(i => <div key={i} className="h-11 rounded-lg bg-zinc-100 animate-pulse" />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
