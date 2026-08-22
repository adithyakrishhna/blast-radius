import { type ReactNode } from 'react';

const variants = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  standard: 'bg-amber-100 text-amber-700 border-amber-200',
  batch: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  enterprise: 'bg-violet-100 text-violet-700 border-violet-200',
  business: 'bg-blue-100 text-blue-700 border-blue-200',
  starter: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
  soft: 'bg-amber-100 text-amber-700 border-amber-200',
  Service: 'bg-blue-100 text-blue-700 border-blue-200',
  Database: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Credential: 'bg-amber-100 text-amber-700 border-amber-200',
  Vendor: 'bg-violet-100 text-violet-700 border-violet-200',
  Cluster: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Host: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  Region: 'bg-teal-100 text-teal-700 border-teal-200',
  Feature: 'bg-pink-100 text-pink-700 border-pink-200',
  Customer: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Contract: 'bg-orange-100 text-orange-700 border-orange-200',
  Team: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  default: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

type Variant = keyof typeof variants;

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: Variant }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border ${variants[variant] ?? variants.default}`}>
      {children}
    </span>
  );
}
