'use client';

import { useEffect, useState } from 'react';

type Status = 'checking' | 'ok' | 'error';

export function DbStatusBanner() {
  const [status, setStatus] = useState<Status>('checking');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch('/api/health');
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setStatus('ok');
          setLatency(data.latencyMs ?? null);
        } else {
          setStatus('error');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    check();
    const id = setInterval(check, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (status === 'ok') return null;

  if (status === 'checking') {
    return (
      <div className="w-full bg-zinc-100 px-4 py-2 text-center text-xs text-zinc-500">
        Connecting to database…
      </div>
    );
  }

  return (
    <div className="w-full bg-red-600 px-4 py-2 text-center text-xs font-medium text-white">
      Database unreachable — data may not load. Check your connection and try refreshing.
    </div>
  );
}
