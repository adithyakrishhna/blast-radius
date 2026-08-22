'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DbStatusBanner } from '@/components/DbStatusBanner';
import { ImpactSummary } from '@/components/ImpactSummary';
import { ChainList } from '@/components/ChainList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AffectedNode, BusinessImpact, SearchResult } from '@/lib/types';

interface WhatIfData {
  affected: AffectedNode[];
  impact: BusinessImpact;
}

const PRESET_COMPONENTS: SearchResult[] = [
  { id: 'svc-payment', name: 'payment-service', type: 'Service', extra: 'critical' },
  { id: 'db-sessions', name: 'redis-sessions', type: 'Database', extra: 'redis' },
  { id: 'svc-auth', name: 'auth-service', type: 'Service', extra: 'critical' },
  { id: 'cred-auth0-cert', name: 'auth0-signing-cert', type: 'Credential', extra: 'expires soon' },
  { id: 'svc-inventory', name: 'inventory-service', type: 'Service', extra: 'critical' },
  { id: 'db-payments', name: 'postgres-payments', type: 'Database', extra: 'postgres' },
];

export default function PlanPage() {
  const [targetId, setTargetId] = useState('db-sessions');
  const [downIds, setDownIds] = useState<string[]>([]);
  const [data, setData] = useState<WhatIfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDown(id: string) {
    setDownIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ id: targetId, maxHops: '4' });
    downIds.forEach(d => params.append('down', d));

    fetch(`/api/what-if?${params}`)
      .then(r => r.json())
      .then(json => {
        if (json.ok) setData(json.data);
        else setError(json.error?.message ?? 'Query failed');
      })
      .catch(() => setError('Could not reach the server.'))
      .finally(() => setLoading(false));
  }, [targetId, downIds]);

  const targetComp = PRESET_COMPONENTS.find(c => c.id === targetId);

  return (
    <>
      <DbStatusBanner />
      <main className="mx-auto w-full max-w-4xl px-4 py-10">

        <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-900">Home</Link>
          <span>/</span>
          <span className="text-zinc-900">Simulate failure</span>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-zinc-900">Simulate failure</h1>
        <p className="mb-8 text-sm text-zinc-500">
          Mark components as down or deprecated. See the projected blast radius without touching the database.
        </p>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">

          {/* Controls */}
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Target component</p>
              <div className="space-y-1">
                {PRESET_COMPONENTS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setTargetId(c.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors
                      ${targetId === c.id
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-700 hover:bg-zinc-100'}`}
                  >
                    <Badge variant={c.type as never}>{c.type}</Badge>
                    <span className="font-mono">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Also simulate as down</p>
              <div className="space-y-1">
                {PRESET_COMPONENTS.filter(c => c.id !== targetId).map(c => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={downIds.includes(c.id)}
                      onChange={() => toggleDown(c.id)}
                      className="accent-zinc-900"
                    />
                    <span className="font-mono">{c.name}</span>
                  </label>
                ))}
              </div>

              {downIds.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setDownIds([])}>
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Results */}
          <div>
            {loading ? (
              <div className="space-y-4">
                <SkeletonCard />
                <SkeletonTable rows={5} />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : data ? (
              <div className="space-y-6">
                <ImpactSummary
                  componentName={targetComp?.name ?? targetId}
                  impact={data.impact}
                />
                {data.affected.length === 0 ? (
                  <EmptyState
                    title="No affected components"
                    description="With the current simulation, nothing reaches this component within 4 hops."
                  />
                ) : (
                  <ChainList nodes={data.affected} />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
