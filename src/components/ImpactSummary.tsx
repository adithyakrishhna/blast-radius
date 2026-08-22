import type { BusinessImpact } from '@/lib/types';

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export function ImpactSummary({
  componentName,
  impact,
}: {
  componentName: string;
  impact: BusinessImpact;
}) {
  const { customersAffected, contractValueAtRisk, brokenFeatures } = impact;

  if (customersAffected === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Blast radius</p>
        <p className="text-lg font-semibold text-zinc-900">
          <span className="font-mono text-zinc-700">{componentName}</span> has no direct customer-facing impact at this depth.
        </p>
        <p className="mt-1 text-sm text-zinc-500">Try increasing max hops or enabling soft dependencies.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-3">Blast radius</p>

      {/* The big numbers — what a manager reads first */}
      <div className="flex flex-wrap gap-8 mb-4">
        <div>
          <p className="text-4xl font-bold tabular-nums text-red-600 leading-none">
            {formatMoney(contractValueAtRisk)}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-600">contracts at risk</p>
        </div>
        <div>
          <p className="text-4xl font-bold tabular-nums text-zinc-900 leading-none">
            {customersAffected.toLocaleString()}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-600">customers affected</p>
        </div>
      </div>

      {/* The plain-English sentence */}
      <p className="text-sm text-zinc-700 leading-relaxed">
        If <span className="font-mono font-semibold text-zinc-900">{componentName}</span> goes down,{' '}
        <strong>{customersAffected.toLocaleString()} customers</strong> lose access to{' '}
        {brokenFeatures.length > 0
          ? brokenFeatures.slice(0, 3).join(', ') + (brokenFeatures.length > 3 ? `, and ${brokenFeatures.length - 3} more features` : '')
          : 'downstream features'}.
      </p>
    </div>
  );
}
