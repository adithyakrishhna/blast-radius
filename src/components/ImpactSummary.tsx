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
      <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-6 py-5">
        <p className="text-lg font-semibold text-zinc-900">
          If <span className="font-mono text-zinc-700">{componentName}</span> goes down:
          no customer-facing features are directly affected.
        </p>
        <p className="mt-1 text-sm text-zinc-500">This component has no downstream customer impact at the current traversal depth.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900 text-white px-6 py-5">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2">Blast radius</p>
      <p className="text-xl font-semibold leading-snug">
        If <span className="font-mono text-amber-400">{componentName}</span> goes down:&nbsp;
        <span className="text-red-400">{customersAffected.toLocaleString()} customers</span> affected,&nbsp;
        <span className="text-red-400">{formatMoney(contractValueAtRisk)}</span> of contracts at risk.
      </p>
      {brokenFeatures.length > 0 && (
        <p className="mt-3 text-sm text-zinc-400">
          Broken features: {brokenFeatures.join(', ')}.
        </p>
      )}
    </div>
  );
}
